// 가상 선수 100명 생성 → data/players.json, data/names.json
// 실행: npm run gen:players            (결과 일부를 players.json 형식으로 출력)
//       npm run gen:players -- --all   (100명 전부 출력)
// SEED 환경변수로 다른 선수단 생성 가능.
// 이름은 data/names.json에서 읽는다. 파일이 없거나 빠진 id는 무작위로 만들어 채운다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { calcValue, calcWage } from '../src/lib/value.js'

const SEED = Number(process.env.SEED ?? 20261025)
const POSITIONS = { GK: 10, DF: 35, MF: 30, FW: 25 }
const PRINT_ALL = process.argv.includes('--all')
const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const namesPath = join(dataDir, 'names.json')

// names.json → { id: name }. 형식이 틀리면 알려주고 무작위 이름을 쓴다.
function readNamesFile() {
  if (!existsSync(namesPath)) return {}
  try {
    const list = JSON.parse(readFileSync(namesPath, 'utf8'))
    if (!Array.isArray(list)) throw new Error('최상위가 배열이 아님')
    return Object.fromEntries(
      list.filter((x) => typeof x?.id === 'string' && typeof x?.name === 'string' && x.name.trim())
        .map((x) => [x.id, x.name.trim()]),
    )
  } catch (e) {
    console.warn(`names.json을 읽지 못해 무작위 이름을 씁니다 (${e.message})`)
    return {}
  }
}

// ── 난수 ──────────────────────────────────────────────
// 시드 고정 난수(mulberry32): 같은 SEED면 항상 같은 선수단이 나온다.
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(SEED)
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1))
// 이름은 별도 난수열을 쓴다. 차단 목록에 걸려 이름을 다시 뽑아도 능력치는 바뀌지 않게.
const nameRand = mulberry32(SEED ^ 0x5bd1e995)
const pick = (arr) => arr[Math.floor(nameRand() * arr.length)]
const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

