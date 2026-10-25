import { EMPTY_SLOT_RATING, LINEUP, POSITIONS } from './config.js'

export const playerRating = (p) => p.ability * p.form

// 포지션별 상위 선수(GK1, DF4, MF3, FW3)로 선발을 짜고 ability × form 평균을 전력으로 쓴다.
// 부상자는 호출하는 쪽에서 빼고 넘긴다. 빈 자리는 EMPTY_SLOT_RATING으로 계산.
export function pickLineup(players) {
  const starters = []
  let total = 0
  let slots = 0
  for (const pos of POSITIONS) {
    const best = players
      .filter((p) => p.position === pos)
      .sort((a, b) => playerRating(b) - playerRating(a))
      .slice(0, LINEUP[pos])
    starters.push(...best)
    total += best.reduce((s, p) => s + playerRating(p), 0)
    total += (LINEUP[pos] - best.length) * EMPTY_SLOT_RATING
    slots += LINEUP[pos]
  }
  return { starters, strength: total / slots }
}

export function positionCounts(players) {
  const counts = Object.fromEntries(POSITIONS.map((pos) => [pos, 0]))
  for (const p of players) counts[p.position]++
  return counts
}

// 선발 인원이 모자란 포지션 목록
export function lineupShortage(players) {
  const counts = positionCounts(players)
  return POSITIONS.filter((pos) => counts[pos] < LINEUP[pos])
}
