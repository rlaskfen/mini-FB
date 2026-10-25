# 미니 FM (이적시장 시뮬레이터)

가상 선수 100명이 있는 이적시장에서 예산 안에 영입·판매하고, 시즌 1회를 시뮬레이션해 점수를 받는 브라우저 게임.

## 기술 제약 (반드시 지킬 것)
- 프론트엔드만. 서버, 로그인, DB 없음
- 저장은 localStorage (`src/lib/storage.js` 경유. 게임 진행/최고 점수/이름 패치를 각각 별도 키로 저장)
- 스택: Vite + React (JS). 정적 호스팅(Vercel/Netlify/GitHub Pages)으로 배포
- 메뉴 화면은 3개: 이적시장, 내 스쿼드, 시즌. 새 게임 직후에만 스태프 고용 화면(Hire.jsx)이 메뉴 없이 따로 뜬다
- PC 웹 기준 레이아웃 (본문 최대 1200px, 상단 메뉴, 본문+사이드 2단). 창이 960px보다 좁으면 1단으로 쌓인다. (원 명세는 모바일 우선이었으나 PC 기준으로 변경함)
- 선수 사진, 클럽 로고, 엠블럼 사용 금지. 텍스트와 숫자 UI만
- 실존 선수/클럽 이름 사용 금지 (가상 데이터)
- **potential 원값은 화면에 절대 노출하지 않는다.** `src/lib/scouting.js`의 등급(S/A/B/C)·범위로만 표시
- 이름 패치 파일 형식(`[{ id, name }]`)은 README에 공개된 규격이다. 바꾸면 README도 같이 고칠 것

## 하지 말 것
- 크롤링 금지. 데이터는 전부 생성기로 직접 만든다
- 실제 게임(FM/FIFA)의 능력치 베끼기 금지
- 사진·로고·엠블럼 사용 금지
- 화면 하단 문구 "비공식 팬 게임이며 어떤 구단·선수와도 관련 없음"을 지우지 말 것 (App.jsx의 footer)
- 이름 목록은 국가별 일반 이름/성만. 실존 유명 선수 이름 조합 금지. 생성기의 REAL_PLAYERS 차단 목록에 걸리면 경고가 뜬다
- 언론·팬 반응의 매체·커뮤니티 이름은 가상으로만 (실제 매체 이름에 지어낸 기사·댓글을 붙이지 않는다). 감독·스카우터 이름도 가상

## 구조
- `src/App.jsx` — 라우터 없이 상단 메뉴(탭 상태)로 3개 화면 전환. 게임 상태를 들고 있고 바뀔 때마다 저장
- `src/screens/` — Hire.jsx(감독·스카우터 고용), Market.jsx(이적시장), Squad.jsx(내 스쿼드 + 스태프 + 설정), Result.jsx(시즌 준비 / 이적시장 결산 / 시즌 결과), Pitch.jsx(내 스쿼드 위쪽 베스트 11 경기장 판, 4-3-3)
- `src/game/config.js` — 규칙·밸런스 상수 (예산, 주급 상한, AI 전력 범위, 경기 공식, 부상 확률, 감독·스카우터 목록, 이적시장 평가 가중치)
- `src/game/state.js` — 게임 상태와 행동 (newGame, hireManager, hireScout, buy, sell, closeWindow, playSeason, nextSeason). 순수 함수
  - 진행 단계(phase): `hire` → `transfer` → (closeWindow) `review` → (playSeason) `result` → (nextSeason) `transfer`
- `src/game/reactions.js` — 이적시장 마감 후 기사·댓글 생성. 선수 이름은 `{star}`/`{sold}` 자리표시자로 저장하고 화면에서 fillNames로 채운다 (이름 패치 반영)
- `src/game/season.js` — 리그 일정, 경기 시뮬레이션, 시즌 종료 선수 변동(developPlayer)
- `src/game/team.js` — 선발(GK1 DF4 MF3 FW3)과 팀 전력 계산
- `src/lib/storage.js` — localStorage 래퍼 (키: `mini-fm:v1` 게임, `mini-fm:best` 최고 점수, `mini-fm:names` 이름 패치)
- `src/lib/players.js` — data/players.json 로드 (basePlayers, playerIds)
- `src/lib/value.js` — 몸값/주급 계산, 금액 표시(formatMoney). 금액 단위는 '만' (10000 = 1억)
- `src/lib/scouting.js` — potential → 추정 범위/등급 변환. 화면에서는 `scoutReport(p, scoutAccuracy(state))`를 쓴다 (스카우터 정확도 반영, 등급도 추정치 기준)
- `src/lib/names.js` — 이름 패치 파일 검증(parseNamePatch)·적용(applyNamePatch)
- `data/players.json`, `data/names.json` — 생성된 선수 데이터. 손으로 고치지 말고 `npm run gen:players`로 재생성
- `scripts/generate-players.mjs` — 시드 고정 선수 생성기 (국가별 이름 목록, 실존 선수 차단 목록 포함)
- `src/styles.css` — 전역 스타일, 색상은 `:root` CSS 변수
  - 디자인 톤: 모노크롬 미니멀 (연회색 바탕, 흰 카드, 검정 글자·버튼). 색은 의미가 있을 때만(오류 빨강, 증가 초록)
  - 글꼴: Pretendard (npm `pretendard` 패키지, main.jsx에서 import)

## 게임 로직 메모
- 금액 단위는 전부 '만'. 점수는 1억 = 1점
- 영입하면 예산이 줄어든 만큼 스쿼드 가치가 늘어서 점수상 중립. 판매는 10% 손해. 결국 가치 점수는 선수 성장/노화가 좌우한다
- 주급은 상한 체크에만 쓰고 예산에서 빠지지 않는다
- 감독·스카우터 계약금은 1시즌 재정 점수에 반영된다 (seasonStart 기준점이 고용 전)
- 이적시장 평가 점수 = 50 + 선발 전력 변화×12 − 순지출(억)×0.35 + 21세 이하 영입×5(최대 3명). 아무것도 안 하면 C
- 게임 상태 구조가 바뀌면 state.js의 STATE_VERSION을 올린다 (옛 저장은 새 게임으로 초기화됨)
- 선수 변동은 시즌 종료 직후(점수 계산 전) 전체 100명에게 적용된다
- `src/game/`은 React와 무관한 순수 JS라 Node에서 바로 import해서 테스트할 수 있다

## 명령어
- `npm run dev` — 개발 서버
- `npm run build` — `dist/`로 정적 빌드 (`base: './'`라 어느 정적 호스팅이든 그대로 업로드 가능)
- `npm run preview` — 빌드 결과 미리보기
- `npm run gen:players` — 선수 데이터 재생성 (SEED 환경변수로 시드 변경)

## 배포
- GitHub Pages. `.github/workflows/deploy.yml`이 main에 push될 때마다 빌드(`dist/`)해서 배포한다
- 저장소 Settings → Pages → Source가 "GitHub Actions"여야 한다
