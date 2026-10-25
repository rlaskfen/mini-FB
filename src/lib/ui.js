// 능력치 배지 색 구간 (styles.css의 .rating-* 와 짝)
export function abilityTier(ability) {
  if (ability >= 75) return 'top'
  if (ability >= 65) return 'good'
  if (ability >= 55) return 'mid'
  return 'low'
}
