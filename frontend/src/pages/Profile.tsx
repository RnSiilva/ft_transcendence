import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import EditProfileModal from '../components/EditProfileModal'
import CreateRoomModal from '../components/CreateRoomModal'

// AQUI O CODIGO DA BASE DE DADOS (dados reais do utilizador, estatísticas,
// salas e amigos vêm do backend; os valores abaixo são os do modelo aprovado)
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
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('utilizador_demo')
  const [photo, setPhoto] = useState<string | null>(null)
  const [friends, setFriends] = useState(INITIAL_FRIENDS)
  const [editOpen, setEditOpen] = useState(false)
  const [roomOpen, setRoomOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function removeFriend(name: string) {
    // AQUI O CODIGO DA BASE DE DADOS (remover amizade real)
    setFriends((current) => current.filter((f) => f.name !== name))
  }

  function deleteAccount() {
    // AQUI O CODIGO DA BASE DE DADOS (apagar conta e todos os dados — GDPR)
    setConfirmingDelete(false)
    navigate('/')
  }

  return (
    <div className="profile-wrap">
      <div className="profile-head">
        <div className="avatar-edit">
          <div className="avatar">
            {photo ? <img src={photo} alt="" /> : 'U'}
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
          <div className="name">{nickname}</div>
          <div className="email">utilizador_demo@exemplo.com</div>
          <a
            className="pass-link"
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setEditOpen(true)
            }}
          >
            {t('profile.changepass')}
          </a>
        </div>
      </div>

      <div className="panel">
        <h3>{t('profile.stats.heading')}</h3>
        <div className="stat-row">
          <div className="stat"><b>#128</b><span>{t('profile.stats.rank')}</span></div>
          <div className="stat"><b>3.420</b><span>{t('profile.stats.points')}</span></div>
          <div className="stat"><b>57</b><span>{t('profile.stats.matches')}</span></div>
          <div className="stat"><b>21</b><span>{t('profile.stats.wins')}</span></div>
        </div>
      </div>

      <div className="panel">
        <h3>{t('profile.rooms.heading')}</h3>
        {/* AQUI O CODIGO DO SERVIDOR (lista real de salas abertas via Socket.IO) */}
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
        {/* AQUI O CODIGO DA BASE DE DADOS (pesquisar utilizadores e enviar
            pedido de amizade real) */}
        <div className="inline-add">
          <input type="text" placeholder={t('profile.addfriends.placeholder')} />
          <button type="button" className="btn btn-primary btn-sm">
            {t('profile.addfriends.add')}
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>{t('profile.friends.heading')}</h3>
        {/* AQUI O CODIGO DA BASE DE DADOS + SERVIDOR (amigos reais e estado
            online via Socket.IO) */}
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
          currentNickname={nickname}
          currentPhoto={photo}
          onClose={() => setEditOpen(false)}
          onSave={(newNickname, newPhoto) => {
            setNickname(newNickname)
            setPhoto(newPhoto)
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
