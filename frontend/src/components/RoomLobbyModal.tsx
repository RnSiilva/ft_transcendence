import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import PlayerHoverCard from './PlayerHoverCard'
import { useAuth } from '../hooks/useAuth'
import { getSocket } from '../socket'

/**
 * Waiting room (lobby) — fully server-driven, with no mock data
 * (backend/src/sockets/lobby.socket.js):
 *  - real players via 'room:state'; the creator is flagged by the
 *    creatorUserId from 'lobby:tick'; the 5-minute clock is counted on the
 *    server;
 *  - room phase via 'lobby:phase' (waiting for players / waiting for the
 *    creator's decision), computed on the server;
 *  - 'lobby:ready' notice to the creator (sound + notification if they are on
 *    another page) with the start-now / wait-one-minute modal ('lobby:wait');
 *  - 'lobby:start' → 'room:start' to everyone; 'lobby:kick'/'lobby:kicked';
 *    'lobby:close'/'lobby:closed'; 'lobby:expired' after the 5 minutes.
 */

type LobbyPlayer = { id: string; name: string; isAdmin: boolean }
type LobbyPhase = 'waiting_players' | 'waiting_creator'

type Props = {
  roomName: string
  code: string
  isAdmin: boolean
  maxPlayers?: number
  onClose: () => void
  onStart: () => void
}

/* Three short beeps, drawn with WebAudio so no sound file is needed.
   Plays when the server sends 'lobby:ready' to the creator. */
function beep() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.22, 0.44].forEach((at) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.001, ctx.currentTime + at)
      gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + at)
      osc.stop(ctx.currentTime + at + 0.18)
    })
  } catch {
    /* no audio available: the visual modal still appears */
  }
}

