import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'

// Placeholder data — will be replaced with real API calls in future sprints
const availableRooms = [
  { code: 'ABC123', creator: 'renan', players: 2 },
  { code: 'XYZ789', creator: 'pedro', players: 4 },
]

function Profile() {
  const { user, loading, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function addFriend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!search) return
    setMessage(t('profile.friendRequestSent', { name: search }))
    setSearch('')
  }

  if (loading) {
    return (
      <main className="page center">
        <p>{t('profile.loading')}</p>
      </main>
    )
  }

  const displayName = user?.username ?? 'demo_user'
  const displayEmail = user?.email ?? 'demo@example.com'
  const displayRank = user?.rank ?? 0
  const displayPoints = user?.totalPoints ?? 0
  const displayGames = user?.gamesPlayed ?? 0
  const displayWins = user?.wins ?? 0

  // Friends list: real in future sprint, placeholder for now
  const friends = [
    { name: 'renan', online: true },
    { name: 'pedro', online: true },
    { name: 'carlos', online: false },
  ]

  return (
    <main className="page">
      <div className="row">
        <div className="avatar">{displayName.charAt(0).toUpperCase()}</div>
        <div>
          <h1>{displayName}</h1>
          <p>{displayEmail}</p>
        </div>
        {user && (
          <button
            id="logout-btn"
            type="button"
            onClick={handleLogout}
            style={{ marginLeft: 'auto' }}
          >
            {t('profile.signOut')}
          </button>
        )}
      </div>

      <div className="card">
        <h2>{t('profile.rankStats')}</h2>
        <p>
          {t('profile.rank')}: #{displayRank || '—'} · {t('profile.totalPoints')}: {displayPoints} · {t('profile.gamesPlayed')}: {displayGames} · {t('profile.wins')}: {displayWins}
        </p>
      </div>

      <div className="card">
        <h2>{t('profile.availableRooms')}</h2>
        <ul className="simple-list">
          {availableRooms.map((room) => (
            <li key={room.code}>
              <span>
                {t('profile.roomEntry', { code: room.code, creator: room.creator, count: room.players })}
              </span>
              <Link to="/game">{t('profile.joinRoom')}</Link>
            </li>
          ))}
        </ul>
        <button type="button">{t('profile.createRoom')}</button>
      </div>

      <div className="card">
        <h2>{t('profile.addFriend')}</h2>
        <form className="submit-row" onSubmit={addFriend}>
          <input
            placeholder={t('profile.searchByUsername')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">{t('profile.add')}</button>
        </form>
        {message && <p>{message}</p>}
      </div>

      <div className="card">
        <h2>{t('profile.friends')}</h2>
        <ul className="simple-list">
          {friends.map((friend) => (
            <li key={friend.name}>
              <span className="player-row">
                <span className="avatar avatar-small">
                  {friend.name.charAt(0).toUpperCase()}
                </span>
                {friend.name}
              </span>
              <span className={friend.online ? 'online' : 'offline'}>
                {friend.online ? t('profile.online') : t('profile.offline')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

export default Profile
