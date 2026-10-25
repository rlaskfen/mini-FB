export const rand = () => Math.random()
export const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1))

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

// 푸아송 분포 (경기 득점)
export function poisson(lambda) {
  const limit = Math.exp(-lambda)
  let k = 0
  let p = Math.random()
  while (p > limit) {
    k++
    p *= Math.random()
  }
  return k
}
