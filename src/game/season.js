import {
  AI_STRENGTH, AI_TEAMS, HOME_ADVANTAGE, INJURY_CHANCE, INJURY_ROUNDS,
  MATCH_BASE_GOALS, MATCH_SCALE, MY_TEAM,
} from './config.js'
import { poisson, rand, randInt } from './random.js'
import { pickLineup } from './team.js'
import { calcValue, calcWage } from '../lib/value.js'

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

export function createLeague() {
  const [min, max] = AI_STRENGTH
  return AI_TEAMS.map((name) => ({ name, strength: Math.round((min + rand() * (max - min)) * 10) / 10 }))
}

// 원형 방식 라운드로빈 + 홈/원정을 뒤집은 후반기 → 팀 n개면 2(n−1) 라운드
function doubleRoundRobin(n) {
  const ids = [...Array(n).keys()]
  const firstHalf = []
  for (let r = 0; r < n - 1; r++) {
    const round = []
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i]
      const b = ids[n - 1 - i]
      round.push(r % 2 === 0 ? [a, b] : [b, a])
    }
    firstHalf.push(round)
    ids.splice(1, 0, ids.pop()) // 0번 고정, 나머지 회전
  }
  const secondHalf = firstHalf.map((round) => round.map(([h, a]) => [a, h]))
  return [...firstHalf, ...secondHalf]
}

function playMatch(homeStrength, awayStrength) {
  const diff = homeStrength - awayStrength + HOME_ADVANTAGE
  return [
    poisson(MATCH_BASE_GOALS * Math.exp(diff / MATCH_SCALE)),
    poisson(MATCH_BASE_GOALS * Math.exp(-diff / MATCH_SCALE)),
  ]
}

function record(row, gf, ga) {
  row.played++
  row.gf += gf
  row.ga += ga
  if (gf > ga) {
    row.won++
    row.points += 3
  } else if (gf === ga) {
    row.drawn++
    row.points += 1
  } else {
    row.lost++
  }
}

// 팀 0번이 내 팀. 내 팀 전력은 라운드마다 부상자를 빼고 다시 계산한다.
// strengthBonus: 감독 효과로 내 팀 전력에 더하는 값
export function simulateSeason(squad, league, strengthBonus = 0) {
  const teams = [{ name: MY_TEAM, mine: true }, ...league.map((t) => ({ ...t, mine: false }))]
  const table = teams.map((t) => ({
    name: t.name, mine: t.mine, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0,
  }))
  const injuredUntil = {} // 선수 id → 복귀 라운드 인덱스
  const myMatches = []
  const injuries = []

  doubleRoundRobin(teams.length).forEach((round, r) => {
    const available = squad.filter((p) => !(injuredUntil[p.id] > r))
    const myStrength = pickLineup(available).strength + strengthBonus
    const strengthOf = (i) => (i === 0 ? myStrength : teams[i].strength)

    for (const [h, a] of round) {
      const [hg, ag] = playMatch(strengthOf(h), strengthOf(a))
      record(table[h], hg, ag)
      record(table[a], ag, hg)
      if (h === 0 || a === 0) {
        const home = h === 0
        myMatches.push({
          round: r + 1,
          opponent: teams[home ? a : h].name,
          home,
          gf: home ? hg : ag,
          ga: home ? ag : hg,
          strength: Math.round(myStrength * 10) / 10,
        })
      }
    }

    for (const p of available) {
      if (rand() < INJURY_CHANCE) {
        const rounds = randInt(...INJURY_ROUNDS)
        injuredUntil[p.id] = r + 1 + rounds
        injuries.push({ id: p.id, round: r + 1, rounds })
      }
    }
  })

  table.sort((x, y) => y.points - x.points || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf)
  table.forEach((row, i) => (row.rank = i + 1))
  return { table, myMatches, injuries }
}

// 시즌 종료 시 변동: 23세 이하는 potential 방향으로 성장, 31세 이상은 하락, 그 사이는 ±1.
// 나이 +1, 컨디션 재추첨, 부상 회복, 몸값·주급 재계산.
// growth: 성장 배수 (육성가 감독의 내 선수는 1.5). potential은 넘지 않는다.
export function developPlayer(p, growth = 1) {
  let ability = p.ability
  if (p.age <= 23) ability += Math.round((p.potential - p.ability) * (0.25 + rand() * 0.25) * growth)
  else if (p.age >= 31) ability -= randInt(1, p.age >= 34 ? 5 : 3)
  else ability += randInt(-1, 1)
  ability = clamp(Math.min(ability, p.potential), 40, 99)

  const age = p.age + 1
  let potential = Math.max(p.potential, ability)
  if (age >= 30) potential = Math.min(potential, ability + 2)

  return {
    ...p,
    age,
    ability,
    potential,
    form: Math.round((0.9 + rand() * 0.2) * 100) / 100,
    injured: false,
    value: calcValue({ ability, potential, age }),
    wage: calcWage({ ability }),
  }
}
