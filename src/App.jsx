import { useEffect, useMemo, useState } from 'react'
import Hire from './screens/Hire.jsx'
import Market from './screens/Market.jsx'
import Squad from './screens/Squad.jsx'
import Result from './screens/Result.jsx'
import { basePlayers } from './lib/players.js'
import { applyNamePatch } from './lib/names.js'
import { formatMoney } from './lib/value.js'
import { loadBest, loadGame, loadNames, saveBest, saveGame, saveNames } from './lib/storage.js'
import { MANAGERS, MAX_SQUAD, SCOUTS, WAGE_CAP } from './game/config.js'
import {
  buy, buyPrice, closeWindow, hireManager, hireScout, isValidState, newGame, nextSeason, playSeason,
  sell, sellPrice, wageTotal,
} from './game/state.js'

// 라우터 없이 상단 메뉴(탭 상태)로 3개 화면만 전환한다.
// 새 게임 직후(스태프 고용 단계)에는 메뉴 없이 고용 화면만 보인다.
const TABS = [
  { id: 'market', label: '이적시장' },
  { id: 'squad', label: '내 스쿼드' },
  { id: 'result', label: '시즌' },
]

const PHASE_LABEL = {
  hire: '스태프 고용',
  transfer: '이적 기간',
  review: '이적시장 마감',
  result: '시즌 종료',
}

function initialGame() {
  const saved = loadGame()
  return isValidState(saved, basePlayers) ? saved : newGame(basePlayers)
}

export default function App() {
  const [tab, setTab] = useState('market')
  const [game, setGame] = useState(initialGame)
  const [names, setNames] = useState(() => loadNames() ?? {})
  const [best, setBest] = useState(loadBest)
  const [toast, setToast] = useState(null)

  useEffect(() => saveGame(game), [game])
  useEffect(() => saveNames(Object.keys(names).length ? names : null), [names])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  // 화면에 보여줄 선수 목록 (이름 패치 적용)
  const players = useMemo(() => applyNamePatch(game.players, names), [game.players, names])
  const nameOf = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p.name])), [players])

  const handleHireManager = (id) => {
    const m = MANAGERS.find((x) => x.id === id)
    setGame(hireManager(game, id))
    setToast(`${m.name} 감독 고용 (−${formatMoney(m.cost)})`)
  }

  const handleHireScout = (id) => {
    const s = SCOUTS.find((x) => x.id === id)
    setGame(hireScout(game, id))
    setTab('market')
    setToast(`${s.name} 스카우터 고용 (−${formatMoney(s.cost)}). 이적시장이 열렸습니다`)
  }

  const handleBuy = (id) => {
    const p = game.players.find((x) => x.id === id)
    setGame(buy(game, id))
    setToast(`영입 완료: ${nameOf[id]} (−${formatMoney(buyPrice(game, p))})`)
  }

  const handleSell = (id) => {
    const p = game.players.find((x) => x.id === id)
    if (!window.confirm(`${nameOf[id]}을(를) ${formatMoney(sellPrice(p))}에 판매할까요?`)) return
    setGame(sell(game, id))
    setToast(`판매 완료: ${nameOf[id]} (+${formatMoney(sellPrice(p))})`)
  }

  const handleCloseWindow = () => {
    if (!window.confirm('이적시장을 마감할까요? 마감하면 이번 시즌에는 더 영입·판매할 수 없습니다.')) return
    setGame(closeWindow(game))
    setTab('result')
  }

  const handlePlay = () => {
    const after = playSeason(game)
    const { score, season } = after.result
    const newBest = best === null || score.total > best.score
    if (newBest) {
      const record = { score: score.total, season }
      setBest(record)
      saveBest(record)
    }
    setGame({ ...after, result: { ...after.result, newBest } })
  }

  const handleNext = () => {
    setGame(nextSeason(game))
    setTab('market')
  }

  const handleReset = () => {
    if (!window.confirm('진행 중인 게임을 버리고 새로 시작할까요? (최고 점수는 유지됩니다)')) return
    setGame(newGame(basePlayers))
    setTab('market')
    setToast('새 게임을 시작했습니다')
  }

  const wages = wageTotal(game)
  const hiring = game.phase === 'hire'

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <h1 className="brand">미니 FM</h1>
          {!hiring && (
            <nav className="nav">
              {TABS.map((t) => (
                <button key={t.id} className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </nav>
          )}
          <div className="statusbar num">
            <span>시즌 <b>{game.season}</b> · {PHASE_LABEL[game.phase]}</span>
            <span>예산 <b>{formatMoney(game.budget)}</b></span>
            <span>선수 <b>{game.squad.length}</b>/{MAX_SQUAD}</span>
            <span className={wages > WAGE_CAP ? 'danger' : ''}>
              주급 <b>{wages.toLocaleString('ko-KR')}</b>/{WAGE_CAP.toLocaleString('ko-KR')}만
            </span>
          </div>
        </div>
      </header>

      <main className="content">
        {hiring && <Hire game={game} onHireManager={handleHireManager} onHireScout={handleHireScout} />}
        {!hiring && tab === 'market' && (
          <Market game={game} players={players} onBuy={handleBuy} onCloseWindow={handleCloseWindow} />
        )}
        {!hiring && tab === 'squad' && (
          <Squad
            game={game}
            players={players}
            onSell={handleSell}
            names={names}
            onNamesChange={setNames}
            onToast={setToast}
            onReset={handleReset}
          />
        )}
        {!hiring && tab === 'result' && (
          <Result
            game={game}
            nameOf={nameOf}
            best={best}
            onCloseWindow={handleCloseWindow}
            onPlay={handlePlay}
            onNext={handleNext}
          />
        )}
        <footer className="disclaimer">
          비공식 팬 게임이며 어떤 구단·선수와도 관련 없음. 등장하는 매체·커뮤니티·반응도 모두 가상입니다.
        </footer>
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
