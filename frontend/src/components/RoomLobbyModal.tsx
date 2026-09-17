import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import PlayerHoverCard from './PlayerHoverCard'
import { useAuth } from '../hooks/useAuth'
import { getSocket } from '../socket'

/**
 * Sala de espera (lobby) — 100% ligada ao servidor, sem dados simulados
 * (backend/src/sockets/lobby.socket.js):
 *  - jogadores reais por 'room:state'; criador marcado pelo creatorUserId
 *    do 'lobby:tick'; relógio dos 5 minutos contado no servidor;
 *  - fase da sala por 'lobby:phase' (aguardar jogadores / aguardar decisão
 *    do criador), calculada no servidor;
 *  - aviso 'lobby:ready' ao criador (som + notificação se estiver noutra
 *    página) com o modal iniciar-agora/esperar-1-minuto ('lobby:wait');
 *  - 'lobby:start' → 'room:start' a todos; 'lobby:kick'/'lobby:kicked';
 *    'lobby:close'/'lobby:closed'; 'lobby:expired' ao fim dos 5 minutos.
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

/* Três toques curtos, desenhados com WebAudio para não precisar de ficheiro
   de som. Toca quando o servidor manda o 'lobby:ready' ao criador. */
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
    /* sem áudio disponível: o modal visual continua a aparecer */
  }
}

/* Se o criador estiver noutro separador/página, avisa pelo sistema. */
function notifyAdmin(title: string, body: string) {
  if (!('Notification' in window) || !document.hidden) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

function RoomLobbyModal({ roomName, code, isAdmin, maxPlayers = 8, onClose, onStart }: Props) {
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

  // Trava o resync no INSTANTE do clique em Sair/expulsão/fecho — num ref
  // (e não numa variável do efeito) para o leaveRoom, que vive fora do
  // efeito, o poder acionar antes de o modal desmontar.
  const haltedRef = useRef(false)

  // O criador dá permissão de notificações logo ao abrir a sala, para o
  // aviso "já dá para começar" o encontrar mesmo estando noutra página.
  useEffect(() => {
    if (isAdmin && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [isAdmin])

  // Tudo o que se vê vem do servidor.
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

    // Depois de expulso/expirado/fechado/a começar/Sair, o resync PÁRA —
    // senão o expulso (ou quem saiu) voltava a entrar sozinho na sala.
    haltedRef.current = false

    /**
     * Autorreparação do lobby (bug dos telemóveis): pede a fotografia da
     * sala ao servidor. Se já não estivermos nela (o socket caiu enquanto o
     * ecrã esteve bloqueado e o servidor tirou-nos), tenta reentrar com o
     * código; se a sala já nem existir, mostra "sala terminada". Corre ao
     * montar (o room:state da entrada chega antes dos listeners e perdia-se),
     * na reconexão do socket e de 3 em 3 segundos — assim nenhum broadcast
     * perdido deixa um ecrã congelado.
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
          // O utilizador saiu/foi expulso ENQUANTO este pedido ia a caminho:
          // o servidor já nos meteu na sala outra vez — desfaz imediatamente,
          // senão fica um jogador fantasma na lista dos outros.
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
    // O servidor valida (só o criador, só com jogadores suficientes) e
    // emite 'room:start' a TODOS; o aviso aparece quando ele chegar.
    setDecisionOpen(false)
    getSocket().emit('lobby:start', {}, () => {})
  }

  function leaveRoom() {
    // Trava o resync JÁ: a partir deste clique nenhuma reentrada automática
    // pode acontecer, mesmo que haja um pedido a meio caminho.
    haltedRef.current = true
    const socket = getSocket()
    if (isAdmin) {
      // Se o servidor recusar o fecho (ex.: já não nos reconhece como
      // criador), ao menos sai da sala — o sweeper fecha-a aos restantes.
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

        {/* Fase calculada no servidor, igual para todos os ecrãs. */}
        <p className="lobby-phase">{t(`lobby.phase.${phase}`)}</p>

        <div className="lobby-list">
          {players.map((player) => (
            <div className="lobby-row" key={player.id}>
              <div className="mini-avatar">{player.name.charAt(0).toUpperCase()}</div>
              <div className="lobby-name">
                {/* Cartão no hover: stats + adicionar amigo (some se já forem) */}
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

      {/* Decisão do criador: iniciar já ou esperar mais 1 minuto. */}
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

      {/* Aviso a todos: a partida vai começar. */}
      {starting && (
        <div className="modal-overlay show lobby-inner">
          <div className="modal-panel lobby-small lobby-starting">
            <div className="lobby-starting-icon" aria-hidden="true">🎨</div>
            <h2>{t('lobby.starting')}</h2>
          </div>
        </div>
      )}

      {/* 5 minutos passados sem iniciar: a sala fecha. */}
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

      {/* Foste expulso da sala. */}
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
