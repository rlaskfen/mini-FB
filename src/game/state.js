// 게임 상태와 행동(고용/영입/판매/이적시장 마감/시즌 진행). 모두 순수 함수: 상태를 받아 새 상태를 돌려준다.
//
// 진행 단계(phase):
//   'hire'     감독 → 스카우터 고용 (새 게임에서 한 번)
//   'transfer' 이적시장: 영입·판매          → closeWindow
//   'review'   이적시장 평가 + 언론·팬 반응  → playSeason
//   'result'   시즌 결과                     → nextSeason → 'transfer'
import {
  LINEUP, MANAGERS, MAX_SQUAD, POSITIONS, SCOUTS, SELL_RATE, START_BUDGET, START_SQUAD, WAGE_CAP,
  WINDOW_GRADES, WINDOW_SPEND_WEIGHT, WINDOW_STRENGTH_WEIGHT, WINDOW_YOUTH_BONUS,
} from './config.js'
import { shuffle } from './random.js'
import { lineupShortage, pickLineup } from './team.js'
import { createLeague, developPlayer, simulateSeason } from './season.js'
import { makeReactions } from './reactions.js'
import { formatMoney } from '../lib/value.js'

export const STATE_VERSION = 2
const EOK = 10000 // 점수: 1억 = 1점

export function newGame(basePlayers) {
  const players = basePlayers.map((p) => ({ ...p }))
  const squad = POSITIONS.flatMap((pos) =>
    shuffle(players.filter((p) => p.position === pos))
      .slice(0, START_SQUAD[pos])
      .map((p) => p.id),
  )
  const state = {
    version: STATE_VERSION,
    season: 1,
    phase: 'hire',
    budget: START_BUDGET,
    players,
    squad,
    manager: null,
    scout: null,
    league: createLeague(),
    seasonStart: null,
    window: null, // 이적시장 시작 시점 기록 (평가용)
    review: null, // 이적시장 평가 결과
    result: null,
    history: [],
  }
  // 스태프 계약금도 1시즌 재정 점수에 반영되도록 고용 전에 기준점을 잡는다
  return { ...state, seasonStart: snapshot(state) }
}

export function isValidState(state, basePlayers) {
  return (
    state?.version === STATE_VERSION &&
    Array.isArray(state.players) &&
    state.players.length === basePlayers.length
  )
}

// 시즌 점수 계산 기준점: 시즌 시작 시점의 예산과 스쿼드 가치
function snapshot(state) {
  return { budget: state.budget, squadValue: squadValue(state) }
}

// 이적시장 평가 기준점
function windowSnapshot(state) {
  return { budget: state.budget, squad: [...state.squad], strength: pickLineup(getSquad(state)).strength }
}

export const getSquad = (state) => state.players.filter((p) => state.squad.includes(p.id))
export const squadValue = (state) => getSquad(state).reduce((s, p) => s + p.value, 0)
export const wageTotal = (state) => getSquad(state).reduce((s, p) => s + p.wage, 0)
export const sellPrice = (p) => Math.round((p.value * SELL_RATE) / 100) * 100
export const getManager = (state) => MANAGERS.find((m) => m.id === state.manager) ?? null
export const getScout = (state) => SCOUTS.find((s) => s.id === state.scout) ?? null
export const scoutAccuracy = (state) => getScout(state)?.accuracy ?? 1

// 영입가: 협상가 감독이면 할인
export function buyPrice(state, p) {
  const discount = getManager(state)?.discount ?? 0
  return Math.round((p.value * (1 - discount)) / 100) * 100
}

// ── 스태프 고용 ─────────────────────────────────────
export function hireManager(state, id) {
  const manager = MANAGERS.find((m) => m.id === id)
  if (state.phase !== 'hire' || state.manager || !manager) return state
  return { ...state, manager: id, budget: state.budget - manager.cost }
}

export function hireScout(state, id) {
  const scout = SCOUTS.find((s) => s.id === id)
  if (state.phase !== 'hire' || !state.manager || state.scout || !scout) return state
  const next = { ...state, scout: id, budget: state.budget - scout.cost, phase: 'transfer' }
  return { ...next, window: windowSnapshot(next) }
}

// ── 이적시장 ────────────────────────────────────────
// 영입 불가 사유. 가능하면 null.
export function buyBlockReason(state, player) {
  if (state.phase !== 'transfer') return '이적 기간이 아닙니다'
  if (state.squad.includes(player.id)) return '이미 보유한 선수입니다'
  if (state.squad.length >= MAX_SQUAD) return `스쿼드가 가득 찼습니다 (최대 ${MAX_SQUAD}명)`
  const price = buyPrice(state, player)
  if (price > state.budget) return `예산 부족 (${formatMoney(price - state.budget)} 모자람)`
  const wages = wageTotal(state) + player.wage
  if (wages > WAGE_CAP) {
    return `주급 상한 초과 (${wages.toLocaleString('ko-KR')} / ${WAGE_CAP.toLocaleString('ko-KR')}만)`
  }
  return null
}

