// 화면 3: 시즌
//   이적 기간: 이적시장 종료 버튼 + 참가 팀 전력
//   마감 후:   이적시장 평가 등급 + 언론·팬 반응 + 시즌 시작
//   시즌 후:   순위표·성적·점수·다음 시즌
import { MY_TEAM } from '../game/config.js'
import { closeBlockReason, getManager, getSquad } from '../game/state.js'
import { fillNames, formatLikes } from '../game/reactions.js'
import { pickLineup } from '../game/team.js'
import { formatMoney } from '../lib/value.js'

const signed = (n) => (n > 0 ? `+${n}` : `${n}`)

export default function Result({ game, nameOf, best, onCloseWindow, onPlay, onNext }) {
  if (game.phase === 'transfer') return <TransferOpen game={game} best={best} onCloseWindow={onCloseWindow} />
  if (game.phase === 'review') return <WindowReview game={game} nameOf={nameOf} best={best} onPlay={onPlay} />
  return <SeasonResult game={game} nameOf={nameOf} best={best} onNext={onNext} />
}

function TransferOpen({ game, best, onCloseWindow }) {
  const strength = pickLineup(getSquad(game)).strength + (getManager(game)?.strengthBonus ?? 0)
  const reason = closeBlockReason(game)
  const teams = [{ name: MY_TEAM, strength, mine: true }, ...game.league].sort((a, b) => b.strength - a.strength)

  return (
    <section>
      <h2>시즌 {game.season} 준비</h2>
      <div className="layout-2col">
        <div>
          <div className="card">
            <p>
              이적시장이 열려 있습니다. 영입·판매를 마치면 이적시장을 종료하세요.
              평가 등급과 언론·팬 반응을 확인한 뒤 시즌을 시작합니다.
            </p>
            {reason && <p className="danger small">{reason}</p>}
            <button className="btn primary block" disabled={!!reason} onClick={onCloseWindow}>
              이적시장 종료
            </button>
          </div>

          <h3>참가 팀 전력</h3>
          <table className="table">
            <thead>
              <tr><th className="col-rank num">#</th><th>팀</th><th className="num">전력</th></tr>
            </thead>
            <tbody>
              {teams.map((t, i) => (
                <tr key={t.name} className={t.mine ? 'mine' : ''}>
                  <td className="col-rank num">{i + 1}</td>
                  <td>{t.name}</td>
                  <td className="num">{t.strength.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="side">
          <History game={game} best={best} />
        </aside>
      </div>
    </section>
  )
}

function WindowReview({ game, nameOf, best, onPlay }) {
  const { grade, points, strength, netSpend, youth, incoming, outgoing, reactions } = game.review
  const delta = strength[1] - strength[0]

  return (
    <section>
      <h2>시즌 {game.season} 이적시장 결산</h2>
      <div className="layout-2col">
        <div>
          <Reactions reactions={reactions} nameOf={nameOf} season={game.season} />
        </div>

        <aside className="side">
          <div className="card">
            <p className="card-title">이적시장 평가</p>
            <div className="window-grade">
              <b className={`grade-big grade-big-${grade}`}>{grade}</b>
              <span className="muted num">{points}점</span>
            </div>
            <dl className="score-breakdown num">
              <dt>선발 전력</dt>
              <dd>{strength[0].toFixed(1)} → {strength[1].toFixed(1)} ({signed(Number(delta.toFixed(1)))})</dd>
              <dt>순지출</dt>
              <dd>{netSpend >= 0 ? formatMoney(Math.round(netSpend * 10000)) : `+${formatMoney(Math.round(-netSpend * 10000))} 수익`}</dd>
              <dt>21세 이하 영입</dt>
              <dd>{youth}명</dd>
            </dl>
            <MoveList title="영입" moves={incoming} nameOf={nameOf} />
            <MoveList title="방출" moves={outgoing} nameOf={nameOf} />
            <button className="btn primary block" onClick={onPlay}>시즌 {game.season} 시작</button>
          </div>
          <History game={game} best={best} />
        </aside>
      </div>
    </section>
  )
}

function MoveList({ title, moves, nameOf }) {
  return (
    <div className="move-list">
      <p className="small muted">{title} {moves.length}명</p>
      {moves.length > 0 && (
        <ul className="plain-list small num">
          {moves.map((m) => (
            <li key={m.id}>{nameOf[m.id]} · {formatMoney(m.fee)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// 언론·팬 반응 피드: 기사 한 줄 + 댓글(답글 포함)
function Reactions({ reactions, nameOf, season }) {
  const { article, comments, refs } = reactions
  const text = (t) => fillNames(t, refs, nameOf)

  return (
    <div className="card feed">
      <div className="feed-head">
        <p className="card-title">언론·팬 반응</p>
        <span className="muted small">시즌 {season}</span>
      </div>

      <div className="article">
        <p className="article-meta">
          <span className="avatar square">{article.outlet[0]}</span>
          <b>{article.outlet}</b> <span className="muted">· 기사</span>
        </p>
        <p className="article-title">{text(article.title)}</p>
      </div>

      {comments.map((c, i) => (
        <div key={i} className="comment">
          <span className="avatar">{c.user[0].toUpperCase()}</span>
          <div className="comment-body">
            <p className="comment-user">
              <b>{c.user}</b> <span className="tag">{c.tag}</span>
            </p>
            <p className="comment-text">{text(c.text)}</p>
            <p className="comment-meta">
              <span>{c.source} · {c.minutesAgo}분 전</span>
              <span className="likes">♡ {formatLikes(c.likes)}</span>
            </p>
            {c.reply && (
              <div className="reply">
                <span className="avatar small-avatar">{c.reply.user[0]}</span>
                <div className="comment-body">
                  <p className="comment-user"><b>{c.reply.user}</b></p>
                  <p className="comment-text">{text(c.reply.text)}</p>
                  <p className="comment-meta">
                    <span>{c.reply.minutesAgo}분 전</span>
                    <span className="likes">♡ {formatLikes(c.reply.likes)}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      <p className="feed-note">게임 속 가상 매체·가상 반응이에요</p>
    </div>
  )
}

function SeasonResult({ game, nameOf, best, onNext }) {
  const { season, table, myRow, myMatches, injuries, changes, score, newBest } = game.result

  return (
    <section>
      <h2>시즌 {season} 결과</h2>
      <div className="layout-2col">
        <div>
          <div className="card score-card">
            <div className="score-total">
              <span className="muted">시즌 점수</span>
              <b className="num">{score.total}</b>
              {newBest && <span className="badge accent">최고 기록</span>}
            </div>
            <dl className="score-breakdown num">
              <dt>순위 점수 ({myRow.rank}위)</dt><dd>{score.rank}</dd>
              <dt>재정 점수 (예산 증감)</dt><dd>{signed(score.finance)}</dd>
              <dt>선수 가치 증감</dt><dd>{signed(score.value)}</dd>
            </dl>
            {best && <p className="muted small">최고 점수 {best.score}점 (시즌 {best.season})</p>}
            <button className="btn primary block" onClick={onNext}>다음 시즌</button>
          </div>

          <h3>내 팀 성적</h3>
          <div className="stats stats-4">
            <div className="stat"><span className="stat-label">순위</span><b className="stat-value num">{myRow.rank}위</b></div>
            <div className="stat">
              <span className="stat-label">승 / 무 / 패</span>
              <b className="stat-value num">{myRow.won} / {myRow.drawn} / {myRow.lost}</b>
            </div>
            <div className="stat">
              <span className="stat-label">득점 / 실점</span>
              <b className="stat-value num">{myRow.gf} / {myRow.ga}</b>
            </div>
            <div className="stat"><span className="stat-label">승점</span><b className="stat-value num">{myRow.points}</b></div>
          </div>

          <h3>순위표</h3>
          <table className="table">
            <thead>
              <tr>
                <th className="col-rank num">#</th><th>팀</th><th className="num">경기</th><th className="num">승</th>
                <th className="num">무</th><th className="num">패</th><th className="num">득점</th>
                <th className="num">실점</th><th className="num">득실</th><th className="num">승점</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr key={row.name} className={row.mine ? 'mine' : ''}>
                  <td className="col-rank num">{row.rank}</td>
                  <td className="col-name">{row.name}</td>
                  <td className="num">{row.played}</td>
                  <td className="num">{row.won}</td>
                  <td className="num">{row.drawn}</td>
                  <td className="num">{row.lost}</td>
                  <td className="num">{row.gf}</td>
                  <td className="num">{row.ga}</td>
                  <td className="num">{signed(row.gf - row.ga)}</td>
                  <td className="num"><b>{row.points}</b></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>선수 변동 <span className="muted small">나이 +1</span></h3>
          <table className="table">
            <thead>
              <tr><th>이름</th><th className="num">능력</th><th className="num">가치</th></tr>
            </thead>
            <tbody>
              {changes.map((c) => {
                const diff = c.ability[1] - c.ability[0]
                return (
                  <tr key={c.id}>
                    <td className="col-name">{nameOf[c.id]}</td>
                    <td className="num">
                      {c.ability[0]} → <b>{c.ability[1]}</b>{' '}
                      <span className={diff > 0 ? 'accent' : diff < 0 ? 'danger' : 'muted'}>({signed(diff)})</span>
                    </td>
                    <td className="num">{formatMoney(c.value[0])} → {formatMoney(c.value[1])}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <aside className="side">
          <div className="card">
            <p className="card-title">경기 결과 <span className="muted small">{myMatches.length}경기</span></p>
            <table className="table plain">
              <tbody>
                {myMatches.map((m) => {
                  const outcome = m.gf > m.ga ? 'W' : m.gf === m.ga ? 'D' : 'L'
                  return (
                    <tr key={m.round}>
                      <td className="col-round num muted">{m.round}R</td>
                      <td className="col-name">{m.opponent} <span className="muted small">{m.home ? '홈' : '원정'}</span></td>
                      <td className="col-score num"><b>{m.gf} : {m.ga}</b></td>
                      <td className="col-outcome"><span className={`result result-${outcome}`}>{{ W: '승', D: '무', L: '패' }[outcome]}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <p className="card-title">부상 <span className="muted small">{injuries.length}건</span></p>
            {injuries.length === 0 && <p className="muted small">부상자가 없었습니다.</p>}
            <ul className="plain-list small">
              {injuries.map((inj, i) => (
                <li key={i}>{inj.round}R · {nameOf[inj.id]} · {inj.rounds}경기 결장</li>
              ))}
            </ul>
          </div>

          <History game={game} best={best} />
        </aside>
      </div>
    </section>
  )
}

function History({ game, best }) {
  return (
    <div className="card">
      <p className="card-title">기록</p>
      {!best && !game.history.length && <p className="muted small">아직 치른 시즌이 없습니다.</p>}
      {best && <p className="small">최고 점수 <b>{best.score}점</b> (시즌 {best.season})</p>}
      {game.history.length > 0 && (
        <ul className="plain-list small num">
          {game.history.map((h) => (
            <li key={h.season}>시즌 {h.season} · {h.rank}위 · {h.score}점 · 이적시장 {h.window}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
