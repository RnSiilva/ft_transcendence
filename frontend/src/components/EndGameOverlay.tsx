import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

export type FinalScore = { name: string; points: number }

const TIERS = ['rank-gold', 'rank-silver', 'rank-bronze']
const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}']

/** Turns the server's ordered scores into what the podium needs to draw. */
function toRanks(scores: FinalScore[]) {
  return scores.map((score, i) => ({
    rank: i + 1,
    tier: TIERS[i] ?? 'rank-plain',
    trophy: i === 0,
    initial: score.name.charAt(0).toUpperCase(),
    name: score.name,
    medal: MEDALS[i] ?? '',
    score: score.points,
  }))
}

const TROPHY_D =
  'M62.11,53.93c22.582-3.125,22.304-23.471,18.152-29.929-4.166-6.444-10.36-2.153-10.36-2.153v-4.166H30.099v4.166s-6.194-4.291-10.36,2.153c-4.152,6.458-4.43,26.804,18.152,29.929l5.236,7.777v8.249s-.944,4.597-4.833,4.986c-3.903,.389-7.791,4.028-7.791,7.374h38.997c0-3.347-3.889-6.986-7.791-7.374-3.889-.389-4.833-4.986-4.833-4.986v-8.249l5.236-7.777Zm7.388-24.818s2.833-3.097,5.111-1.347c2.292,1.75,2.292,15.86-8.999,18.138l3.889-16.791Zm-44.108-1.347c2.278-1.75,5.111,1.347,5.111,1.347l3.889,16.791c-11.291-2.278-11.291-16.388-8.999-18.138Z'

// O componente é montado de novo a cada abertura (ver Game.tsx), por isso a
// animação recomeça sempre do zero, como no modelo aprovado.
type Props = { onClose: () => void; scores: FinalScore[] }

function EndGameOverlay({ onClose, scores }: Props) {
  const RANKS = useMemo(() => toRanks(scores), [scores])
  const total = RANKS.length
  const { t } = useLanguage()
  const [playing, setPlaying] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [expandedCount, setExpandedCount] = useState(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPlaying(true))
    const messageTimer = setTimeout(() => setShowMessage(true), 750)
    // Um cartão de cada vez, em cascata. Depende só de quantos são.
    const cardTimers = Array.from({ length: total }, (_, i) =>
      setTimeout(() => setExpandedCount(i + 1), 1100 + i * 220)
    )
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(messageTimer)
      cardTimers.forEach(clearTimeout)
    }
  }, [total])

  return (
    <div className="endgame-overlay show">
      <div className="endgame-panel">
        <div className={playing ? 'endgame-trophy playing' : 'endgame-trophy'}>
          <svg
            className="svg-icon"
            height="100"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 100 100"
            width="100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d={TROPHY_D} />
          </svg>
          <div className="container__star">
            <div className="star-eight" />
          </div>
        </div>
        <h2 className={showMessage ? 'endgame-message show' : 'endgame-message'}>
          {t('endgame.title')}
        </h2>

        <div className="rank-list">
          {RANKS.map((entry, i) => (
            <div
              key={entry.rank}
              className={`rank-card ${entry.tier}${i < expandedCount ? ' expanded' : ''}`}
            >
              <div className="rank-card-outline">
                {entry.trophy && <div className="rank-card-trophy">🏆</div>}
                <div className="rank-card-number">#{entry.rank}</div>
                <div className="rank-card-user">
                  <div className="mini-avatar">{entry.initial}</div>
                  <div className="rank-name">{entry.name}</div>
                </div>
              </div>
              <div className="rank-card-detail">
                {entry.medal ? (
                  <div className="rank-medal">{entry.medal}</div>
                ) : (
                  <div className="rank-medal rank-medal-empty" />
                )}
                <div className="rank-score-box">
                  <div className="rank-score-label">{t('endgame.score')}</div>
                  <div className="rank-score-num">{entry.score}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          {t('endgame.close')}
        </button>
      </div>
    </div>
  )
}

export default EndGameOverlay
