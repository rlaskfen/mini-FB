// 잠재력(potential)은 화면에 정확한 값으로 보여주지 않는다. 등급 또는 범위로만 노출.

export function potentialGrade(potential) {
  if (potential >= 85) return 'S'
  if (potential >= 75) return 'A'
  if (potential >= 65) return 'B'
  return 'C'
}

// 선수 id로 만든 고정 해시. 같은 선수는 렌더링마다 같은 범위가 나와야 한다.
function hashId(id) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// 실제 potential을 포함하는 범위. 어릴수록 범위가 넓다 (스카우트 불확실성).
// accuracy: 스카우터 정확도 배수 (1.6이면 범위가 1.6배 넓음, 0.4면 좁음)
export function potentialRange({ id, age, ability, potential }, accuracy = 1) {
  const width = Math.max(2, Math.round((age <= 21 ? 15 : age <= 27 ? 10 : 5) * accuracy))
  const offset = hashId(id) % (width + 1)
  let low = potential - offset
  let high = low + width
  // 경계에 걸리면 자르지 않고 밀어서 폭을 유지한다 (좁은 범위는 실제 값을 드러냄)
  if (low < ability) {
    high += ability - low
    low = ability
  }
  if (high > 99) {
    low = Math.max(ability, low - (high - 99))
    high = 99
  }
  return { low, high }
}

// 스카우트 보고서: 추정 범위 + 범위 중간값으로 매긴 등급.
// 등급도 추정치 기준이라 스카우터가 부정확하면 등급이 틀릴 수 있다.
export function scoutReport(player, accuracy = 1) {
  const { low, high } = potentialRange(player, accuracy)
  return { low, high, grade: potentialGrade(Math.round((low + high) / 2)) }
}
