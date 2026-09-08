import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import type { Lang } from '../i18n/translations'
import { useAuth } from '../hooks/useAuth'
import EditProfileModal from '../components/EditProfileModal'
import CreateRoomModal from '../components/CreateRoomModal'
import RoomLanguageModal from '../components/RoomLanguageModal'

const ROOMS: { name: string; meta: string; lang: Lang }[] = [
  { name: 'Sala do Carlos', meta: '3/6', lang: 'pt' },
  { name: 'sala-rapida-02', meta: '5/6', lang: 'en' },
]

const INITIAL_FRIENDS = [
  { name: 'Renan', initial: 'R', online: true },
  { name: 'Pedro', initial: 'P', online: false },
  { name: 'Carlos', initial: 'C', online: true },
]

function Profile() {
  const { user, loading, logout, refresh } = useAuth()
  const { t, lang } = useLanguage()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [friends, setFriends] = useState(INITIAL_FRIENDS)
  const [editOpen, setEditOpen] = useState(false)
  const [roomOpen, setRoomOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pendingRoomLang, setPendingRoomLang] = useState<Lang | null>(null)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function enterRoom(roomLang: Lang) {
    // Sala noutro idioma: avisar que as palavras serão nesse idioma e pedir
    // confirmação antes de entrar. No mesmo idioma, entra diretamente.
    if (roomLang !== lang) {
      setPendingRoomLang(roomLang)
      return
    }
    navigate('/game')
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
                {room.meta} <span>{t('profile.rooms.players')}</span> ·{' '}
                {room.lang.toUpperCase()}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => enterRoom(room.lang)}
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
      {pendingRoomLang && (
        <RoomLanguageModal
          roomLang={pendingRoomLang}
          onClose={() => setPendingRoomLang(null)}
          onConfirm={() => {
            setPendingRoomLang(null)
            navigate('/game')
          }}
        />
      )}
    </div>
  )
}

export default Profile
