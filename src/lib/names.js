// 이름 패치 파일 처리. 형식: [{ "id": "p001", "name": "이름" }]
// id와 name만 쓰며, 업로드된 파일은 선수 이름만 덮어쓴다.

const MAX_NAME_LENGTH = 30

// 업로드된 JSON을 검증해 { id: name } 맵으로 바꾼다.
// 존재하지 않는 id나 잘못된 항목은 건너뛰고 errors에 사유를 남긴다.
export function parseNamePatch(data, validIds) {
  const names = {}
  const errors = []
  if (!Array.isArray(data)) {
    return { names, errors: ['최상위가 배열([...])이 아닙니다.'] }
  }
  data.forEach((item, i) => {
    const where = `${i + 1}번째 항목`
    if (!item || typeof item !== 'object') return errors.push(`${where}: 객체가 아닙니다.`)
    const { id, name } = item
    if (typeof id !== 'string' || !validIds.has(id)) return errors.push(`${where}: 알 수 없는 id "${id}"`)
    if (typeof name !== 'string') return errors.push(`${where}: name은 따옴표로 감싼 글자여야 합니다.`)
    if (!name.trim()) return errors.push(`${where}: name이 비어 있습니다.`)
    if (name.trim().length > MAX_NAME_LENGTH) return errors.push(`${where}: name이 ${MAX_NAME_LENGTH}자를 넘습니다.`)
    names[id] = name.trim()
  })
  return { names, errors }
}

export function applyNamePatch(players, names) {
  if (!names) return players
  return players.map((p) => (names[p.id] ? { ...p, name: names[p.id] } : p))
}