// Box-Muller 표준정규분포
function gaussian(mean, sd) {
  const u = 1 - rand()
  const v = rand()
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// ── 이름 ──────────────────────────────────────────────
// 국가별 이름 × 성 목록 조합. format으로 국가별 표기 순서를 정한다.
const COUNTRIES = [
  {
    country: '한국',
    weight: 3,
    first: ['도윤', '서준', '하준', '시우', '지호', '예준', '건우', '현우', '태윤', '윤호', '민혁', '승호', '준서', '은찬', '로운', '선율'],
    last: ['김', '이', '박', '최', '정', '강', '윤', '장', '임', '한', '오', '서', '신', '권'],
    format: (f, l) => `${l}${f}`,
  },
  {
    country: '일본',
    weight: 1,
    first: ['하루토', '소타', '유마', '렌', '미나토', '아오이', '하야토', '리쿠', '카이토', '유키'],
    last: ['사토', '스즈키', '다카하시', '와타나베', '이토', '야마모토', '나카무라', '고바야시', '가토', '요시다'],
    format: (f, l) => `${l} ${f}`,
  },
  {
    country: '잉글랜드',
    weight: 2,
    first: ['올리버', '잭', '해리', '찰리', '조지', '알피', '아치', '토비', '에단', '루이스', '프레디', '시어도어'],
    last: ['스미스', '브룩스', '헤이우드', '펜윅', '애시크로프트', '홀브룩', '프렌티스', '웨이크필드', '케틀웰', '손더스'],
    format: (f, l) => `${f} ${l}`,
  },
  {
    country: '스페인',
    weight: 2,
    first: ['우고', '마테오', '이케르', '아드리안', '마르셀', '오리올', '하비에르', '곤살로', '니콜라스', '엔소'],
    last: ['베가', '파스토르', '이바녜스', '솔레르', '칼보', '모랄레다', '에스크리바', '로블레도', '세고비아', '아란다'],
    format: (f, l) => `${f} ${l}`,
  },
  {
    country: '브라질',
    weight: 2,
    first: ['가브리에우', '루카스', '마테우스', '헤나투', '이고르', '카이우', '다닐루', '페드루', '티아구', '브루누'],
    last: ['파이샹', '세하', '모레이라', '아제베두', '프라두', '하몬', '테이셰이라', '브란당', '카르바류', '노게이라'],
    format: (f, l) => `${f} ${l}`,
  },
  {
    country: '독일',
    weight: 2,
    first: ['요나스', '레온', '핀', '루카', '팀', '닐스', '야니크', '모리츠', '파울', '헨리크'],
    last: ['브링크만', '하르트비히', '자일러', '렌츠', '프롬', '케슬러', '비르트', '슈탈', '호프만', '베르거'],
    format: (f, l) => `${f} ${l}`,
  },
  {
    country: '프랑스',
    weight: 2,
    first: ['아드리앵', '바티스트', '쥘', '테오', '마티스', '라파엘', '에방', '루이', '가스파르', '클레망'],
    last: ['르루아', '부셰', '모랭', '페랭', '쇼뱅', '라콩브', '드니오', '마르샹', '피카르', '르클레르크'],
    format: (f, l) => `${f} ${l}`,
  },
  {
    country: '이탈리아',
    weight: 2,
    first: ['로렌초', '마티아', '토마소', '리카르도', '에도아르도', '자코모', '필리포', '니콜로', '다비데', '피에트로'],
    last: ['로마노', '콘티니', '파렌티', '그레코', '비탈레', '모렐리', '사바티니', '칸텔리', '로톨로', '페라라'],
    format: (f, l) => `${f} ${l}`,
  },
  {
    country: '네덜란드',
    weight: 1,
    first: ['다안', '셈', '루트', '티스', '바우트', '스턴', '예서', '미스', '라르스', '닉'],
    last: ['판데르벌트', '디커르', '스밋', '페르호번', '바커르', '판렌트', '뮬더르', '하베르캄프', '코스터르', '흐로트'],
    format: (f, l) => `${f} ${l}`,
  },
  {
    country: '아르헨티나',
    weight: 2,
    first: ['산티아고', '마르틴', '이그나시오', '토마스', '파쿤도', '호아킨', '발렌틴', '아구스틴', '프랑코', '레안드로'],
    last: ['페랄타', '코리아', '오헤다', '카브랄', '베니테스', '레게라', '팔라시오스', '몬손', '킨테로스', '비야그라'],
    format: (f, l) => `${f} ${l}`,
  },
]

// 실존 유명 선수 차단 목록. 조합 결과가 여기에 걸리면 다시 뽑는다.
const REAL_PLAYERS = new Set([
  '손흥민', '박지성', '김민재', '이강인', '황희찬', '황인범', '조규성', '이재성', '김영권', '기성용',
  '이청용', '구자철', '박주영', '이영표', '홍명보', '정우영', '백승호', '오현규', '이승우', '조현우',
  '김승규', '설영우', '김진수', '김문환', '권창훈', '이동국', '정성룡', '양민혁', '배준호', '안정환',
  '해리 케인', '잭 그릴리시', '해리 매과이어', '찰리 오스틴', '올리버 스킵', '루이스 쿡',
  '루카스 모우라', '루카스 파케타', '헤나투 아우구스투', '브루누 페르난데스', '다닐루 페레이라',
  '레온 고레츠카', '팀 베르너', '요나스 호프만', '루카 모드리치',
  '테오 에르난데스', '쥘 쿤데', '라파엘 바란', '마티스 텔', '아드리앵 라비오',
  '로렌초 인시녜', '니콜로 바렐라', '페데리코 키에사', '다비데 프라테시',
  '산티아고 히메네스', '마르틴 외데고르', '호아킨 코레아', '레안드로 파레데스', '파쿤도 펠리스트리',
  '이케르 카시야스', '우고 로리스', '마테오 코바치치', '하비에르 파스토르',
  '스즈키 유마', '고바야시 유키',
])

function pickCountry() {
  const total = COUNTRIES.reduce((s, c) => s + c.weight, 0)
  let r = nameRand() * total
  for (const c of COUNTRIES) {
    if ((r -= c.weight) < 0) return c
  }
  return COUNTRIES[0]
}

const usedNames = new Set()
function makeName() {
  for (let tries = 0; tries < 1000; tries++) {
    const c = pickCountry()
    const name = c.format(pick(c.first), pick(c.last))
    if (usedNames.has(name) || REAL_PLAYERS.has(name)) continue
    usedNames.add(name)
    return name
  }
  throw new Error('이름 조합이 부족합니다. 이름/성 목록을 늘려주세요.')
}

// ── 능력치 ────────────────────────────────────────────
// 평균 25, 17~38. 범위를 벗어나면 다시 뽑는다 (양 끝에 몰리지 않게).
function makeAge() {
  for (;;) {
    const age = Math.round(gaussian(25, 4.5))
    if (age >= 17 && age <= 38) return age
  }
}

const makeAbility = () => clamp(Math.round(gaussian(62, 9)), 40, 95)

// 17세는 +0~25, 30세 이상은 +0~2. 그 사이는 선형으로 줄어든다.
function makePotential(age, ability) {
  const maxGap = Math.round(25 - ((clamp(age, 17, 30) - 17) / 13) * 23)
  return Math.min(99, ability + randInt(0, maxGap))
}

const makeForm = () => Math.round((0.9 + rand() * 0.2) * 100) / 100

// ── 생성 ──────────────────────────────────────────────
const fileNames = readNamesFile()
const players = []
for (const [position, count] of Object.entries(POSITIONS)) {
  for (let i = 0; i < count; i++) {
    const id = `p${String(players.length + 1).padStart(3, '0')}`
    const age = makeAge()
    const ability = makeAbility()
    const potential = makePotential(age, ability)
    // 무작위 이름은 항상 뽑아 둔다. 그래야 names.json 유무와 상관없이 같은 SEED면 능력치가 같다.
    const randomName = makeName()
    players.push({
      id,
      name: fileNames[id] ?? randomName,
      age,
      position,
      ability,
      potential,
      value: calcValue({ ability, potential, age }),
      wage: calcWage({ ability }),
      form: makeForm(),
      injured: false,
    })
  }
}

mkdirSync(dataDir, { recursive: true })
writeFileSync(join(dataDir, 'players.json'), JSON.stringify(players, null, 2) + '\n')
writeFileSync(namesPath, JSON.stringify(players.map(({ id, name }) => ({ id, name })), null, 2) + '\n')

// ── 출력 ──────────────────────────────────────────────
// players.json 형식 그대로 출력 (기본은 포지션별 1명씩, --all이면 전부)
const shown = PRINT_ALL ? players : Object.keys(POSITIONS).map((pos) => players.find((p) => p.position === pos))
console.log(JSON.stringify(shown, null, 2))
if (!PRINT_ALL) console.log(`... (${players.length}명 중 ${shown.length}명만 표시. 전부 보려면: npm run gen:players -- --all)`)
console.log()

for (const p of players) {
  if (REAL_PLAYERS.has(p.name)) console.warn(`⚠ ${p.id} "${p.name}"은(는) 실존 선수 차단 목록에 있습니다. names.json에서 바꿔주세요.`)
}
const fromFile = players.filter((p) => fileNames[p.id]).length
console.log(`이름: names.json에서 ${fromFile}명, 무작위 생성 ${players.length - fromFile}명`)
const avg = (key) => (players.reduce((s, p) => s + p[key], 0) / players.length).toFixed(1)
const byPos = Object.keys(POSITIONS).map((pos) => `${pos} ${players.filter((p) => p.position === pos).length}`)
const values = players.map((p) => p.value).sort((a, b) => a - b)
console.log(`SEED ${SEED} → ${players.length}명 (${byPos.join(', ')})`)
console.log(`나이 평균 ${avg('age')} (${Math.min(...players.map((p) => p.age))}~${Math.max(...players.map((p) => p.age))})`)
console.log(`능력 평균 ${avg('ability')} (${Math.min(...players.map((p) => p.ability))}~${Math.max(...players.map((p) => p.ability))})`)
console.log(`몸값(만) 최소 ${values[0]} / 중앙 ${values[50]} / 최대 ${values.at(-1)}`)
