// 화면 1: 이적시장 (내 스쿼드에 없는 선수 목록, 필터·정렬, 영입)
import { useMemo, useState } from 'react'
import { POSITIONS } from '../game/config.js'
import { buyBlockReason, buyPrice, closeBlockReason, scoutAccuracy } from '../game/state.js'
import { scoutReport } from '../lib/scouting.js'
import { abilityTier } from '../lib/ui.js'
import { formatMoney } from '../lib/value.js'

const AGE_FILTERS = [
  { id: 'all', label: '전체 나이', test: () => true },
  { id: 'u21', label: '21세 이하', test: (age) => age <= 21 },
  { id: '22-27', label: '22~27세', test: (age) => age >= 22 && age <= 27 },
  { id: '28-31', label: '28~31세', test: (age) => age >= 28 && age <= 31 },
  { id: '32+', label: '32세 이상', test: (age) => age >= 32 },
]

const PRICE_FILTERS = [
  { id: 'all', label: '전체 가격', max: () => Infinity },
  { id: 'budget', label: '예산 내', max: (budget) => budget },
  { id: '5', label: '5억 이하', max: () => 50000 },
  { id: '10', label: '10억 이하', max: () => 100000 },
  { id: '30', label: '30억 이하', max: () => 300000 },
]

const GRADE_ORDER = { S: 3, A: 2, B: 1, C: 0 }

// 잠재력은 스카우트 추정 등급으로만 정렬한다 (원값으로 정렬하면 순서로 실제 값이 드러남)
// sort(p, accuracy): accuracy는 고용한 스카우터의 정확도
const COLUMNS = [
  { key: 'position', label: '포지션' },
  { key: 'name', label: '이름' },
  { key: 'age', label: '나이', sort: (p) => p.age, firstDir: 'asc', num: true },
  { key: 'ability', label: '능력', sort: (p) => p.ability, firstDir: 'desc', num: true },
  { key: 'grade', label: '잠재', sort: (p, accuracy) => GRADE_ORDER[scoutReport(p, accuracy).grade] * 100 + p.ability, firstDir: 'desc' },
  { key: 'range', label: '잠재 추정' },
  { key: 'value', label: '가치', sort: (p) => p.value, firstDir: 'desc', num: true },
  { key: 'wage', label: '주급', sort: (p) => p.wage, firstDir: 'desc', num: true },
  { key: 'form', label: '컨디션', sort: (p) => p.form, firstDir: 'desc', num: true },
  { key: 'action', label: '' },
]

export default function Market({ game, players, onBuy, onCloseWindow }) {
  const [position, setPosition] = useState('ALL')
  const [ageFilter, setAgeFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'ability', dir: 'desc' })
  const accuracy = scoutAccuracy(game)
  const closeReason = closeBlockReason(game)

  const list = useMemo(() => {
    const ageTest = AGE_FILTERS.find((f) => f.id === ageFilter).test
    const maxPrice = PRICE_FILTERS.find((f) => f.id === priceFilter).max(game.budget)
    const getter = COLUMNS.find((c) => c.key === sort.key).sort
    const sign = sort.dir === 'asc' ? 1 : -1
    return players
      .filter((p) => !game.squad.includes(p.id))
      .filter((p) => position === 'ALL' || p.position === position)
      .filter((p) => ageTest(p.age) && buyPrice(game, p) <= maxPrice)
      .sort((a, b) => sign * (getter(a, accuracy) - getter(b, accuracy)))
  }, [players, game, position, ageFilter, priceFilter, sort, accuracy])

  const toggleSort = (col) => {
    if (!col.sort) return
    setSort((s) => (s.key === col.key ? { ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: col.firstDir }))
  }

  return (
    <section>
      <div className="page-head">
        <h2>이적시장</h2>
        {game.phase === 'transfer' && (
          <div className="page-head-action">
            {closeReason && <span className="danger small">{closeReason}</span>}
            <button className="btn primary" disabled={!!closeReason} onClick={onCloseWindow}>
              이적시장 종료 →
            </button>
          </div>
        )}
      </div>
      {game.phase === 'review' && (
        <p className="notice">이적시장이 마감됐습니다. 시즌 메뉴에서 평가와 언론·팬 반응을 확인하고 시즌을 시작하세요.</p>
      )}
      {game.phase === 'result' && (
        <p className="notice">시즌이 끝났습니다. 시즌 메뉴에서 '다음 시즌'을 누르면 이적시장이 열립니다.</p>
      )}

      <div className="toolbar">
        <div className="chips">
          {['ALL', ...POSITIONS].map((pos) => (
            <button key={pos} className={position === pos ? 'chip active' : 'chip'} onClick={() => setPosition(pos)}>
              {pos === 'ALL' ? '전체' : pos}
            </button>
          ))}
        </div>
        <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} aria-label="나이 필터">
          {AGE_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} aria-label="가격 필터">
          {PRICE_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <span className="muted toolbar-count">{list.length}명</span>
      </div>

      <table className="table market-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`${col.sort ? 'sortable' : ''} ${col.num ? 'num' : ''} col-${col.key}`}
                onClick={() => toggleSort(col)}
                aria-sort={sort.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {col.label}
                {sort.key === col.key && (sort.dir === 'asc' ? ' ▲' : ' ▼')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((p) => {
            const reason = buyBlockReason(game, p)
            const { low, high, grade } = scoutReport(p, accuracy)
            const price = buyPrice(game, p)
            return (
              <tr key={p.id}>
                <td className="col-position"><span className="pos">{p.position}</span></td>
                <td className="col-name">{p.name}</td>
                <td className="col-age num">{p.age}</td>
                <td className="col-ability num"><span className={`rating rating-${abilityTier(p.ability)}`}>{p.ability}</span></td>
                <td className="col-grade"><span className={`grade grade-${grade}`}>{grade}</span></td>
                <td className="col-range num muted">{low}~{high}</td>
                <td className="col-value num">
                  {formatMoney(p.value)}
                  {price < p.value && <span className="discount">→ {formatMoney(price)}</span>}
                </td>
                <td className="col-wage num">{p.wage.toLocaleString('ko-KR')}만</td>
                <td className="col-form num">{p.form.toFixed(2)}</td>
                <td className="col-action">
                  {reason ? (
                    <span className="block-reason">{reason}</span>
                  ) : (
                    <button className="btn small primary" onClick={() => onBuy(p.id)}>영입</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {list.length === 0 && <p className="muted empty">조건에 맞는 선수가 없습니다.</p>}
    </section>
  )
}
