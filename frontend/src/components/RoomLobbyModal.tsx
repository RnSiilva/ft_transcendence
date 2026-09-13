import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

/**
 * Sala de espera (lobby). Abre ao entrar numa sala ou ao criá-la.
 * Com 3+ jogadores o criador pode iniciar; a sala vive no máximo 5 minutos;
 * o criador é avisado com som (e notificação, se estiver noutra página) e
 * decide a cada minuto entre iniciar já ou esperar mais 1 minuto; o criador
 * pode expulsar e encerrar, qualquer jogador pode sair.
 *
 * O servidor deste circuito já existe: backend/src/sockets/lobby.socket.js
 * (eventos rooms:list, lobby:kick/kicked, lobby:tick, lobby:ready/wait,
 * lobby:start → room:start, lobby:close/closed, lobby:expired — o tempo é
 * contado lá, nunca no browser). O que está abaixo é a DEMO visual local;
 * ligar aos eventos reais é o próximo passo, dentro do Docker.
 */

const ROOM_LIFETIME = 5 * 60
const DEMO_JOINERS = ['Renan', 'Pedro', 'Ana', 'Rita']

type LobbyPlayer = { id: number; name: string; isAdmin: boolean }

type Props = {
  roomName: string
  isAdmin: boolean
  onClose: () => void
  onStart: () => void
}

/* Três toques curtos, desenhados com WebAudio para não precisar de ficheiro
   de som. É o aviso do criador quando o 3.º jogador entra. */
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

function RoomLobbyModal({ roomName, isAdmin, onClose, onStart }: Props) {
  const { t } = useLanguage()

  // Lista demo: o criador começa sozinho; quem entra vê o criador + ele.
  const [players, setPlayers] = useState<LobbyPlayer[]>(() =>
    isAdmin
      ? [{ id: 1, name: 'utilizador_demo', isAdmin: true }]
      : [
          { id: 1, name: 'Carlos', isAdmin: true },
          { id: 2, name: 'utilizador_demo', isAdmin: false },
        ],
  )
  const [secondsLeft, setSecondsLeft] = useState(ROOM_LIFETIME)
  const [decisionOpen, setDecisionOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [expired, setExpired] = useState(false)

  // Espelhos em ref para o relógio (interval) ler sempre o valor atual.
  const playersRef = useRef(players)
  const decisionRef = useRef(decisionOpen)
  const startingRef = useRef(starting)
  useEffect(() => {
    playersRef.current = players
    decisionRef.current = decisionOpen
    startingRef.current = starting
  })
  // Momento (em segundos restantes) em que o modal de decisão volta a abrir.
  const nextPromptAtRef = useRef<number | null>(ROOM_LIFETIME)

  // O criador dá permissão de notificações logo ao abrir a sala, para o
  // aviso "já tens 3" o encontrar mesmo estando noutra página.
  useEffect(() => {
    if (isAdmin && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [isAdmin])

  // DEMO: entra um jogador de vez em quando para se ver o fluxo completo.
  // AQUI O CODIGO DO SERVIDOR (substituir por 'room:state' do Socket.IO)
  useEffect(() => {
    let added = 0
    const joiner = setInterval(() => {
      if (added >= DEMO_JOINERS.length || startingRef.current) return
      const name = DEMO_JOINERS[added]
      added += 1
      setPlayers((current) =>
        current.length >= 6 || current.some((p) => p.name === name)
          ? current
          : [...current, { id: current.length + 1, name, isAdmin: false }],
      )
    }, 6000)
    return () => clearInterval(joiner)
  }, [])

  // Relógio da sala: 5 minutos no total, e é ele que decide quando o modal
  // de decisão (re)aparece ao criador — na 1.ª vez com 3 jogadores e depois
  // de minuto a minuto, como pedido.
  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (startingRef.current) return s
        const next = s - 1

        if (next <= 0) {
          setExpired(true)
          setDecisionOpen(false)
          return 0
        }

        const enough = playersRef.current.length >= 3
        const due =
          nextPromptAtRef.current !== null && next <= nextPromptAtRef.current
        if (isAdmin && enough && due && !decisionRef.current) {
          nextPromptAtRef.current = null // volta a agendar quando ele adiar
          setDecisionOpen(true)
          beep()
          notifyAdmin(t('lobby.ready.title'), t('lobby.ready.text'))
        }

        return next
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [isAdmin, t])

  function kick(id: number) {
    // AQUI O CODIGO DO SERVIDOR (emitir 'room:kick' com o id; o servidor
    // valida que quem pede é o criador e avisa o expulso)
    setPlayers((current) => current.filter((p) => p.id !== id))
  }

  function waitOneMinute() {
    setDecisionOpen(false)
    nextPromptAtRef.current = Math.max(secondsLeft - 60, 0)
  }

  function startGame() {
    // AQUI O CODIGO DO SERVIDOR (emitir 'room:start'; TODOS os jogadores da
    // sala recebem este aviso e são levados juntos para a partida)
    setDecisionOpen(false)
    setStarting(true)
    window.setTimeout(onStart, 2600)
  }

  const minutes = Math.floor(secondsLeft / 60)
  const secs = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="modal-overlay show">
      <div className="modal-panel lobby-panel">
        <h2>{roomName}</h2>

        <div className="lobby-top">
          <span className="lobby-count">
            {t('lobby.players')}: <b>{players.length}</b>/6
          </span>
          <span className={secondsLeft <= 60 ? 'lobby-timer danger' : 'lobby-timer'}>
            {t('lobby.timeleft')}: {minutes}:{secs}
          </span>
        </div>

        <div className="lobby-list">
          {players.map((player) => (
            <div className="lobby-row" key={player.id}>
              <div className="mini-avatar">{player.name.charAt(0).toUpperCase()}</div>
              <div className="lobby-name">
                {player.name}
                {player.isAdmin && <span className="lobby-admin-tag">{t('lobby.admin')}</span>}
              </div>
              {isAdmin && !player.isAdmin && (
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
              <button type="button" className="btn btn-danger" onClick={onClose}>
                {t('lobby.closeroom')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={players.length < 3}
                onClick={startGame}
              >
                {t('lobby.start')}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={onClose}>
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
    </div>
  )
}

export default RoomLobbyModal
