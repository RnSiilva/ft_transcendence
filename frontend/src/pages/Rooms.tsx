import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { useAuth } from '../hooks/useAuth'
import CreateRoomModal, { type RoomSettings } from '../components/CreateRoomModal'
import SketchText from '../components/SketchText'
import RoomLanguageModal from '../components/RoomLanguageModal'
import RoomLobbyModal from '../components/RoomLobbyModal'
import { getSocket } from '../socket'
import type { Lang } from '../i18n/translations'

/**
 * Página própria das salas (o perfil só tem o botão para cá). A lista
 * atualiza-se sozinha, sem botão de refresh — TUDO vem do servidor, sem
 * dados simulados: 'rooms:list' com callback ao abrir + broadcast do mesmo
 * evento sempre que uma sala nasce, muda ou fecha; entrar/criar usam
 * 'room:join' e 'room:create' (backend/src/sockets/lobby.socket.js).
 */

type RoomInfo = { code: string; name: string; players: number; max: number; lang: Lang; locked?: boolean }

type LobbyState = { name: string; code: string; isAdmin: boolean; max: number }

function Rooms() {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const selfName = user?.username ?? ''

  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [lobby, setLobby] = useState<LobbyState | null>(null)
  const [pendingRoom, setPendingRoom] = useState<RoomInfo | null>(null)
  const [joinError, setJoinError] = useState(false)
  // Sala privada: pedir a senha antes do room:join (o servidor valida).
  const [passRoom, setPassRoom] = useState<RoomInfo | null>(null)
  const [passValue, setPassValue] = useState('')
  const [passError, setPassError] = useState(false)

  // Lista em tempo real: pedido inicial + broadcast do servidor. Só os
  // broadcasts não chegam: um telemóvel que adormece o separador perde-os e
  // fica com a lista congelada (salas mortas com "Entrar" a falhar). Por
  // isso a lista também se pede de novo ('rooms:list' com ack — consulta
  // pura, sem efeitos) de 4 em 4 s, na reconexão e ao voltar ao ecrã.
  useEffect(() => {
    const socket = getSocket()

    const refresh = () => {
      socket.emit('rooms:list', {}, (list: RoomInfo[]) => {
        if (Array.isArray(list)) setRooms(list)
      })
    }
    refresh()

    const onList = (list: RoomInfo[]) => {
      if (Array.isArray(list)) setRooms(list)
    }
    socket.on('rooms:list', onList)
    socket.on('connect', refresh)
    const timer = window.setInterval(refresh, 4000)
    const onVisible = () => {
      if (!document.hidden) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      socket.off('rooms:list', onList)
      socket.off('connect', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  function openLobby(room: RoomInfo, password?: string) {
    setJoinError(false)
    getSocket().emit(
      'room:join',
      { code: room.code, ...(password ? { password } : {}) },
      (answer: { ok: boolean; room?: { code: string }; code?: string }) => {
        if (answer?.ok && answer.room) {
          setPassRoom(null)
          setPassValue('')
          setPassError(false)
          setLobby({ name: room.name, code: answer.room.code, isAdmin: false, max: room.max })
        } else if (answer?.code === 'WRONG_PASSWORD') {
          // Senha errada (ou em falta): mostra/mantém o pedido de senha.
          setPassRoom(room)
          setPassError(Boolean(password))
        } else {
          setJoinError(true)
          // A entrada falhou porque a lista estava velha? Pede-a já de novo
          // para a sala morta desaparecer em vez de convidar a novo clique.
          getSocket().emit('rooms:list', {}, (list: RoomInfo[]) => {
            if (Array.isArray(list)) setRooms(list)
          })
        }
      },
    )
  }

  function enterRoom(room: RoomInfo) {
    // Sala noutro idioma: confirmar primeiro (as palavras serão nesse idioma).
    if (room.lang !== lang) {
      setPendingRoom(room)
      return
    }
    // Sala privada: pedir a senha antes de tentar entrar.
    if (room.locked) {
      setPassValue('')
      setPassError(false)
      setPassRoom(room)
      return
    }
    openLobby(room)
  }

  function createRoom(settings: RoomSettings) {
    setJoinError(false)
    getSocket().emit(
      'room:create',
      { settings },
      (answer: { ok: boolean; room?: { code: string } }) => {
        if (answer?.ok && answer.room) {
          // lobby:open põe a sala na lista pública e trava o motor de
          // rondas até o criador carregar em Iniciar.
          getSocket().emit('lobby:open')
          setLobby({ name: `Sala de ${selfName}`, code: answer.room.code, isAdmin: true, max: 6 })
        } else {
          setJoinError(true)
        }
      },
    )
  }

  function startMatch() {
    if (!lobby) return
    // O jogo abre a própria ligação e recupera o lugar pela conta
    // (reclaimSeat); a ligação partilhada sai para não ocupar 2 lugares.
    const code = lobby.code
    getSocket().disconnect()
    navigate(`/game?room=${code}`)
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
        <h1 className="rooms-title sketch-title left">
          <span className="sr-only">{t('rooms.title')}</span>
          <SketchText text={t('rooms.title')} />
          <span className="hero-logo-reflection" aria-hidden="true">
            <span className="reflect-flip">
              <SketchText text={t('rooms.title')} />
            </span>
            <span className="reflection-fade" />
          </span>
        </h1>
        <p className="rooms-live">
          <span className="live-dot" aria-hidden="true" />
          {t('rooms.live')}
        </p>
      </div>

      <div className="panel">
        {joinError && <p className="phc-error" style={{ marginBottom: 10 }}>{t('rooms.joinerror')}</p>}
        {rooms.length === 0 && <p className="roomlang-text">{t('rooms.empty')}</p>}
        {rooms.map((room) => (
          <div className="room-row" key={room.code}>
            <div>
              <div className="room-name">{room.locked ? '🔒 ' : ''}{room.name}</div>
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
        onCreate={createRoom}
      />

      {pendingRoom && (
        <RoomLanguageModal
          roomLang={pendingRoom.lang}
          onClose={() => setPendingRoom(null)}
          onConfirm={() => {
            const room = pendingRoom
            setPendingRoom(null)
            // Sala privada: depois de aceitar o idioma, ainda falta a senha.
            if (room.locked) {
              setPassValue('')
              setPassError(false)
              setPassRoom(room)
              return
            }
            openLobby(room)
          }}
        />
      )}

      {/* Sala privada: senha antes de entrar (validada no servidor). */}
      {passRoom && (
        <div className="modal-overlay show">
          <div className="modal-panel lobby-small">
            <h2>🔒 {passRoom.name}</h2>
            <p className="roomlang-text">{t('rooms.locked.text')}</p>
            <div className="field-dark">
              <label>{t('room.create.password')}</label>
              <input
                type="password"
                placeholder="••••••"
                value={passValue}
                autoFocus
                maxLength={32}
                onChange={(e) => setPassValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && passValue.trim()) openLobby(passRoom, passValue.trim())
                }}
              />
            </div>
            {passError && <p className="phc-error">{t('rooms.locked.wrong')}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setPassRoom(null)
                  setPassValue('')
                  setPassError(false)
                }}
              >
                {t('room.create.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!passValue.trim()}
                onClick={() => openLobby(passRoom, passValue.trim())}
              >
                {t('profile.rooms.enter')}
              </button>
            </div>
          </div>
        </div>
      )}

      {lobby && (
        <RoomLobbyModal
          roomName={lobby.name}
          code={lobby.code}
          isAdmin={lobby.isAdmin}
          maxPlayers={lobby.max}
          onClose={() => setLobby(null)}
          onStart={startMatch}
        />
      )}
    </div>
  )
}

export default Rooms
