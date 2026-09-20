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
 * Dedicated rooms page (the profile only holds the button to reach it). The
 * list updates on its own, with no refresh button — EVERYTHING comes from the
 * server, with no simulated data: 'rooms:list' with a callback on open, plus a
 * broadcast of the same event whenever a room is created, changes or closes;
 * joining/creating use 'room:join' and 'room:create'
 * (backend/src/sockets/lobby.socket.js).
 */

type RoomInfo = { code: string; name: string; players: number; max: number; lang: Lang; locked?: boolean; started?: boolean }

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
  // Private room: ask for the password before room:join (the server validates).
  const [passRoom, setPassRoom] = useState<RoomInfo | null>(null)
  const [passValue, setPassValue] = useState('')
  const [passError, setPassError] = useState(false)

  // Real-time list: initial request + server broadcast. Broadcasts alone are
  // not enough: a phone that puts the tab to sleep misses them and is left with
  // a frozen list (dead rooms whose "Join" fails). So the list is also
  // re-requested ('rooms:list' with ack — a pure query, no side effects) every
  // 4 s, on reconnect, and when returning to the screen.
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

          if (room.started) {
            // The game page reclaims this seat using the room code. Disconnect
            // first so the lobby socket does not occupy a second seat.
            getSocket().disconnect()
            navigate(`/game?room=${answer.room.code}`)
            return
          }

          setLobby({ name: room.name, code: answer.room.code, isAdmin: false, max: room.max })
        } else if (answer?.code === 'WRONG_PASSWORD') {
          // Wrong (or missing) password: show/keep the password prompt.
          setPassRoom(room)
          setPassError(Boolean(password))
        } else {
          setJoinError(true)
          // Did the join fail because the list was stale? Re-request it now so
          // the dead room disappears instead of inviting another click.
          getSocket().emit('rooms:list', {}, (list: RoomInfo[]) => {
            if (Array.isArray(list)) setRooms(list)
          })
        }
      },
    )
  }

  function enterRoom(room: RoomInfo) {
    // Room in another language: confirm first (the words will be in that language).
    if (room.lang !== lang) {
      setPendingRoom(room)
      return
    }
    // Private room: ask for the password before attempting to join.
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
          // lobby:open adds the room to the public list and holds the round
          // engine until the creator clicks Start.
          getSocket().emit('lobby:open')
          setLobby({
            name: settings.name || `Sala de ${selfName}`,
            code: answer.room.code,
            isAdmin: true,
            max: settings.maxPlayers || 6
          })
        } else {
          setJoinError(true)
        }
      },
    )
  }

  function startMatch() {
    if (!lobby) return
    // The game opens its own connection and reclaims the seat by account
    // (reclaimSeat); the shared connection leaves so it does not take 2 seats.
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
                {room.started && (
                  <>
                    {' '}· <span className="phc-error" style={{ color: 'var(--blue)' }}>{t('rooms.alreadystarted')}</span>
                  </>
                )}
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
            // Private room: after accepting the language, the password is still needed.
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

      {/* Private room: password before joining (validated on the server). */}
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