export function buy(state, id) {
  const player = state.players.find((p) => p.id === id)
  if (!player || buyBlockReason(state, player)) return state
  return { ...state, budget: state.budget - buyPrice(state, player), squad: [...state.squad, id] }
}

export function sell(state, id) {
  const player = state.players.find((p) => p.id === id)
  if (!player || state.phase !== 'transfer' || !state.squad.includes(id)) return state
  return { ...state, budget: state.budget + sellPrice(player), squad: state.squad.filter((s) => s !== id) }
}

// 이적시장 마감 불가 사유. 가능하면 null. (마감 후 바로 시즌이라 선발 인원이 있어야 한다)
export function closeBlockReason(state) {
  if (state.phase !== 'transfer') return '이적 기간이 아닙니다'
  const short = lineupShortage(getSquad(state))
  if (short.length) return `선발 인원 부족: ${short.map((pos) => `${pos} ${LINEUP[pos]}명`).join(', ')} 필요`
  return null
}

// 이적시장 마감 → 평가 등급 + 언론·팬 반응
export function closeWindow(state) {
  if (closeBlockReason(state)) return state
  const byId = Object.fromEntries(state.players.map((p) => [p.id, p]))
  const before = state.window
  const incoming = state.squad
    .filter((id) => !before.squad.includes(id))
    .map((id) => ({ id, fee: buyPrice(state, byId[id]), age: byId[id].age }))
    .sort((a, b) => b.fee - a.fee)
  const outgoing = before.squad
    .filter((id) => !state.squad.includes(id))
    .map((id) => ({ id, fee: sellPrice(byId[id]) }))
    .sort((a, b) => b.fee - a.fee)

  const strengthAfter = pickLineup(getSquad(state)).strength
  const strengthDelta = strengthAfter - before.strength
  const netSpend = (before.budget - state.budget) / EOK // 억, 판매가 더 많으면 음수
  const youth = incoming.filter((p) => p.age <= 21).length
  const points = Math.round(
    50 +
      strengthDelta * WINDOW_STRENGTH_WEIGHT -
      netSpend * WINDOW_SPEND_WEIGHT +
      Math.min(youth, 3) * WINDOW_YOUTH_BONUS,
  )
  const grade = WINDOW_GRADES.find((g) => points >= g.min).grade

  const review = {
    season: state.season,
    grade,
    points,
    strength: [before.strength, strengthAfter],
    netSpend,
    youth,
    incoming,
    outgoing,
    reactions: makeReactions({ grade, manager: getManager(state).name, incoming, outgoing, youth }),
  }
  return { ...state, phase: 'review', review }
}

// ── 시즌 ────────────────────────────────────────────
// 시즌 시작 불가 사유. 가능하면 null.
export function startBlockReason(state) {
  if (state.phase !== 'review') return '이적시장을 먼저 마감하세요'
  return null
}

// 시뮬레이션 → 선수 변동(전체 선수) → 점수 계산
export function playSeason(state) {
  if (startBlockReason(state)) return state
  const manager = getManager(state)
  const squad = getSquad(state)
  const { table, myMatches, injuries } = simulateSeason(squad, state.league, manager?.strengthBonus ?? 0)
  const players = state.players.map((p) => developPlayer(p, state.squad.includes(p.id) ? manager?.growth ?? 1 : 1))
  const after = { ...state, players }

  const myRow = table.find((row) => row.mine)
  const teams = table.length
  const score = {
    rank: Math.round(((teams - myRow.rank) / (teams - 1)) * 100),
    finance: Math.round((state.budget - state.seasonStart.budget) / EOK),
    value: Math.round((squadValue(after) - state.seasonStart.squadValue) / EOK),
  }
  score.total = score.rank + score.finance + score.value

  const byId = Object.fromEntries(players.map((p) => [p.id, p]))
  const changes = squad.map((p) => ({
    id: p.id,
    ability: [p.ability, byId[p.id].ability],
    value: [p.value, byId[p.id].value],
  }))

  return {
    ...after,
    phase: 'result',
    result: { season: state.season, table, myRow, myMatches, injuries, changes, score },
    history: [...state.history, { season: state.season, rank: myRow.rank, score: score.total, window: state.review.grade }],
  }
}

export function nextSeason(state) {
  if (state.phase !== 'result') return state
  const next = {
    ...state,
    season: state.season + 1,
    phase: 'transfer',
    league: createLeague(),
    review: null,
    result: null,
  }
  return { ...next, seasonStart: snapshot(next), window: windowSnapshot(next) }
}
