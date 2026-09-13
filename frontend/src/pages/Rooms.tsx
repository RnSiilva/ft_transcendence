import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import type { Lang } from '../i18n/translations'
import CreateRoomModal from '../components/CreateRoomModal'
import RoomLanguageModal from '../components/RoomLanguageModal'
import RoomLobbyModal from '../components/RoomLobbyModal'

/**
 * Página própria das salas (o perfil só tem o botão para cá). A lista
 * atualiza-se sozinha, sem botão de refresh.
 *
 * O servidor já existe: backend/src/sockets/lobby.socket.js responde a
 * 'rooms:list' ({ code, name, players, max, lang }) e reemite a lista a
 * todos sempre que uma sala nasce, muda ou fecha. Abaixo está a DEMO
 * visual local; ligar ao evento real é o próximo passo, dentro do Docker.
 */

type RoomInfo = { code: string; name: string; players: number; max: number; lang: Lang }

const DEMO_ROOMS: RoomInfo[] = [
  { code: 'CARL01', name: 'Sala do Carlos', players: 2, max: 6, lang: 'pt' },
  { code: 'FAST02', name: 'sala-rapida-02', players: 4, max: 6, lang: 'en' },
  { code: 'PINT03', name: 'los-pintores', players: 3, max: 6, lang: 'es' },
]

type LobbyState = { name: string; isAdmin: boolean }

function Rooms() {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()

  const [rooms, setRooms] = useState<RoomInfo[]>(DEMO_ROOMS)
  const [createOpen, setCreateOpen] = useState(false)
  const [lobby, setLobby] = useState<LobbyState | null>(null)
  const [pendingRoom, setPendingRoom] = useState<RoomInfo | null>(null)

  // DEMO da atualização automática: passado um bocado "alguém" cria uma
  // sala e ela aparece a todos. Substituir pelo evento real do servidor.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRooms((current) =>
        current.some((r) => r.code === 'RITA04')
          ? current
          : [...current, { code: 'RITA04', name: 'Sala da Rita', players: 1, max: 6, lang: 'pt' }],
      )
    }, 9000)
    return () => window.clearTimeout(timer)
  }, [])

  function enterRoom(room: RoomInfo) {
    // Sala noutro idioma: confirmar primeiro (as palavras serão nesse idioma).
    if (room.lang !== lang) {
      setPendingRoom(room)
      return
    }
    setLobby({ name: room.name, isAdmin: false })
  }

  return (
    <div className="profile-wrap rooms-wrap">
      <button
        type="button"
        className="btn btn-ghost btn-sm rooms-back"
        onClick={() => navigate('/profile')}
      >
        ← {t('rooms.back')}
      </button>
      <div className="rooms-head">
        <h1 className="rooms-title">{t('rooms.title')}</h1>
        <p className="rooms-live">
          <span className="live-dot" aria-hidden="true" />
          {t('rooms.live')}
        </p>
      </div>

      <div className="panel">
        {rooms.length === 0 && <p className="roomlang-text">{t('rooms.empty')}</p>}
        {rooms.map((room) => (
          <div className="room-row" key={room.code}>
            <div>
              <div className="room-name">{room.name}</div>
              <div className="room-meta">
                {room.players}/{room.max} <span>{t('profile.rooms.players')}</span> ·{' '}
                {room.lang.toUpperCase()}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => enterRoom(room)}
            >
              {t('profile.rooms.enter')}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ marginTop: 14 }}
          onClick={() => setCreateOpen(true)}
        >
          {t('profile.rooms.create')}
        </button>
      </div>

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={() => setLobby({ name: 'Sala de utilizador_demo', isAdmin: true })}
      />

      {pendingRoom && (
        <RoomLanguageModal
          roomLang={pendingRoom.lang}
          onClose={() => setPendingRoom(null)}
          onConfirm={() => {
            setLobby({ name: pendingRoom.name, isAdmin: false })
            setPendingRoom(null)
          }}
        />
      )}

      {lobby && (
        <RoomLobbyModal
          roomName={lobby.name}
          isAdmin={lobby.isAdmin}
          onClose={() => setLobby(null)}
          onStart={() => navigate('/game')}
        />
      )}
    </div>
  )
}

export default Rooms
