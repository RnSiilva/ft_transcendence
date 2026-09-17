import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { demoStats } from '../utils/demoStats'
import AchievementsPanel from '../components/AchievementsPanel'
import { useLeaderboard, type LeaderboardEntry } from '../hooks/useLeaderboard'

const API = import.meta.env.VITE_API_URL ?? '/api'

/**
 * Perfil PÚBLICO de outro utilizador (/user/:username): só visualização.
 * Mostra apenas o que pode ser visto — avatar, username, estado online,
 * estatísticas, posição nos rankings geral/semanal/diário e as conquistas.
 * NUNCA mostra email nem dá ações de escrita.
 *
 * Dados REAIS para qualquer utilizador via GET /api/users/:username (rota
 * pública nossa: stats + conquistas); a API de amigos acrescenta o estado
 * online e a tag "já são amigos"; a posição nos rankings vem dos
 * leaderboards reais (— = fora do top).
 */

type FriendInfo = {
  username: string
  avatarUrl: string | null
  rank: number
  totalPoints: number
  gamesPlayed?: number
  wins?: number
  achievements?: { achievement?: { nameKey?: string } }[]
  isOnline?: boolean
  status?: string
}

/** Posição do utilizador num leaderboard, ou null se estiver fora do top. */
function positionOf(entries: LeaderboardEntry[], username: string) {
  return entries.find((e) => e.username === username)?.rank ?? null
}

function PublicProfile() {
  const { t } = useLanguage()
  const { username = '' } = useParams()
  const [info, setInfo] = useState<FriendInfo | null>(null)

  const general = useLeaderboard('general')
  const weekly = useLeaderboard('weekly')
  const daily = useLeaderboard('daily')

  // O React Router não repõe o scroll ao mudar de página: sem isto, abrir
  // um perfil a partir do ranking (que está a meio) começava a meio. Sobe
  // ao topo sempre que se abre outro utilizador.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [username])

  useEffect(() => {
    let alive = true

    // 1) Dados públicos reais de QUALQUER utilizador (stats + conquistas).
    fetch(`${API}/users/${encodeURIComponent(username)}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive || !data?.user) return
        setInfo((prev) => ({ ...(prev ?? {}), ...data.user }))
      })
      .catch(() => {
        /* sem dados reais: a página mostra os valores de exemplo */
      })

    // 2) A amizade acrescenta o estado online e a tag "já são amigos".
    fetch(`${API}/friends`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive || !data) return
        const hit = data.friends?.find((f: FriendInfo) => f.username === username)
        if (hit) {
          setInfo((prev) => ({ ...(prev ?? hit), isOnline: hit.isOnline, status: hit.status }))
        }
      })
      .catch(() => {})

    return () => {
      alive = false
    }
  }, [username])

  const demo = demoStats(username)
  const isFriend = info?.status === 'ACCEPTED'
  const positions: { label: string; pos: number | null }[] = [
    { label: t('rank.general'), pos: positionOf(general, username) },
    { label: t('rank.weekly'), pos: positionOf(weekly, username) },
    { label: t('rank.daily'), pos: positionOf(daily, username) },
  ]

  return (
    <div className="profile-wrap">
      <Link to="/profile" className="btn btn-ghost btn-sm rooms-back pub-back">
        ← {t('rooms.back')}
      </Link>

      <div className="profile-head">
        <div className="avatar-edit">
          <div className="avatar">
            {info?.avatarUrl ? (
              <img
                src={info.avatarUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              username.charAt(0).toUpperCase()
            )}
          </div>
        </div>
        <div className="who">
          <div className="name">{username}</div>
          <div className="pub-tags">
            {info?.isOnline !== undefined && (
              <span className="status">
                <span className={info.isOnline ? 'status-dot on' : 'status-dot off'}>
                  {info.isOnline ? '●' : '○'}
                </span>
                <span>
                  {info.isOnline ? t('profile.friends.online') : t('profile.friends.offline')}
                </span>
              </span>
            )}
            {isFriend && <span className="pub-friend-tag">✓ {t('card.friends')}</span>}
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>{t('profile.stats.heading')}</h3>
        <div className="stat-row">
          {/* rank 0 = ainda não jogou: mostra — em vez de um #0 sem sentido */}
          <div className="stat"><b>{(info?.rank ?? demo.rank) > 0 ? `#${info?.rank ?? demo.rank}` : '—'}</b><span>{t('profile.stats.rank')}</span></div>
          <div className="stat"><b>{info?.totalPoints ?? demo.points}</b><span>{t('profile.stats.points')}</span></div>
          <div className="stat"><b>{info?.gamesPlayed ?? demo.matches}</b><span>{t('profile.stats.matches')}</span></div>
          <div className="stat"><b>{info?.wins ?? demo.wins}</b><span>{t('profile.stats.wins')}</span></div>
        </div>
      </div>

      {/* Posição real nos três rankings; — significa fora do top. */}
      <div className="panel">
        <h3>{t('rank.heading')}</h3>
        <div className="stat-row">
          {positions.map((entry) => (
            <div className="stat" key={entry.label}>
              <b>{entry.pos !== null ? `#${entry.pos}` : '—'}</b>
              <span>{entry.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Conquistas reais (grelha completa por defeito) — para qualquer
          utilizador, via a rota pública. */}
      {info?.achievements && (
        <AchievementsPanel
          stats={{
            gamesPlayed: info.gamesPlayed,
            wins: info.wins,
            totalPoints: info.totalPoints,
            rank: info.rank,
          }}
          unlockedKeys={(info.achievements ?? [])
            .map((ua) => ua.achievement?.nameKey)
            .filter((k): k is string => Boolean(k))}
          defaultTab="all"
        />
      )}
    </div>
  )
}

export default PublicProfile
