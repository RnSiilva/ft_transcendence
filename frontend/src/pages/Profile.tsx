import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { useAuth } from '../hooks/useAuth'
import { getSocket } from '../socket'
import EditProfileModal from '../components/EditProfileModal'
import { useLeaderboard, type RankPeriod } from '../hooks/useLeaderboard'
import { useMatchHistory } from '../hooks/useMatchHistory'

const API = import.meta.env.VITE_API_URL ?? '/api'

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

function getProgress(u: any, category: string) {
  if (category === 'GAMES_PLAYED') return u.gamesPlayed || 0
  if (category === 'WINS') return u.wins || 0
  if (category === 'TOTAL_POINTS') return u.totalPoints || 0
  if (category === 'RANK') return u.rank || 0
  if (category === 'FRIENDS') return u.friendsCount || 0
  return 0
}
const RANK_PERIODS: RankPeriod[] = ['general', 'weekly', 'daily']

type FriendUser = {
  friendshipId: number
  id: number
  username: string
  avatarUrl: string | null
  rank: number
  totalPoints: number
  isOnline: boolean
  status: 'ACCEPTED' | 'SENT_PENDING' | 'RECEIVED_PENDING'
}

function Profile() {
  const { user, loading, logout, refresh } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [friendError, setFriendError] = useState('')
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [rankTab, setRankTab] = useState<RankPeriod>('general')
  const [achTab, setAchTab] = useState<'unlocked' | 'all'>('unlocked')
  const ranking = useLeaderboard(rankTab)
  const history = useMatchHistory()

  async function loadFriends() {
    try {
      const res = await fetch(`${API}/friends`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setFriends(data.friends || [])
      }
    } catch (err) {
      console.error('Failed to load friends:', err)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (user) {
      loadFriends()
      const socket = getSocket()
      socket.emit('presence:join', { userId: user.id })

      function onPresenceUpdate({ userId, isOnline }: { userId: number; isOnline: boolean }) {
        setFriends((prev) =>
          prev.map((f) => (f.id === userId ? { ...f, isOnline } : f))
        )
      }

      socket.on('presence:update', onPresenceUpdate)
      return () => {
        socket.off('presence:update', onPresenceUpdate)
      }
    }
  }, [user])

  async function handleLogout() {
    await logout()
    window.location.href = '/login'
  }

  async function addFriend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFriendError('')
    setSentTo('')
    const target = search.trim()
    if (!target) return

    try {
      const res = await fetch(`${API}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: target }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFriendError(data.error || t('errors.networkError'))
        return
      }
      setSentTo(target)
      setSearch('')
      loadFriends()
    } catch {
      setFriendError(t('errors.networkError'))
    }
  }

  async function removeFriend(id: number) {
    try {
      await fetch(`${API}/friends/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      loadFriends()
    } catch (err) {
      console.error('Failed to remove friend:', err)
    }
  }

  async function acceptRequest(requestId: number) {
    try {
      await fetch(`${API}/friends/accept/${requestId}`, {
        method: 'POST',
        credentials: 'include',
      })
      loadFriends()
    } catch (err) {
      console.error('Failed to accept friend request:', err)
    }
  }

  async function rejectRequest(requestId: number) {
    try {
      await fetch(`${API}/friends/reject/${requestId}`, {
        method: 'POST',
        credentials: 'include',
      })
      loadFriends()
    } catch (err) {
      console.error('Failed to reject friend request:', err)
    }
  }

  async function deleteAccount() {
    try {
      await fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/auth/account`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setConfirmingDelete(false)
      await logout()
      window.location.href = '/'
    } catch (err) {
      console.error('Failed to delete account', err)
    }
  }

  if (loading) {
    return (
      <div className="auth-loading" aria-label="Loading profile…">
        <div className="auth-spinner" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName = user.username
  const displayEmail = user.email
  const displayRank = user?.rank ?? 0
  const displayPoints = user?.totalPoints ?? 0
  const displayGames = user?.gamesPlayed ?? 0
  const displayWins = user?.wins ?? 0

  return (
    <div className="profile-wrap">
      <div className="profile-head">
        <div className="avatar-edit">
          <div className="avatar">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <button
            type="button"
            className="edit-btn"
            title={t('profile.editphoto')}
            onClick={() => setEditOpen(true)}
          >
            ✎
          </button>
        </div>
        <div className="who">
          <div className="name">{displayName}</div>
          <div className="email">{displayEmail}</div>
          {user && (
            <a
              className="pass-link"
              href="#"
              onClick={(e) => {
                e.preventDefault()
                handleLogout()
              }}
            >
              {t('nav.logout')}
            </a>
          )}
        </div>
      </div>

      <div className="panel">
        <h3>{t('profile.stats.heading')}</h3>
        <div className="stat-row">
          <div className="stat"><b>#{displayRank}</b><span>{t('profile.stats.rank')}</span></div>
          <div className="stat"><b>{displayPoints}</b><span>{t('profile.stats.points')}</span></div>
          <div className="stat"><b>{displayGames}</b><span>{t('profile.stats.matches')}</span></div>
          <div className="stat"><b>{displayWins}</b><span>{t('profile.stats.wins')}</span></div>
        </div>
      </div>

      <div className="panel">
        <h3>{t('achievements.title')}</h3>
        <div className="rank-tabs" style={{ marginBottom: 16 }}>
          <button className={`rank-tab ${achTab === 'unlocked' ? 'active' : ''}`} onClick={() => setAchTab('unlocked')}>
            {t('achievements.tab.unlocked')}
          </button>
          <button className={`rank-tab ${achTab === 'all' ? 'active' : ''}`} onClick={() => setAchTab('all')}>
            {t('achievements.tab.all')}
          </button>
        </div>
        
        {achTab === 'unlocked' && user.achievements?.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--chalk-dim)', fontSize: 13, padding: '20px 0' }}>
            {t('achievements.empty')}
          </div>
        )}

        <div className="achievements-grid">
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = user.achievements?.some((ua: any) => ua.achievement?.nameKey === ach.nameKey)
            
            if (achTab === 'unlocked' && !isUnlocked) return null;
            
            let progressDisplay
            if (ach.category === 'RANK') {
              const currentRank = (user.rank && user.rank > 0) ? user.rank : '---'
              progressDisplay = `${t('achievements.current')}: #${currentRank} / ${t('achievements.target')}: #${ach.targetValue}`
            } else {
              const currentProgress = getProgress(user, ach.category)
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

      <div className="panel">
        <h3>{t('rank.heading')}</h3>
        <div className="rank-tabs">
          {RANK_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              className={rankTab === period ? 'rank-tab active' : 'rank-tab'}
              onClick={() => setRankTab(period)}
            >
              {t(`rank.${period}`)}
            </button>
          ))}
        </div>
        <div className="rank-list">
          {ranking.map((row, i) => (
            <div className={`rank-row pos${i + 1}`} key={row.userId}>
              <span className="rank-medal">{i + 1}º</span>
              <div className="mini-avatar">{row.username.charAt(0).toUpperCase()}</div>
              <div className="rank-name">{row.username}</div>
              <div className="rank-pts">
                {row.points} <span>{t('rank.points')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>{t('history.heading')}</h3>
        {history.length === 0 && <p className="rooms-viewtext">{t('history.empty')}</p>}
        {history.map((game) => (
          <div className="room-row" key={game.finishedAt}>
            <div>
              <div className="room-name">{t(`room.cat.${(game.theme || '').toLowerCase()}`)}</div>
              <div className="room-meta">
                {new Date(game.finishedAt).toLocaleDateString()} · {game.rounds} {t('room.create.rounds')}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="status" style={{ marginRight: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={game.won ? 'status-dot on' : 'status-dot off'}>
                  {game.won ? '●' : '○'}
                </span>
                <span>{game.won ? t('history.win') : t('history.loss')}</span>
              </span>
              <span className="rank-pts">
                {game.points} <span>{t('rank.points')}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>{t('profile.rooms.heading')}</h3>
        <p className="rooms-viewtext">{t('profile.rooms.viewtext')}</p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/rooms')}
        >
          {t('profile.rooms.view')}
        </button>
      </div>

      <div className="panel">
        <h3>{t('profile.friends.heading')}</h3>
        {friends.length === 0 ? (
          <p style={{ opacity: 0.7 }}>{t('profile.friends.none')}</p>
        ) : (
          friends.map((friend) => (
            <div className="friend-row" key={friend.id}>
              <div className="who">
                <div className="mini-avatar">
                  {friend.avatarUrl ? (
                    <img
                      src={friend.avatarUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    friend.username.charAt(0).toUpperCase()
                  )}
                </div>
                <span>{friend.username}</span>
                {friend.status === 'SENT_PENDING' && (
                  <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 6 }}>
                    ({t('profile.friends.pending_sent')})
                  </span>
                )}
                {friend.status === 'RECEIVED_PENDING' && (
                  <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 6 }}>
                    ({t('profile.friends.pending_received')})
                  </span>
                )}
              </div>

              {friend.status === 'RECEIVED_PENDING' ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => acceptRequest(friend.friendshipId)}
                  >
                    {t('profile.friends.accept')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => rejectRequest(friend.friendshipId)}
                  >
                    {t('profile.friends.reject')}
                  </button>
                </div>
              ) : friend.status === 'SENT_PENDING' ? (
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeFriend(friend.id)}
                  >
                    {t('profile.friends.cancel')}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span className="status">
                    <span className={friend.isOnline ? 'status-dot on' : 'status-dot off'}>
                      {friend.isOnline ? '●' : '○'}
                    </span>
                    <span>
                      {friend.isOnline ? t('profile.friends.online') : t('profile.friends.offline')}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeFriend(friend.id)}
                  >
                    {t('profile.friends.remove')}
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        <form className="inline-add" onSubmit={addFriend} style={{ marginTop: 16 }}>
          <input
            type="text"
            placeholder={t('profile.addfriends.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            {t('profile.addfriends.add')}
          </button>
        </form>
        {sentTo && <p style={{ marginTop: 8, color: 'var(--green, #22c55e)' }}>{t('profile.addfriends.sent')} {sentTo}</p>}
        {friendError && <p style={{ marginTop: 8, color: 'var(--red, #ef4444)' }}>{friendError}</p>}
      </div>

      <div className="panel panel-danger">
        <h3>{t('profile.danger.heading')}</h3>
        <p className="danger-text">{t('profile.danger.text')}</p>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => setConfirmingDelete(true)}
        >
          {t('profile.danger.delete')}
        </button>
      </div>

      {/* caixa de aviso: exclusão definitiva de todos os dados */}
      {confirmingDelete && (
        <div className="modal-overlay show">
          <div className="modal-panel">
            <h2>{t('profile.danger.delete')}</h2>
            <p className="roomlang-text">{t('danger.modal.text')}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                {t('profile.danger.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={deleteAccount}
              >
                {t('roomlang.continue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <EditProfileModal
          currentNickname={displayName}
          currentEmail={displayEmail}
          currentPhoto={user?.avatarUrl || null}
          hasPassword={user?.hasPassword}
          onClose={() => setEditOpen(false)}
          onSave={() => {
            refresh()
          }}
        />
      )}
    </div>
  )
}

export default Profile