/* If the creator is on another tab/page, notify them via the system. */
function notifyAdmin(title: string, body: string) {
  if (!('Notification' in window) || !document.hidden) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

function RoomLobbyModal({ roomName, code, isAdmin, maxPlayers = 6, onClose, onStart }: Props) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const selfName = user?.username ?? ''

  const [players, setPlayers] = useState<LobbyPlayer[]>([])
  const [phase, setPhase] = useState<LobbyPhase>('waiting_players')
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [decisionOpen, setDecisionOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [expired, setExpired] = useState(false)
  const [kicked, setKicked] = useState(false)

  // Halt the resync at the INSTANT of clicking Leave/kick/close — in a ref
  // (and not in an effect variable) so leaveRoom, which lives outside the
  // effect, can trigger it before the modal unmounts.
  const haltedRef = useRef(false)

  // The creator grants notification permission as soon as the room opens, so
  // the "ready to start" notice reaches them even on another page.
  useEffect(() => {
    if (isAdmin && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [isAdmin])

  // Everything shown comes from the server.
  useEffect(() => {
    const socket = getSocket()

    type Member = { id: string; userId: number; name: string }
    type SyncAnswer = {
      ok: boolean
      room?: { members: Member[] }
      phase?: LobbyPhase
      creatorUserId?: number
    }
    let creatorUserId: number | null = null
    let members: Member[] = []

    function publish() {
      setPlayers(
        members.map((m) => ({
          id: m.id,
          name: m.name,
          isAdmin: creatorUserId !== null && m.userId === creatorUserId,
        })),
      )
    }

    function onRoomState(state: { members: Member[] }) {
      members = state.members
      publish()
    }
    function onTick(payload: { secondsLeft: number; creatorUserId?: number }) {
      setSecondsLeft(payload.secondsLeft)
      if (payload.creatorUserId !== undefined && payload.creatorUserId !== creatorUserId) {
        creatorUserId = payload.creatorUserId
        publish()
      }
    }
    function onPhase(payload: { phase: LobbyPhase }) {
      setPhase(payload.phase)
    }
    function onReady() {
      setDecisionOpen(true)
      beep()
      notifyAdmin(t('lobby.ready.title'), t('lobby.ready.text'))
    }
    function onStartEvent() {
      haltedRef.current = true
      setDecisionOpen(false)
      setStarting(true)
      window.setTimeout(onStart, 2600)
    }
    function onExpired() {
      haltedRef.current = true
      setDecisionOpen(false)
      setExpired(true)
    }
    function onClosed() {
      haltedRef.current = true
      onClose()
    }
    function onKicked() {
      haltedRef.current = true
      setKicked(true)
    }

    // After being kicked/expired/closed/starting/leaving, the resync STOPS —
    // otherwise the kicked user (or whoever left) would rejoin the room alone.
    haltedRef.current = false

    /**
     * Lobby self-repair (mobile bug): requests the room snapshot from the
     * server. If we are no longer in it (the socket dropped while the screen
     * was locked and the server removed us), it tries to rejoin with the
     * code; if the room no longer exists, it shows "room ended". Runs on
     * mount (the room:state on entry arrives before the listeners and was
     * lost), on socket reconnection and every 3 seconds — so no missed
     * broadcast leaves a frozen screen.
     */
    function resync() {
      if (haltedRef.current) return
      socket.emit('lobby:sync', {}, (answer: SyncAnswer) => {
        if (haltedRef.current) return
        if (answer?.ok && answer.room) {
          members = answer.room.members
          if (answer.creatorUserId !== undefined) creatorUserId = answer.creatorUserId
          publish()
          if (answer.phase) setPhase(answer.phase)
          return
        }
        socket.emit('room:join', { code }, (join: { ok: boolean }) => {
          // The user left/was kicked WHILE this request was in flight: the
          // server has put us back in the room — undo it immediately,
          // otherwise a ghost player stays in the others' list.
          if (haltedRef.current) {
            if (join?.ok) socket.emit('room:leave')
            return
          }
          if (join?.ok) {
            resync()
          } else {
            haltedRef.current = true
            setExpired(true)
          }
        })
      })
    }
    resync()
    const resyncTimer = window.setInterval(resync, 3000)

    socket.on('connect', resync)
    socket.on('room:state', onRoomState)
    socket.on('lobby:tick', onTick)
    socket.on('lobby:phase', onPhase)
    socket.on('lobby:ready', onReady)
    socket.on('room:start', onStartEvent)
    socket.on('lobby:expired', onExpired)
    socket.on('lobby:closed', onClosed)
    socket.on('lobby:kicked', onKicked)
    return () => {
      haltedRef.current = true
      window.clearInterval(resyncTimer)
      socket.off('connect', resync)
      socket.off('room:state', onRoomState)
      socket.off('lobby:tick', onTick)
      socket.off('lobby:phase', onPhase)
      socket.off('lobby:ready', onReady)
      socket.off('room:start', onStartEvent)
      socket.off('lobby:expired', onExpired)
      socket.off('lobby:closed', onClosed)
      socket.off('lobby:kicked', onKicked)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  function kick(id: string) {
    getSocket().emit('lobby:kick', { memberId: id })
  }

  function waitOneMinute() {
    setDecisionOpen(false)
    getSocket().emit('lobby:wait')
  }

  function startGame() {
    // The server validates (creator only, enough players only) and emits
    // 'room:start' to EVERYONE; the notice appears when it arrives.
    setDecisionOpen(false)
    getSocket().emit('lobby:start', {}, () => {})
  }

  function leaveRoom() {
    // Halt the resync NOW: from this click on, no automatic rejoin can
    // happen, even if a request is in flight.
    haltedRef.current = true
    const socket = getSocket()
    if (isAdmin) {
      // If the server refuses the close (e.g. it no longer recognizes us as
      // creator), at least leave the room — the sweeper closes it for the rest.
      socket.emit('lobby:close', {}, (answer?: { ok: boolean }) => {
        if (!answer?.ok) socket.emit('room:leave')
      })
    } else {
      socket.emit('room:leave')
    }
    onClose()
  }

  const minutes = secondsLeft === null ? '–' : Math.floor(secondsLeft / 60)
  const secs = secondsLeft === null ? '––' : String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="modal-overlay show">
      <div className="modal-panel lobby-panel">
        <h2>{roomName}</h2>

        <div className="lobby-top">
          <span className="lobby-count">
            {t('lobby.players')}: <b>{players.length}</b>/{maxPlayers}
          </span>
          <span className={secondsLeft !== null && secondsLeft <= 60 ? 'lobby-timer danger' : 'lobby-timer'}>
            {t('lobby.timeleft')}: {minutes}:{secs}
          </span>
        </div>

        {/* Phase computed on the server, the same for every screen. */}
        <p className="lobby-phase">{t(`lobby.phase.${phase}`)}</p>

        <div className="lobby-list">
          {players.map((player) => (
            <div className="lobby-row" key={player.id}>
              <div className="mini-avatar">{player.name.charAt(0).toUpperCase()}</div>
              <div className="lobby-name">
                {/* Hover card: stats + add friend (hidden if already friends) */}
                <PlayerHoverCard username={player.name} isSelf={player.name === selfName}>
                  {player.name}
                </PlayerHoverCard>
                {player.isAdmin && <span className="lobby-admin-tag">{t('lobby.admin')}</span>}
              </div>
              {isAdmin && !player.isAdmin && player.name !== selfName && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm lobby-kick"
                  onClick={() => kick(player.id)}
                >
                  {t('lobby.kick')}
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="roomlang-text lobby-rules">
          {t('lobby.rules1')}
          <br />
          {t('lobby.rules2')}
        </p>

        <div className="modal-actions">
          {isAdmin ? (
            <>
              <button type="button" className="btn btn-danger" onClick={leaveRoom}>
                {t('lobby.closeroom')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={phase !== 'waiting_creator'}
                onClick={startGame}
              >
                {t('lobby.start')}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={leaveRoom}>
              {t('lobby.leave')}
            </button>
          )}
        </div>
      </div>

      {/* Creator's decision: start now or wait one more minute. */}
      {decisionOpen && !starting && !expired && (
        <div className="modal-overlay show lobby-inner">
          <div className="modal-panel lobby-small">
            <h2>{t('lobby.ready.title')}</h2>
            <p className="roomlang-text">{t('lobby.ready.text')}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={waitOneMinute}>
                {t('lobby.wait')}
              </button>
              <button type="button" className="btn btn-primary" onClick={startGame}>
                {t('lobby.startnow')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice to everyone: the match is about to start. */}
      {starting && (
        <div className="modal-overlay show lobby-inner">
          <div className="modal-panel lobby-small lobby-starting">
            <div className="lobby-starting-icon" aria-hidden="true">🎨</div>
            <h2>{t('lobby.starting')}</h2>
          </div>
        </div>
      )}

      {/* 5 minutes passed without starting: the room closes. */}
      {expired && !starting && (
        <div className="modal-overlay show lobby-inner">
          <div className="modal-panel lobby-small">
            <h2>{t('rooms.title')}</h2>
            <p className="roomlang-text">{t('lobby.expired')}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                {t('endgame.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* You were kicked from the room. */}
      {kicked && !starting && (
        <div className="modal-overlay show lobby-inner">
          <div className="modal-panel lobby-small">
            <h2>{roomName}</h2>
            <p className="roomlang-text">🚩 {t('lobby.kicked')}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                {t('endgame.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomLobbyModal
