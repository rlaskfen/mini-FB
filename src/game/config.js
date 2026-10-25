// 게임 규칙 상수. 밸런스 조정은 이 파일에서 한다. 금액 단위는 '만' (10000 = 1억).

export const POSITIONS = ['GK', 'DF', 'MF', 'FW']

export const START_BUDGET = 1000000 // 100억
export const START_SQUAD = { GK: 2, DF: 6, MF: 5, FW: 5 } // 18명, 포지션별 무작위
export const MAX_SQUAD = 25
export const WAGE_CAP = 5000 // 스쿼드 주급 합계 상한
export const SELL_RATE = 0.9

// 팀 전력 계산에 쓰는 포지션별 선발 인원 (GK1, DF4, MF3, FW3)
export const LINEUP = { GK: 1, DF: 4, MF: 3, FW: 3 }
// 부상 등으로 선발 자리가 비면 이 능력치로 계산
export const EMPTY_SLOT_RATING = 30

export const MY_TEAM = '내 팀'
export const AI_TEAMS = [
  '청솔 FC', '바람골 시티', '해오름 유나이티드', '산마루 로버스', '별빛 애슬레틱',
  '푸른강 FC', '노을 원더러스', '돌담 SC', '은빛만 FC',
]
export const AI_STRENGTH = [58, 76] // 가상 팀 전력 범위 (시즌마다 새로 뽑음)

// 경기: 기대 득점 = MATCH_BASE_GOALS × e^((내 전력 − 상대 전력 ± 홈 이점) / MATCH_SCALE)
// MATCH_SCALE이 클수록 이변이 잦다.
export const MATCH_BASE_GOALS = 1.3
export const MATCH_SCALE = 16
export const HOME_ADVANTAGE = 2

// ── 스태프 (새 게임 시작 시 한 번 고용, 계약금은 예산에서 차감) ──
// strengthBonus: 경기 때 내 팀 전력에 더함 / growth: 23세 이하 내 선수 성장 배수 / discount: 영입가 할인율
export const MANAGERS = [
  { id: 'tactician', name: '강태호', style: '전술가', effect: '경기 때 팀 전력 +2', cost: 150000, strengthBonus: 2 },
  { id: 'developer', name: '윤석진', style: '육성가', effect: '23세 이하 선수 성장 1.5배', cost: 100000, growth: 1.5 },
  { id: 'negotiator', name: '오민규', style: '협상가', effect: '영입가 10% 할인', cost: 100000, discount: 0.1 },
  { id: 'steady', name: '박선재', style: '무난한 감독', effect: '특별한 효과 없음', cost: 20000 },
]

// accuracy: 잠재력 추정 범위 폭 배수 (작을수록 정확)
export const SCOUTS = [
  { id: 'rookie', name: '이준호', level: '신입', effect: '잠재력 추정 오차 큼', cost: 10000, accuracy: 1.6 },
  { id: 'veteran', name: '최영길', level: '베테랑', effect: '잠재력 추정 오차 보통', cost: 40000, accuracy: 1 },
  { id: 'elite', name: '서하람', level: '정예', effect: '잠재력 추정 오차 작음', cost: 90000, accuracy: 0.4 },
]

// ── 이적시장 평가 ──
// 점수 = 50 + 전력 변화 × WINDOW_STRENGTH_WEIGHT − 순지출(억) × WINDOW_SPEND_WEIGHT + 21세 이하 영입 1명당 WINDOW_YOUTH_BONUS(최대 3명)
export const WINDOW_STRENGTH_WEIGHT = 12
export const WINDOW_SPEND_WEIGHT = 0.35
export const WINDOW_YOUTH_BONUS = 5
export const WINDOW_GRADES = [
  { grade: 'S', min: 90 },
  { grade: 'A', min: 75 },
  { grade: 'B', min: 60 },
  { grade: 'C', min: 45 },
  { grade: 'D', min: 30 },
  { grade: 'F', min: -Infinity },
]

export const INJURY_CHANCE = 0.01 // 선수·경기당
export const INJURY_ROUNDS = [1, 4] // 결장 경기 수
