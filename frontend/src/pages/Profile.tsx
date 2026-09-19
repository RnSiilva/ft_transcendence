import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { useAuth } from '../hooks/useAuth'
import { getSocket } from '../socket'
import EditProfileModal from '../components/EditProfileModal'
import AchievementsPanel from '../components/AchievementsPanel'
import PlayerHoverCard from '../components/PlayerHoverCard'
import { useLeaderboard, type RankPeriod } from '../hooks/useLeaderboard'
import { useMatchHistory } from '../hooks/useMatchHistory'
import { translateApiError } from '../utils/apiError'

// Base API URL: it was referenced by several fetch calls without ever being defined, which crashed the profile page.
const API = import.meta.env.VITE_API_URL ?? '/api'

const RANK_PERIODS: RankPeriod[] = ['general', 'weekly', 'daily']

type FriendUser = {
  friendshipId: number
  id: number
  username: string
  avatarUrl: string | null
  rank: number
  totalPoints: number
  isOnline: boolean
  gamesPlayed?: number
  wins?: number
  achievements?: { achievement?: { nameKey?: string } }[]
  status: 'ACCEPTED' | 'SENT_PENDING' | 'RECEIVED_PENDING'
}

function Profile() {
  const { user, loading, logout, refresh } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [sentTo, setSentTo] = useState('')
  // The "Request sent to X" confirmation clears itself after a few seconds.
  const sentTimerRef = useRef<number | null>(null)
  useEffect(() => () => {
    if (sentTimerRef.current) window.clearTimeout(sentTimerRef.current)
  }, [])
  const [friendError, setFriendError] = useState('')
  // Two-step friend search: first the user is SHOWN (via
  // GET /api/users/:username), then the request is sent.
  const [foundUser, setFoundUser] = useState<{
    username: string
    avatarUrl: string | null
    rank: number
    totalPoints: number
  } | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [rankTab, setRankTab] = useState<RankPeriod>('general')
  const ranking = useLeaderboard(rankTab)
  const history = useMatchHistory()

  // On opening the profile, revalidate the account: the server checks and unlocks
  // new achievements (checkAchievements runs on /auth/me).
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Bell over the photo: how many friend requests are awaiting a reply.
  const friendsPanelRef = useRef<HTMLHeadingElement | null>(null)
  const pendingRequests = friends.filter((f) => f.status === 'RECEIVED_PENDING').length

  // Loads the friends list. `alive` (optional) avoids updating state after the
  // component unmounts, when called from the effect.
  async function loadFriends(alive: () => boolean = () => true) {
    try {
      const res = await fetch(`${API}/friends`, { credentials: 'include' })
      if (!alive() || !res.ok) return
      const data = await res.json()
      if (alive()) setFriends(data.friends || [])
    } catch (err) {
      console.error('Failed to load friends:', err)
    }
  }

  useEffect(() => {
    if (!user) return
    // No synchronous setState in the effect body: loadFriends only updates the
    // state after the fetch's await, and the `alive` flag guards the unmount.
    let alive = true
    const isAlive = () => alive
    // Rule false positive: loadFriends only calls setState AFTER the fetch's
    // await (not synchronously in the effect) and the alive flag guards the
    // unmount. The rule does not follow the await through a shared named function.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFriends(isAlive)

    const socket = getSocket()
    socket.emit('presence:join', { userId: user.id })

    function onPresenceUpdate({ userId, isOnline }: { userId: number; isOnline: boolean }) {
      setFriends((prev) =>
        prev.map((f) => (f.id === userId ? { ...f, isOnline } : f))
      )
    }

    // The server notifies when the OTHER side changes the friendship (new
    // request, accepted, rejected, removed) — reloads the list without an F5.
    function onFriendsChanged() {
      void loadFriends(isAlive)
      // Re-check server-side achievements (e.g. "first friend") in real time,
      // so a newly unlocked badge shows without needing an F5.
      void refresh()
    }

    socket.on('presence:update', onPresenceUpdate)
    socket.on('friends:changed', onFriendsChanged)
    return () => {
      alive = false
      socket.off('presence:update', onPresenceUpdate)
      socket.off('friends:changed', onFriendsChanged)
    }
  }, [user, refresh])

  async function handleLogout() {
    await logout()
    window.location.href = '/login'
  }

  // Step 1: search — shows the user BEFORE sending the request
  // (GET /api/users/:username, the new public route).
  async function searchUser(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setFriendError('')
    setSentTo('')
    setFoundUser(null)
    setNotFound(false)
    const target = search.trim()
    if (!target) return

    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(target)}`, {
        credentials: 'include',
      })
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      if (!res.ok) {
        setFriendError(t('errors.networkError'))
        return
      }
      const data = await res.json()
      setFoundUser(data.user)
    } catch {
      setFriendError(t('errors.networkError'))
    }
  }

  // Step 2: send the request to the found user.
  async function sendRequestTo(username: string) {
    setFriendError('')
    try {
      const res = await fetch(`${API}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Backend message (English) → i18n key → site language.
        setFriendError(translateApiError(t, data.error))
        return
      }
      setSentTo(username)
      if (sentTimerRef.current) window.clearTimeout(sentTimerRef.current)
      sentTimerRef.current = window.setTimeout(() => setSentTo(''), 5000)
      setFoundUser(null)
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
          {pendingRequests > 0 && (
            <button
              type="button"
              className="friend-notif"
              title={t('profile.requests')}
              onClick={() =>
                friendsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              {pendingRequests}
            </button>
          )}
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
          {/* rank 0 = has not played yet: — instead of #0 */}
          <div className="stat"><b>{Number(displayRank) > 0 ? `#${displayRank}` : '—'}</b><span>{t('profile.stats.rank')}</span></div>
          <div className="stat"><b>{displayPoints}</b><span>{t('profile.stats.points')}</span></div>
          <div className="stat"><b>{displayGames}</b><span>{t('profile.stats.matches')}</span></div>
          <div className="stat"><b>{displayWins}</b><span>{t('profile.stats.wins')}</span></div>
        </div>
      </div>

      {/* Achievements (badges) — unlock validated on the server */}
      <AchievementsPanel
        stats={{ ...(user ?? {}), friendsCount: friends.filter((f) => f.status === 'ACCEPTED').length }}
        unlockedKeys={(user?.achievements ?? [])
          .map((ua) => ua.achievement?.nameKey)
          .filter((k): k is string => Boolean(k))}
      />

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
            // The row is no longer a button; the PlayerHoverCard handles clicks and hovers.
            <div
              className={`rank-row pos${i + 1}`}
              key={row.userId}
            >
              <span className="rank-medal">{i + 1}º</span>
              <div className="mini-avatar">
                {row.avatarUrl ? (
                  <img
                    src={row.avatarUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  row.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className="rank-name">
                <PlayerHoverCard
                  username={row.username}
                  to={row.username === user?.username ? '/profile' : `/user/${row.username}`}
                  avatarUrl={row.avatarUrl}
                  showActions={false}
                >
                  {row.username}
                </PlayerHoverCard>
              </div>
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
        {/* Up to ~8 rows visible; the rest is reached via the scrollbar
            (otherwise the profile of someone who played a lot would be huge). */}
        <div className={history.length > 8 ? 'scroll-list scrolls' : 'scroll-list'}>
        {history.map((game) => (
          <div className="room-row" key={game.finishedAt}>
            <div>
              <div className="room-name">{t(`room.cat.${(game.theme || '').toLowerCase()}`)}</div>
              <div className="room-meta">
                {new Date(game.finishedAt).toLocaleDateString()} {new Date(game.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' · '}{game.rounds} {t('room.create.rounds')}
                {game.opponents && game.opponents.length > 0 && (
                  <div style={{ marginTop: 4, fontStyle: 'italic', opacity: 0.8 }}>
                    vs: {game.opponents.map(o => o.username).join(', ')}
                  </div>
                )}
              </div>
            </div>
            <div>
              <span className="status">
                <span>{game.position <= 3 ? ['🥇', '🥈', '🥉'][game.position - 1] : '🏅'}</span>
                <span>{t('history.place')} #{game.position}/{game.players}</span>
              </span>
              <span className="rank-pts">
                {game.points} <span>{t('rank.points')}</span>
              </span>
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
        <h3 ref={friendsPanelRef}>{t('profile.friends.heading')}</h3>
        {friends.length === 0 ? (
          <p style={{ opacity: 0.7 }}>{t('profile.friends.none')}</p>
        ) : (
          // Up to ~8 friends visible; the rest via the scrollbar.
          <div className={friends.length > 8 ? 'scroll-list scrolls' : 'scroll-list'}>
          {friends.map((friend) => (
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
                {/* clicking the name navigates to the public profile (as
                    before); hovering shows the card with the rank, no buttons */}
                <PlayerHoverCard
                  username={friend.username}
                  showActions={false}
                  to={`/user/${friend.username}`}
                  stats={{ rank: friend.rank, points: friend.totalPoints, wins: friend.wins, matches: friend.gamesPlayed }}
                >
                  {friend.username}
                </PlayerHoverCard>
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
          ))}
          </div>
        )}

        <form className="inline-add" onSubmit={searchUser} style={{ marginTop: 16 }}>
          <input
            type="text"
            placeholder={t('profile.addfriends.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            {t('profile.addfriends.searchbtn')}
          </button>
        </form>

        {/* The found user appears BEFORE the request is sent. */}
        {foundUser && (
          <div className="friend-row found-user">
            <div className="who">
              <div className="mini-avatar">
                {foundUser.avatarUrl ? (
                  <img
                    src={foundUser.avatarUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  foundUser.username.charAt(0).toUpperCase()
                )}
              </div>
              <span>{foundUser.username}</span>
              <span className="found-user-meta">
                {foundUser.rank > 0 ? `#${foundUser.rank}` : '—'} · {foundUser.totalPoints} {t('rank.points')}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => sendRequestTo(foundUser.username)}
            >
              {t('profile.addfriends.add')}
            </button>
          </div>
        )}
        {notFound && <p style={{ marginTop: 8, color: 'var(--red, #ef4444)' }}>{t('profile.addfriends.notfound')}</p>}
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

      {/* warning box: permanent deletion of all data */}
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
