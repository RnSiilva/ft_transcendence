import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { useAuth } from '../hooks/useAuth'
import { getSocket } from '../socket'
import EditProfileModal from '../components/EditProfileModal'

const API = import.meta.env.VITE_API_URL ?? '/api'

const ROOMS: { name: string; meta: string; lang: Lang }[] = [
  { name: 'Sala do Carlos', meta: '3/6', lang: 'pt' },
  { name: 'sala-rapida-02', meta: '5/6', lang: 'en' },
]

// AQUI O CODIGO DO SERVIDOR (rankings: top 3 por pontos totais, da semana e
// do dia — consultas agregadas na base de dados; isto são dados de exemplo)
type RankPeriod = 'general' | 'weekly' | 'daily'
const RANKING: Record<RankPeriod, { name: string; pts: number }[]> = {
  general: [
    { name: 'garatuja_pro', pts: 4820 },
    { name: 'duck_master', pts: 4310 },
    { name: 'pixel_ninja', pts: 3990 },
  ],
  weekly: [
    { name: 'pixel_ninja', pts: 640 },
    { name: 'garatuja_pro', pts: 580 },
    { name: 'rabisco_rei', pts: 455 },
  ],
  daily: [
    { name: 'duck_master', pts: 180 },
    { name: 'rabisco_rei', pts: 140 },
    { name: 'garatuja_pro', pts: 120 },
  ],
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

  function enterRoom(roomLang: Lang) {
    if (roomLang !== lang) {
      setPendingRoomLang(roomLang)
      return
    }
    navigate('/game')
  }

  async function addFriend(e: FormEvent<HTMLFormElement>) {
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
          {RANKING[rankTab].map((row, i) => (
            <div className={`rank-row pos${i + 1}`} key={row.name}>
              <span className="rank-medal">{i + 1}º</span>
              <div className="mini-avatar">{row.name.charAt(0).toUpperCase()}</div>
              <div className="rank-name">{row.name}</div>
              <div className="rank-pts">
                {row.pts} <span>{t('rank.points')}</span>
              </div>
            </div>
          ))}
        </div>
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
                <div style={{ display: 'flex', gap: 8 }}>
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
                <div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeFriend(friend.id)}
                  >
                    {t('profile.friends.cancel')}
                  </button>
                </div>
              ) : (
                <div>
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
