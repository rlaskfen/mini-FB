// 몸값·주급 계산. 생성 스크립트(scripts/generate-players.mjs)와 앱이 함께 쓴다.
// 금액 단위는 모두 '만' (value 10000 = 1억).

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

// ability가 높을수록 지수적으로 증가. 어린 선수는 잠재력 일부를 몸값에 반영하고,
// 28세 이후로는 1년마다 15%씩 감가한다.
export function calcValue({ ability, potential, age }) {
  const youth = clamp((28 - age) / 11, 0, 1) // 17세 1.0 → 28세 0
  const effective = ability + (potential - ability) * 0.5 * youth
  const ageFactor = age > 28 ? 0.85 ** (age - 28) : 1
  const value = 10000 * Math.exp(0.1 * (effective - 40)) * ageFactor
  return Math.max(100, Math.round(value / 100) * 100)
}

// 주급(만). 나이와 무관하게 현재 능력치 기준.
export function calcWage({ ability }) {
  const wage = 30 * Math.exp(0.07 * (ability - 40))
  return Math.max(10, Math.round(wage / 10) * 10)
}

// 1234500 → "123.5억", 9000 → "9000만"
export function formatMoney(man) {
  if (man >= 10000) return `${(man / 10000).toFixed(1)}억`
  return `${man.toLocaleString('ko-KR')}만`
}
