import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { useAuth } from '../hooks/useAuth'
import EditProfileModal from '../components/EditProfileModal'
import CreateRoomModal from '../components/CreateRoomModal'

const ROOMS = [
  { name: 'Sala do Carlos', meta: '3/6', lang: 'PT' },
  { name: 'sala-rapida-02', meta: '5/6', lang: 'EN' },
]

const INITIAL_FRIENDS = [
  { name: 'Renan', initial: 'R', online: true },
  { name: 'Pedro', initial: 'P', online: false },
  { name: 'Carlos', initial: 'C', online: true },
]

function Profile() {
  const { user, loading, logout, refresh } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [friends, setFriends] = useState(INITIAL_FRIENDS)
  const [editOpen, setEditOpen] = useState(false)
  const [roomOpen, setRoomOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function addFriend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!search) return
    setMessage(`Pedido enviado a ${search}`)
    setSearch('')
  }

  function removeFriend(name: string) {
    setFriends((current) => current.filter((f) => f.name !== name))
  }

  async function deleteAccount() {
    try {
      await fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/auth/account`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setConfirmingDelete(false)
      await logout()
      navigate('/', { replace: true })
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

  const displayName = user?.username ?? 'utilizador_demo'
  const displayEmail = user?.email ?? 'utilizador_demo@exemplo.com'
  const displayRank = user?.rank ?? 128
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
        <h3>{t('profile.rooms.heading')}</h3>
        {ROOMS.map((room) => (
          <div className="room-row" key={room.name}>
            <div>
              <div className="room-name">{room.name}</div>
              <div className="room-meta">
                {room.meta} <span>{t('profile.rooms.players')}</span> · {room.lang}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/game')}
            >
              {t('profile.rooms.enter')}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ marginTop: 14 }}
          onClick={() => setRoomOpen(true)}
        >
          {t('profile.rooms.create')}
        </button>
      </div>

      <div className="panel">
        <h3>{t('profile.addfriends.heading')}</h3>
        <form className="inline-add" onSubmit={addFriend}>
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
        {message && <p style={{ marginTop: 8 }}>{message}</p>}
      </div>

      <div className="panel">
        <h3>{t('profile.friends.heading')}</h3>
        {friends.map((friend) => (
          <div className="friend-row" key={friend.name}>
            <div className="who">
              <div className="mini-avatar">{friend.initial}</div>
              {friend.name}
            </div>
            <div>
              <span className="status">
                <span className={friend.online ? 'status-dot on' : 'status-dot off'}>
                  {friend.online ? '●' : '○'}
                </span>
                <span>
                  {friend.online ? t('profile.friends.online') : t('profile.friends.offline')}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => removeFriend(friend.name)}
              >
                {t('profile.friends.remove')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="panel panel-danger">
        <h3>{t('profile.danger.heading')}</h3>
        {!confirmingDelete ? (
          <div>
            <p className="danger-text">{t('profile.danger.text')}</p>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmingDelete(true)}
            >
              {t('profile.danger.delete')}
            </button>
          </div>
        ) : (
          <div>
            <p className="danger-confirm-text">{t('profile.danger.confirm')}</p>
            <div className="danger-actions">
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={deleteAccount}
              >
                {t('profile.danger.confirmyes')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmingDelete(false)}
              >
                {t('profile.danger.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {editOpen && (
        <EditProfileModal
          currentNickname={displayName}
          currentEmail={displayEmail}
          currentPhoto={user?.avatarUrl || null}
          onClose={() => setEditOpen(false)}
          onSave={() => {
            refresh()
          }}
        />
      )}
      <CreateRoomModal
        open={roomOpen}
        onClose={() => setRoomOpen(false)}
        onCreate={() => navigate('/game')}
      />
    </div>
  )
}

export default Profile
