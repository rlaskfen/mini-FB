// 새 게임 시작 화면: 1) 감독 고용 → 2) 스카우터 선정. 계약금은 예산에서 빠진다.
import { MANAGERS, SCOUTS } from '../game/config.js'
import { formatMoney } from '../lib/value.js'

export default function Hire({ game, onHireManager, onHireScout }) {
  const step = game.manager ? 2 : 1
  const options = step === 1 ? MANAGERS : SCOUTS

  return (
    <section>
      <p className="step-label">스태프 고용 · {step} / 2</p>
      <h2>{step === 1 ? '감독을 고용하세요' : '스카우터를 선정하세요'}</h2>
      <p className="lead">
        {step === 1
          ? '감독마다 효과가 다릅니다. 계약금은 예산에서 빠지고, 첫 시즌 재정 점수에도 반영됩니다.'
          : '스카우터가 좋을수록 선수 잠재력 추정 범위가 좁고 정확해집니다. 잠재 등급도 이 추정치로 매겨집니다.'}
      </p>

      <div className="hire-grid">
        {options.map((o) => (
          <div key={o.id} className="card hire-card">
            <p className="hire-role">{step === 1 ? o.style : `${o.level} 스카우터`}</p>
            <p className="hire-name">{o.name}</p>
            <p className="hire-effect">{o.effect}</p>
            <p className="hire-cost num">계약금 <b>{formatMoney(o.cost)}</b></p>
            <button
              className="btn primary"
              onClick={() => (step === 1 ? onHireManager(o.id) : onHireScout(o.id))}
            >
              고용
            </button>
          </div>
        ))}
      </div>

      {step === 2 && (
        <p className="muted small hire-note">고용한 감독: {MANAGERS.find((m) => m.id === game.manager).name} ({MANAGERS.find((m) => m.id === game.manager).style})</p>
      )}
    </section>
  )
}
