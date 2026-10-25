// 베스트 11 경기장 판 (4-3-3). 선발은 팀 전력 계산과 같은 규칙(pickLineup)으로 뽑는다.
// 위가 공격 방향: FW → MF → DF → GK 순서로 줄을 그린다. 이미지 없이 글자와 CSS만.
import { LINEUP } from '../game/config.js'
import { pickLineup } from '../game/team.js'
import { abilityTier } from '../lib/ui.js'

const ROWS = ['FW', 'MF', 'DF', 'GK']

export default function Pitch({ squad }) {
  const { starters, strength } = pickLineup(squad)

  return (
    <div className="pitch-card">
      <div className="pitch-head">
        <p className="card-title">베스트 11 <span className="muted small">4-3-3</span></p>
        <span className="small">팀 전력 <b className="num">{strength.toFixed(1)}</b></span>
      </div>
      <div className="pitch">
        <div className="pitch-line half" />
        <div className="pitch-line circle" />
        <div className="pitch-line box top" />
        <div className="pitch-line box bottom" />
        {ROWS.map((pos) => {
          const players = starters.filter((p) => p.position === pos)
          const empty = LINEUP[pos] - players.length
          return (
            <div key={pos} className="pitch-row">
              {players.map((p) => (
                <div key={p.id} className="pitch-player">
                  <span className="pitch-pos">{pos}</span>
                  <span className="pitch-name">{p.name}</span>
                  <span className={`rating rating-${abilityTier(p.ability)}`}>{p.ability}</span>
                </div>
              ))}
              {Array.from({ length: empty }, (_, i) => (
                <div key={`empty-${i}`} className="pitch-player empty">
                  <span className="pitch-pos">{pos}</span>
                  <span className="pitch-name">비어 있음</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
