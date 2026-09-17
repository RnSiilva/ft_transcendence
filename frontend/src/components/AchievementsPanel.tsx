import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

/**
 * Painel de Conquistas (badges do Carlos), partilhado entre o perfil
 * próprio e o perfil público de um amigo. A definição vive no cliente;
 * o DESBLOQUEIO é o que vem da base de dados (UserAchievement), por isso
 * o painel recebe as chaves desbloqueadas e as stats de quem está a ver-se.
 */

const ACHIEVEMENTS = [
  { id: 1, nameKey: 'ach.games.1.name', descKey: 'ach.games.1.desc', icon: '🎮', category: 'GAMES_PLAYED', targetValue: 1 },
  { id: 2, nameKey: 'ach.games.2.name', descKey: 'ach.games.2.desc', icon: '🎲', category: 'GAMES_PLAYED', targetValue: 10 },
  { id: 3, nameKey: 'ach.games.3.name', descKey: 'ach.games.3.desc', icon: '🕹️', category: 'GAMES_PLAYED', targetValue: 50 },
  { id: 4, nameKey: 'ach.games.4.name', descKey: 'ach.games.4.desc', icon: '🎰', category: 'GAMES_PLAYED', targetValue: 100 },
  { id: 5, nameKey: 'ach.wins.1.name', descKey: 'ach.wins.1.desc', icon: '🏆', category: 'WINS', targetValue: 1 },
  { id: 6, nameKey: 'ach.wins.2.name', descKey: 'ach.wins.2.desc', icon: '🏅', category: 'WINS', targetValue: 5 },
  { id: 7, nameKey: 'ach.wins.3.name', descKey: 'ach.wins.3.desc', icon: '🎖️', category: 'WINS', targetValue: 25 },
  { id: 8, nameKey: 'ach.wins.4.name', descKey: 'ach.wins.4.desc', icon: '👑', category: 'WINS', targetValue: 50 },
  { id: 9, nameKey: 'ach.points.1.name', descKey: 'ach.points.1.desc', icon: '💸', category: 'TOTAL_POINTS', targetValue: 500 },
  { id: 10, nameKey: 'ach.points.2.name', descKey: 'ach.points.2.desc', icon: '💰', category: 'TOTAL_POINTS', targetValue: 2000 },
  { id: 11, nameKey: 'ach.points.3.name', descKey: 'ach.points.3.desc', icon: '💎', category: 'TOTAL_POINTS', targetValue: 10000 },
  { id: 12, nameKey: 'ach.points.4.name', descKey: 'ach.points.4.desc', icon: '🤑', category: 'TOTAL_POINTS', targetValue: 50000 },
  { id: 13, nameKey: 'ach.rank.1.name', descKey: 'ach.rank.1.desc', icon: '⭐', category: 'RANK', targetValue: 20 },
  { id: 14, nameKey: 'ach.rank.2.name', descKey: 'ach.rank.2.desc', icon: '🌟', category: 'RANK', targetValue: 10 },
  { id: 15, nameKey: 'ach.rank.3.name', descKey: 'ach.rank.3.desc', icon: '✨', category: 'RANK', targetValue: 5 },
  { id: 16, nameKey: 'ach.rank.4.name', descKey: 'ach.rank.4.desc', icon: '🔥', category: 'RANK', targetValue: 1 },
  { id: 17, nameKey: 'ach.friends.1.name', descKey: 'ach.friends.1.desc', icon: '👋', category: 'FRIENDS', targetValue: 1 },
  { id: 18, nameKey: 'ach.friends.2.name', descKey: 'ach.friends.2.desc', icon: '🤝', category: 'FRIENDS', targetValue: 3 },
  { id: 19, nameKey: 'ach.friends.3.name', descKey: 'ach.friends.3.desc', icon: '🤗', category: 'FRIENDS', targetValue: 5 },
  { id: 20, nameKey: 'ach.friends.4.name', descKey: 'ach.friends.4.desc', icon: '🎉', category: 'FRIENDS', targetValue: 10 },
]

export type ProgressSource = {
  gamesPlayed?: number
  wins?: number
  totalPoints?: number
  rank?: number
  friendsCount?: number
}

function getProgress(u: ProgressSource, category: string) {
  if (category === 'GAMES_PLAYED') return u.gamesPlayed || 0
  if (category === 'WINS') return u.wins || 0
  if (category === 'TOTAL_POINTS') return u.totalPoints || 0
  if (category === 'RANK') return u.rank || 0
  if (category === 'FRIENDS') return u.friendsCount || 0
  return 0
}

type Props = {
  stats: ProgressSource
  /** nameKeys das conquistas desbloqueadas (da BD, via UserAchievement). */
  unlockedKeys: string[]
  /** No perfil público mostra logo a grelha toda. */
  defaultTab?: 'unlocked' | 'all'
}

function AchievementsPanel({ stats, unlockedKeys, defaultTab = 'unlocked' }: Props) {
  const { t } = useLanguage()
  const [achTab, setAchTab] = useState<'unlocked' | 'all'>(defaultTab)

  return (
    <div className="panel">
      <h3>{t('achievements.title')}</h3>
      <div className="rank-tabs" style={{ marginBottom: 16 }}>
        <button type="button" className={`rank-tab ${achTab === 'unlocked' ? 'active' : ''}`} onClick={() => setAchTab('unlocked')}>
          {t('achievements.tab.unlocked')}
        </button>
        <button type="button" className={`rank-tab ${achTab === 'all' ? 'active' : ''}`} onClick={() => setAchTab('all')}>
          {t('achievements.tab.all')}
        </button>
      </div>

      {achTab === 'unlocked' && unlockedKeys.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--chalk-dim)', fontSize: 13, padding: '20px 0' }}>
          {t('achievements.empty')}
        </div>
      )}

      <div className="achievements-grid">
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = unlockedKeys.includes(ach.nameKey)

          if (achTab === 'unlocked' && !isUnlocked) return null

          let progressDisplay
          if (ach.category === 'RANK') {
            const currentRank = (stats.rank && stats.rank > 0) ? stats.rank : '---'
            progressDisplay = `${t('achievements.current')}: #${currentRank} / ${t('achievements.target')}: #${ach.targetValue}`
          } else {
            const currentProgress = getProgress(stats, ach.category)
            const displayProgress = Math.min(currentProgress, ach.targetValue)
            progressDisplay = `${displayProgress} / ${ach.targetValue}`
          }

          return (
            <div key={ach.id} className={`achievement-card ${!isUnlocked ? 'locked' : ''}`}>
              <div className="achievement-icon">{ach.icon}</div>
              <div className="achievement-name">{t(ach.nameKey)}</div>
              <div className="achievement-tooltip">
                <strong>{t(ach.nameKey)}</strong><br />
                <span>{t(ach.descKey)}</span>
                {!isUnlocked && (
                  <div className="achievement-progress">
                    {progressDisplay}
                  </div>
                )}
                {isUnlocked && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ color: 'var(--green)' }}>{t('achievements.unlocked_status')}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AchievementsPanel
