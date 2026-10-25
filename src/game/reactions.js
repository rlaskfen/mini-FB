// 이적시장 마감 후 언론·팬 반응 생성. 매체·커뮤니티·닉네임은 전부 가상.
// 선수 이름은 {star}(가장 비싼 영입), {sold}(가장 비싸게 판 선수) 자리표시자로 남겨 두고
// 화면에서 이름 패치가 적용된 이름으로 바꾼다 (fillNames).
import { randInt, shuffle } from './random.js'

const OUTLETS = ['킥오프 데일리', '하프타임 리포트', '주간 볼보이', '스포츠 사이드라인']
const SOURCES = ['포털 스포츠 댓글', '축구 커뮤니티 · 팬 게시판', '하프타임 갤러리', '응원 서포터즈 카페']
const NICKNAMES = [
  '방구석감독', '주말축구인', '새벽직관러', '벤치워머', '전술노트', '원정석지킴이',
  '하프라인', '오프사이드', '골망흔들기', '라커룸', '킥오프', '추가시간',
]

// grade → 반응 분위기
const TONE = { S: 'good', A: 'good', B: 'mixed', C: 'mixed', D: 'bad', F: 'bad' }
const TAGS = { good: ['환호', '기대'], mixed: ['글쎄', '무난'], bad: ['아쉬움', '분노'] }

// need: 필요한 자리표시자. 해당 선수가 없으면 그 문구는 후보에서 빠진다.
const TITLES = {
  good: [
    { text: '{manager} 감독의 이적시장, 팬들 "기대 이상"' },
    { text: '{star} 품었다… 이적시장 평가 {grade}', need: 'star' },
    { text: '알찬 보강 마친 {manager}호, 올 시즌 다크호스 급부상' },
  ],
  mixed: [
    { text: '무난했던 이적시장, 남은 건 증명뿐' },
    { text: '{star} 영입했지만… 물음표 남은 이적시장', need: 'star' },
    { text: '{manager} 감독, "결과로 보여드리겠다"' },
  ],
  bad: [
    { text: '{manager} 감독 향한 팬들의 인내심, 한계에 다다랐다' },
    { text: '{sold} 떠나보낸 이적시장… 평가는 {grade}', need: 'sold' },
    { text: '돈은 썼는데 전력은 제자리? 팬들 "이해 불가"' },
  ],
  quiet: [{ text: '움직임 없는 이적시장… 팬들 "이대로 괜찮나"' }],
}

const COMMENTS = {
  good: [
    { text: '{star} 데려온 거 실화냐 ㅋㅋ 이번 시즌 기대된다', need: 'star' },
    { text: '프런트 일 좀 하네' },
    { text: '{manager} 감독 첫 작품 합격' },
    { text: '이 정도면 우승 노려봐도 되는 거 아님?' },
    { text: '유망주까지 챙겼네. 미래가 밝다', need: 'youth' },
    { text: '돈 쓸 데 제대로 썼다' },
  ],
  mixed: [
    { text: '나쁘진 않은데 뭔가 하나 빠진 느낌' },
    { text: '{star} 영입은 좋은데 몸값이 좀...', need: 'star' },
    { text: '일단 시즌 들어가 봐야 알 듯' },
    { text: '{sold} 판 건 좀 아쉽다', need: 'sold' },
    { text: '평가 {grade}면 딱 중간이네' },
  ],
  bad: [
    { text: '돈은 어디다 쓴 거냐' },
    { text: '{sold} 왜 팔았냐 진짜...', need: 'sold' },
    { text: '이적시장 평가 {grade}... 할 말이 없다' },
    { text: '{manager} 감독 벌써 경질 각?' },
    { text: '하... 시즌 시작도 전에 지친다' },
  ],
  quiet: [
    { text: '조용하네... 이게 맞나' },
    { text: '보강 없이 버틸 수 있을까' },
    { text: '돈 아낀 건 좋은데 전력이 그대로잖아' },
  ],
}

const REPLIES = {
  good: ['ㅇㅈ', '인정합니다', '이번엔 다르다'],
  mixed: ['공감', '두고 봐야죠', 'ㄹㅇ'],
  bad: ['공감', 'ㄹㅇ 답답하다', '222'],
  quiet: ['공감', '그러게요'],
}

const pickOne = (arr) => arr[randInt(0, arr.length - 1)]

function maskedId() {
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const head = Array.from({ length: 4 }, () => letters[randInt(0, 25)]).join('')
  return `${head}****`
}

// 76, 1.5천 처럼 표시
export function formatLikes(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}천` : `${n}`
}

export function makeReactions({ grade, manager, incoming, outgoing, youth }) {
  const quiet = incoming.length === 0 && outgoing.length === 0
  const tone = quiet ? 'quiet' : TONE[grade]
  const has = { star: incoming.length > 0, sold: outgoing.length > 0, youth: youth > 0 }
  const fill = (text) => text.replaceAll('{manager}', manager).replaceAll('{grade}', grade)
  const usable = (list) => list.filter((t) => !t.need || has[t.need])

  const comments = shuffle(usable(COMMENTS[tone]))
    .slice(0, 3)
    .map((c, i) => ({
      user: i % 2 === 0 ? maskedId() : pickOne(NICKNAMES),
      tag: pickOne(TAGS[tone === 'quiet' ? 'mixed' : tone]),
      text: fill(c.text),
      source: pickOne(SOURCES),
      minutesAgo: randInt(1, 20) + i * 5,
      likes: randInt(20, 5000),
    }))
  // 두 번째 댓글에 답글 하나
  if (comments[1]) {
    comments[1].reply = {
      user: pickOne(NICKNAMES),
      text: pickOne(REPLIES[tone]),
      minutesAgo: Math.max(1, comments[1].minutesAgo - randInt(1, 4)),
      likes: randInt(10, Math.max(11, Math.floor(comments[1].likes / 2))),
    }
  }

  return {
    article: { outlet: pickOne(OUTLETS), title: fill(pickOne(usable(TITLES[tone])).text) },
    comments,
    refs: { star: incoming[0]?.id ?? null, sold: outgoing[0]?.id ?? null },
  }
}

// {star}, {sold} 자리표시자를 실제 선수 이름으로
export function fillNames(text, refs, nameOf) {
  return text
    .replaceAll('{star}', refs.star ? nameOf[refs.star] : '')
    .replaceAll('{sold}', refs.sold ? nameOf[refs.sold] : '')
}
