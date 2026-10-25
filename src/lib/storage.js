// localStorage 래퍼. 사생활 보호 모드 등에서 접근이 실패해도 게임은 계속 동작해야 한다.
// 최고 점수와 이름 패치는 게임 진행과 따로 저장해서 '새 게임'을 해도 남는다.
const KEYS = {
  game: 'mini-fm:v1',
  best: 'mini-fm:best',
  names: 'mini-fm:names',
}

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 저장 실패는 무시 (용량 초과, 접근 차단 등)
  }
}

export const loadGame = () => read(KEYS.game)
export const saveGame = (state) => write(KEYS.game, state)

export const loadBest = () => read(KEYS.best)
export const saveBest = (best) => write(KEYS.best, best)

export const loadNames = () => read(KEYS.names)
export const saveNames = (names) => write(KEYS.names, names)
