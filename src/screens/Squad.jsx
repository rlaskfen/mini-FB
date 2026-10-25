// 화면 2: 내 스쿼드 (보유 선수, 판매, 예산·주급 현황, 설정)
import { useRef, useState } from 'react'
import { LINEUP, MAX_SQUAD, POSITIONS, WAGE_CAP } from '../game/config.js'
import { getManager, getScout, scoutAccuracy, sellPrice, squadValue, wageTotal } from '../game/state.js'
import { pickLineup, positionCounts } from '../game/team.js'
import { parseNamePatch } from '../lib/names.js'
import { playerIds } from '../lib/players.js'
import { scoutReport } from '../lib/scouting.js'
import { abilityTier } from '../lib/ui.js'
import { formatMoney } from '../lib/value.js'
import Pitch from './Pitch.jsx'

export default function Squad({ game, players, onSell, names, onNamesChange, onToast, onReset }) {
  const squad = players.filter((p) => game.squad.includes(p.id))
  const { starters, strength } = pickLineup(squad)
  const starterIds = new Set(starters.map((p) => p.id))
  const counts = positionCounts(squad)
  const wages = wageTotal(game)
  const canSell = game.phase === 'transfer'

  // 포지션 순서(GK→FW), 같은 포지션 안에서는 능력 높은 순
  const sorted = [...squad].sort(
    (a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || b.ability - a.ability,
  )

  return (
    <section>
      <h2>내 스쿼드</h2>

      <div className="layout-2col">
        <div>
          <Pitch squad={squad} />

          <h3>전체 선수 <span className="muted small">{squad.length}명</span></h3>
          <table className="table">
            <thead>
              <tr>
                <th className="col-position">포지션</th>
                <th className="col-name">이름</th>
                <th className="col-age num">나이</th>
                <th className="col-ability num">능력</th>
                <th className="col-grade">잠재</th>
                <th className="col-value num">가치</th>
                <th className="col-wage num">주급</th>
                <th className="col-form num">컨디션</th>
                <th className="col-sell" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const { grade } = scoutReport(p, scoutAccuracy(game))
                const firstOfPosition = i > 0 && sorted[i - 1].position !== p.position
                return (
                  <tr key={p.id} className={firstOfPosition ? 'group-start' : ''}>
                    <td className="col-position"><span className="pos">{p.position}</span></td>
                    <td className="col-name">
                      {p.name}
                      {starterIds.has(p.id) && <span className="badge">선발</span>}
                    </td>
                    <td className="col-age num">{p.age}</td>
                    <td className="col-ability num"><span className={`rating rating-${abilityTier(p.ability)}`}>{p.ability}</span></td>
                    <td className="col-grade"><span className={`grade grade-${grade}`}>{grade}</span></td>
                    <td className="col-value num">{formatMoney(p.value)}</td>
                    <td className="col-wage num">{p.wage.toLocaleString('ko-KR')}만</td>
                    <td className="col-form num">{p.form.toFixed(2)}</td>
                    <td className="col-sell">
                      <button className="btn small" disabled={!canSell} onClick={() => onSell(p.id)}>
                        판매 <span className="muted num">{formatMoney(sellPrice(p))}</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <aside className="side">
          <StaffCard game={game} />
          <div className="stats">
            <Stat label="예산" value={formatMoney(game.budget)} />
            <Stat label="팀 전력" value={strength.toFixed(1)} />
            <Stat label="선수" value={`${squad.length} / ${MAX_SQUAD}`} />
            <Stat label="스쿼드 가치" value={formatMoney(squadValue(game))} />
            <Stat
              label="주급 합계"
              value={`${wages.toLocaleString('ko-KR')}만`}
              sub={`상한 ${WAGE_CAP.toLocaleString('ko-KR')}만`}
              danger={wages > WAGE_CAP}
              wide
            />
          </div>

          <div className="card position-card">
            <p className="card-title">포지션 인원 <span className="muted small">보유 / 선발 필요</span></p>
            <div className="position-counts num">
              {POSITIONS.map((pos) => (
                <span key={pos} className={counts[pos] < LINEUP[pos] ? 'danger' : ''}>
                  {pos} {counts[pos]}<span className="muted">/{LINEUP[pos]}</span>
                </span>
              ))}
            </div>
          </div>

          <Settings names={names} onNamesChange={onNamesChange} onToast={onToast} onReset={onReset} />
        </aside>
      </div>
    </section>
  )
}

function StaffCard({ game }) {
  const manager = getManager(game)
  const scout = getScout(game)
  if (!manager || !scout) return null
  return (
    <div className="card">
      <p className="card-title">스태프</p>
      <dl className="staff-list">
        <dt>감독</dt>
        <dd><b>{manager.name}</b> · {manager.style}<span className="muted small">{manager.effect}</span></dd>
        <dt>스카우터</dt>
        <dd><b>{scout.name}</b> · {scout.level}<span className="muted small">{scout.effect}</span></dd>
      </dl>
    </div>
  )
}

function Stat({ label, value, sub, danger, wide }) {
  return (
    <div className={`stat${danger ? ' danger' : ''}${wide ? ' wide' : ''}`}>
      <span className="stat-label">{label}</span>
      <b className="stat-value num">{value}</b>
      {sub && <span className="stat-sub muted num">{sub}</span>}
    </div>
  )
}

const MAX_SHOWN_ERRORS = 10

function Settings({ names, onNamesChange, onToast, onReset }) {
  const fileRef = useRef(null)
  const [upload, setUpload] = useState(null) // { title, errors } — 마지막 업로드 결과
  const patched = Object.keys(names).length

  const handleFile = async (e) => {
    const file = e.target.files[0]
    e.target.value = '' // 같은 파일을 다시 골라도 onChange가 오도록
    if (!file) return
    let data
    try {
      data = JSON.parse(await file.text())
    } catch {
      setUpload({ title: `${file.name}: JSON 형식이 아닙니다. 괄호나 쉼표, 따옴표를 확인하세요.`, errors: [] })
      return
    }
    const { names: patch, errors } = parseNamePatch(data, playerIds)
    const count = Object.keys(patch).length
    if (!count) {
      setUpload({ title: `${file.name}: 적용할 이름이 없습니다.`, errors })
      return
    }
    onNamesChange({ ...names, ...patch })
    onToast(`이름 ${count}개 적용`)
    setUpload(errors.length ? { title: `이름 ${count}개 적용, ${errors.length}개 항목은 건너뜀:`, errors } : null)
  }

  return (
    <div className="card settings">
      <p className="card-title">설정</p>
      <p className="muted small">
        이름 패치: <code>[{'{ "id": "p001", "name": "이름" }'}]</code> 형식의 JSON 파일로 선수 이름만 바꿉니다.
        {patched > 0 && ` 현재 ${patched}명 적용 중.`}
      </p>
      <div className="button-row">
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={handleFile} />
        <button className="btn" onClick={() => fileRef.current.click()}>이름 패치 업로드</button>
        <button className="btn" disabled={!patched} onClick={() => onNamesChange({})}>기본 이름으로</button>
        <button className="btn danger" onClick={onReset}>새 게임</button>
      </div>
      {upload && (
        <div className="upload-errors danger small" role="alert">
          <p>{upload.title}</p>
          {upload.errors.length > 0 && (
            <ul className="plain-list">
              {upload.errors.slice(0, MAX_SHOWN_ERRORS).map((err, i) => <li key={i}>{err}</li>)}
              {upload.errors.length > MAX_SHOWN_ERRORS && <li>외 {upload.errors.length - MAX_SHOWN_ERRORS}건</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
