import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import EditProfileModal from '../components/EditProfileModal'
import CreateRoomModal from '../components/CreateRoomModal'

const ROOMS = [
  { code: 'ABC123', creator: 'renan', players: 2, meta: '2/6', lang: 'PT' },
  { code: 'XYZ789', creator: 'pedro', players: 4, meta: '4/6', lang: 'EN' },
]

function Profile() {
  const { user, loading, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [roomOpen, setRoomOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const [friends, setFriends] = useState([
    { name: 'renan', initial: 'R', online: true },
    { name: 'pedro', initial: 'P', online: true },
    { name: 'carlos', initial: 'C', online: false },
  ])

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

  function removeFriend(name: string) {
    setFriends((current) => current.filter((f) => f.name !== name))
  }

  function deleteAccount() {
    setConfirmingDelete(false)
    navigate('/')
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

  return (
    <div className="profile-wrap">
      <div className="profile-head">
        <div className="avatar-edit">
          <div className="avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <button
            type="button"
            className="edit-btn"
            title="Edit Photo"
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
              {t('profile.signOut')}
            </a>
          )}
        </div>
      </div>

      <div className="panel">
        <h3>{t('profile.rankStats')}</h3>
        <div className="stat-row">
          <div className="stat"><b>#{displayRank || '—'}</b><span>{t('profile.rank')}</span></div>
          <div className="stat"><b>{displayPoints}</b><span>{t('profile.totalPoints')}</span></div>
          <div className="stat"><b>{displayGames}</b><span>{t('profile.gamesPlayed')}</span></div>
          <div className="stat"><b>{displayWins}</b><span>{t('profile.wins')}</span></div>
        </div>
      </div>

      <div className="panel">
        <h3>{t('profile.availableRooms')}</h3>
        {ROOMS.map((room) => (
          <div className="room-row" key={room.code}>
            <div>
              <div className="room-name">{t('profile.roomEntry', { code: room.code, creator: room.creator, count: room.players })}</div>
              <div className="room-meta">
                {room.meta} <span>Players</span> · {room.lang}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/game')}
            >
              {t('profile.joinRoom')}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ marginTop: 14 }}
          onClick={() => setRoomOpen(true)}
        >
          {t('profile.createRoom')}
        </button>
      </div>

      <div className="panel">
        <h3>{t('profile.addFriend')}</h3>
        <form className="inline-add" onSubmit={addFriend}>
          <input 
            type="text" 
            placeholder={t('profile.searchByUsername')} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            {t('profile.add')}
          </button>
        </form>
        {message && <p style={{ marginTop: 8 }}>{message}</p>}
      </div>

      <div className="panel">
        <h3>{t('profile.friends')}</h3>
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
                  {friend.online ? t('profile.online') : t('profile.offline')}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => removeFriend(friend.name)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="panel panel-danger">
        <h3>Danger Zone</h3>
        {!confirmingDelete ? (
          <div>
            <p className="danger-text">Delete account permanently.</p>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete Account
            </button>
          </div>
        ) : (
          <div>
            <p className="danger-confirm-text">Are you sure?</p>
            <div className="danger-actions">
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={deleteAccount}
              >
                Yes, delete
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {editOpen && (
        <EditProfileModal
          currentNickname={displayName}
          currentPhoto={null}
          onClose={() => setEditOpen(false)}
          onSave={(newNickname, newPhoto) => {
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
