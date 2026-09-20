import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

import AchievementsPanel from '../components/AchievementsPanel'
import { useLeaderboard, type LeaderboardEntry } from '../hooks/useLeaderboard'

const API = import.meta.env.VITE_API_URL ?? '/api'

/**
 * PUBLIC profile of another user (/user/:username): view only.
 * Shows only what may be seen — avatar, username, online status, statistics,
 * position in the general/weekly/daily rankings and the achievements.
 * It NEVER shows the email nor offers any write actions.
 *
 * REAL data for any user via GET /api/users/:username (our public route:
 * stats + achievements); the friends API adds the online status and the
 * "already friends" tag; the ranking position comes from the real
 * leaderboards (— = outside the top).
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

/** The user's position in a leaderboard, or null if outside the top. */
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

  // React Router does not reset the scroll when changing pages: without this,
  // opening a profile from the ranking (which is scrolled down) would start
  // scrolled down. Scroll to the top whenever another user is opened.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [username])

  useEffect(() => {
    let alive = true

    // 1) Real public data for ANY user (stats + achievements).
    fetch(`${API}/users/${encodeURIComponent(username)}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive || !data?.user) return
        setInfo((prev) => ({ ...(prev ?? {}), ...data.user }))
      })
      .catch(() => {
        /* no real data */
      })

    // 2) Friendship adds the online status and the "already friends" tag.
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
          {/* rank 0 = has not played yet: show — instead of a meaningless #0 */}
          <div className="stat"><b>{(info?.rank ?? 0) > 0 ? `#${info?.rank ?? 0}` : '—'}</b><span>{t('profile.stats.rank')}</span></div>
          <div className="stat"><b>{info?.totalPoints ?? 0}</b><span>{t('profile.stats.points')}</span></div>
          <div className="stat"><b>{info?.gamesPlayed ?? 0}</b><span>{t('profile.stats.matches')}</span></div>
          <div className="stat"><b>{info?.wins ?? 0}</b><span>{t('profile.stats.wins')}</span></div>
        </div>
      </div>

      {/* Real position in the three rankings; — means outside the top. */}
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

      {/* Real achievements (full grid by default) — for any user, via the
          public route. */}
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
