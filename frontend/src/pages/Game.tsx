import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import EndGameOverlay, { type FinalScore } from '../components/EndGameOverlay'
import PlayerHoverCard from '../components/PlayerHoverCard'
import { useAuth } from '../hooks/useAuth'
import { useGameSocket } from '../hooks/useGameSocket'

const COLORS = ['#15161B', '#FF4B3E', '#3EC1D3', '#FFC93C', '#6BCB77']

type Acerto = { word: string; place: number; points: number; turnKey: string }


// Correct-guess confetti: ~80 little pieces in the project colours, each with
// a random position, delay, size and rotation (pure CSS, no library).
const CONFETTI_COLORS = ['#FF4B3E', '#3EC1D3', '#FFC93C', '#6BCB77', '#F5F3EE']

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 80 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2.1 + Math.random() * 1.5,
      size: 6 + Math.random() * 7,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      tilt: Math.random() * 360,
      sway: (Math.random() - 0.5) * 220,
    })),
  )
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece, i) => (
        <span
          key={i}
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 0.45,
            background: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ['--sway' as string]: `${piece.sway}px`,
            ['--tilt' as string]: `${piece.tilt}deg`,
          }}
        />
      ))}
    </div>
  )
}

/** Correct-guess trophy: gold for 1st, silver for 2nd, bronze from 3rd on. */
function Trophy({ place }: { place: number }) {
  const colors = ['#FFD24A', '#C7CCD6', '#D08A4E']
  const fill = colors[Math.min(place - 1, 2)]
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill={fill} aria-hidden="true">
      <path d="M5 3h14v2h3v3c0 2.8-2.2 5-5 5h-.3A6 6 0 0 1 13 16.9V19h3v2H8v-2h3v-2.1A6 6 0 0 1 7.3 13H7c-2.8 0-5-2.2-5-5V5h3V3zm-1 4v1c0 1.7 1.3 3 3 3V7H4zm16 0h-3v4c1.7 0 3-1.3 3-3V7z" />
    </svg>
  )
}

function Game() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  // Real identity of the session: the name/points come from the authenticated account.
  const { user } = useAuth()
  const selfName = user?.username ?? ''
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const drawingRef = useRef(false)
  const colorRef = useRef(COLORS[0])
  const [activeColor, setActiveColor] = useState(COLORS[0])
  const [chatText, setChatText] = useState('')
  const [endgameClosed, setEndgameClosed] = useState(false)
  // Final podium is frozen when the game ends, so it stays fixed even as
  // players close the overlay and leave (no live re-ranking).
  const [frozenScores, setFrozenScores] = useState<FinalScore[] | null>(null)

  // If we arrived without ?room= but there is a recent room, restore it in the
  // URL BEFORE the socket connects: the server holds the seat for 15 s (reclaimSeat)
  // and draw:history restores the drawing, so an accidental exit loses nothing.
  useState(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.get('room')) {
      const last = sessionStorage.getItem('sg-room')
      if (last) {
        url.searchParams.set('room', last)
        window.history.replaceState({}, '', url)
      }
    }
    return null
  })

  // Server-side room engine: who is in the room, who holds the pencil, and
  // the transport for strokes. Kept in a ref so the canvas listeners below
  // can read the latest value without being torn down and rebuilt.
  const game = useGameSocket(canvasRef)
  const gameRef = useRef(game)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    gameRef.current = game
  })

  useEffect(() => {
    if (game.code) sessionStorage.setItem('sg-room', game.code)
  }, [game.code])

  // ---- drawing turn: decided by the server, no test buttons ----
  const isMe = game.isDrawer
  const isMeRef = useRef(isMe)
  useEffect(() => {
    isMeRef.current = isMe
  })

  // Visual countdown of the 10 s to choose the word (the server is in charge:
  // if it reaches zero, it picks the first word for you).
  // The {src,left} pair ties the countdown to THIS offer: until the clock
  // ticks, it shows the announced seconds — no synchronous setState in the effect.
  const [choiceTick, setChoiceTick] = useState<{ src: unknown; left: number } | null>(null)
  useEffect(() => {
    const offer = game.choices
    if (!offer) return
    const end = Date.now() + offer.seconds * 1000
    const tick = setInterval(() => {
      setChoiceTick({ src: offer, left: Math.max(0, Math.ceil((end - Date.now()) / 1000)) })
    }, 250)
    return () => clearInterval(tick)
  }, [game.choices])
  const choiceLeft = game.choices
    ? (choiceTick && choiceTick.src === game.choices ? choiceTick.left : game.choices.seconds)
    : 0

  // ---- real correct guess: server's 'round:correct' + what I typed ----
  // The server never sends the word on a correct guess (that would hand it to
  // the others); the one shown in MY banner is the one I typed myself.
  const [acerto, setAcerto] = useState<Acerto | null>(null)
  const [confettiAt, setConfettiAt] = useState<number | null>(null)
  const lastGuessRef = useRef('')
  // Identifies the current turn; the banner only lives within the turn it was born in.
  const turnKey = game.round ? `${game.round.round}-${game.round.turn}` : ''
  const seenCorrectRef = useRef(0)

  const [correctPlayers, setCorrectPlayers] = useState<{ turnKey: string; names: Set<string> }>({
    turnKey: '',
    names: new Set(),
  })

  useEffect(() => {
    const hit = game.lastCorrect
    if (!hit || hit.at === seenCorrectRef.current) return
    seenCorrectRef.current = hit.at

    setCorrectPlayers((prev) => {
      const names = prev.turnKey === turnKey ? new Set(prev.names) : new Set<string>()
      names.add(hit.name)
      return { turnKey, names }
    })

    if (hit.name !== selfName) return
    setAcerto({
      word: lastGuessRef.current.toUpperCase(),
      place: hit.position,
      points: hit.points,
      turnKey,
    })
    const burst = hit.at
    setConfettiAt(burst)
    const timer = window.setTimeout(() => {
      setConfettiAt((current) => (current === burst ? null : current))
    }, 3800)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastCorrect, selfName])

  // Derived: the banner disappears on its own when the next turn starts.
  const acertoVisible = acerto && acerto.turnKey === turnKey ? acerto : null

  // ---- exit modals ----
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [pendingNav, setPendingNav] = useState<string | null>(null)

  // ---- fullscreen board (mobile, while it is your turn to draw) ----
  const [fullscreen, setFullscreen] = useState(false)

  // ---- scoreboard collapsed on mobile (self only; tap shows everyone) --
  const [scoreOpen, setScoreOpen] = useState(false)

  // ---- report a player ----
  // The vote lives on the server: it counts 1 vote per player, needs MORE than
  // half, and expels the player as if they had left, losing their points.
  const [reportOpen, setReportOpen] = useState(false)

  // The time comes from the server: every player in the room sees the same
  // number, and no one gains seconds for having a slower page.
  const seconds = game.round?.secondsLeft ?? 0

  // Derived rather than stored: the end-game screen appears because the server
  // says it is over, and disappears because the player closed it.
  const finished = game.round?.phase === 'finished'
  const endgameOpen = finished && !endgameClosed

  // Freeze the final scores once the game ends, so the podium stays fixed even
  // as players close the overlay and leave the room (no live re-ranking).
  useEffect(() => {
    if (!finished) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFrozenScores((prev) => (prev ? null : prev))
      return
    }
    const snap = game.round?.scores?.map((s) => ({
      name: s.name,
      points: s.points,
      avatarUrl: s.avatarUrl,
    })) ?? []
    if (!snap.length) return
    setFrozenScores((prev) => prev ?? snap)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    function fitCanvas() {
      if (!canvas || !ctx) return
      // Same size as now: nothing to do. On mobile the browser fires 'resize'
      // constantly (address bar, keyboard) and each refit wipes the board and
      // repaints the whole history — that was what made fullscreen drawing
      // extremely slow.
      const size = canvas.getBoundingClientRect()
      if (canvas.width === Math.round(size.width * 2) && canvas.height === Math.round(size.height * 2)) {
        return
      }
      // Changing width/height WIPES the canvas: before that, the current drawing
      // is copied to a temporary canvas and painted back at scale.
      const prev = document.createElement('canvas')
      prev.width = canvas.width
      prev.height = canvas.height
      if (prev.width > 0 && prev.height > 0) {
        prev.getContext('2d')?.drawImage(canvas, 0, 0)
      }

      const rect = size
      canvas.width = Math.round(rect.width * 2)
      canvas.height = Math.round(rect.height * 2)
      ctx.scale(2, 2)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 4
      // Resizing a canvas wipes it, so the drawing has to be fetched again.
      gameRef.current.repaint()
    }
    fitCanvas()

    function pos(e: MouseEvent | TouchEvent) {
      const rect = canvas!.getBoundingClientRect()
      const point = 'touches' in e ? e.touches[0] : e
      return { x: point.clientX - rect.left, y: point.clientY - rect.top }
    }
    function start(e: MouseEvent | TouchEvent) {
      // Only the current drawer may use the board. The server rejects
      // strokes from anyone else too — this just avoids the dead cursor.
      if (!gameRef.current.isDrawer && !isMeRef.current) return
      if (gameRef.current.round?.phase !== 'drawing') return
      drawingRef.current = true
      lastPointRef.current = pos(e)
    }
    function move(e: MouseEvent | TouchEvent) {
      if (!drawingRef.current) return
      if (gameRef.current.round?.phase !== 'drawing') return
      const p = pos(e)
      const from = lastPointRef.current
      ctx!.strokeStyle = colorRef.current
      // ONE segment per event. Before, lineTo accumulated the whole stroke into
      // a single path and each stroke() redrew EVERYTHING from the start — O(n²):
      // this was what stalled drawing on mobile (worse in fullscreen).
      ctx!.beginPath()
      ctx!.moveTo((from ?? p).x, (from ?? p).y)
      ctx!.lineTo(p.x, p.y)
      ctx!.stroke()

      // Normalised to 0..1 so windows of different sizes stay in sync.
      const rect = canvas!.getBoundingClientRect()
      if (from) {
        gameRef.current.sendStroke({
          x0: from.x / rect.width,
          y0: from.y / rect.height,
          x1: p.x / rect.width,
          y1: p.y / rect.height,
          colour: colorRef.current,
        })
      }
      lastPointRef.current = p

      e.preventDefault()
    }
    function end() {
      drawingRef.current = false
    }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    canvas.addEventListener('touchstart', start)
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end)
    // Refit debounce: bursts of 'resize' (typical on mobile) do ONE adjustment
    // at the end, instead of wiping+repainting the board dozens of times.
    let fitTimer: number | null = null
    function scheduleFit() {
      if (fitTimer !== null) window.clearTimeout(fitTimer)
      fitTimer = window.setTimeout(() => {
        fitTimer = null
        fitCanvas()
      }, 150)
    }
    window.addEventListener('resize', scheduleFit)
    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', end)
      window.removeEventListener('resize', scheduleFit)
      if (fitTimer !== null) window.clearTimeout(fitTimer)
    }
  }, [])

  // Switching between drawing/guessing or entering/leaving fullscreen changes
  // the board size: refit the canvas (fitCanvas preserves the drawing).
  useEffect(() => {
    window.dispatchEvent(new Event('resize'))
  }, [isMe, fullscreen])

  // Leaving the page = leaving the room: a browser warning on close/reload and
  // our own modal when clicking any internal link.
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest?.('a[href]')
      if (!link) return
      const href = link.getAttribute('href') || ''
      if (!href.startsWith('/') || href.startsWith('/game')) return
      e.preventDefault()
      e.stopPropagation()
      setPendingNav(href)
    }
    window.addEventListener('beforeunload', before)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', before)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  useEffect(() => {
    const log = chatLogRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [game.messages.length])

  function selectColor(color: string) {
    colorRef.current = color
    setActiveColor(color)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    game.sendClear()
  }

  // A single field serves both chatting and guessing: the SERVER compares the
  // message with the secret word and decides what it was ('round:correct' with
  // name/points/position). The drawer does not type: the input is disabled and
  // round.js ignores guesses from the drawer.
  function sendChat() {
    if (isMe) return
    const text = chatText.trim()
    if (!text) return
    // Stored for the banner: if this turns out to be the correct guess, this is the word.
    lastGuessRef.current = text
    game.sendChat(text)
    setChatText('')
  }

  // Scoreboard fully from the server: who is in the room and the match points.
  const scoreRows = game.members.map((member) => ({
    id: member.id,
    name: member.name,
    avatarUrl: member.avatarUrl,
    isDrawer: member.isDrawer,
    msToDrop: member.msToDrop,
    pts: game.round?.scores.find((s) => s.id === member.id)?.points ?? 0,
    guessed: (correctPlayers.turnKey === turnKey && correctPlayers.names.has(member.name))
      || (game.round?.scores.find((s) => s.id === member.id)?.guessed ?? false),
  }))

  // My points in this match, for the topbar.
  const myPoints = game.round?.scores.find((s) => s.name === selfName)?.points ?? 0

  // Name of whoever is drawing this turn — shown to every guesser above the
  // board so they can see who holds the pen (anti-cheat: everyone knows who
  // draws). Read from the server scores, which carry the isDrawer flag.
  const drawerName = game.round?.scores.find((s) => s.isDrawer)?.name ?? ''

  // Live scores until the game ends; then a frozen snapshot takes over so the
  // final podium never re-ranks as players close the overlay and leave.
  const liveScores: FinalScore[] = game.round?.scores.map((s) => ({
    name: s.name,
    points: s.points,
    avatarUrl: s.avatarUrl,
  })) ?? []
  const finalScores = frozenScores ?? liveScores

  // If the server refuses, the reason goes to the chat: the silence was what
  // made this look broken.
  async function startReport(targetId: string) {
    setReportOpen(false)

    const answer = await game.startReport(targetId)
    if (answer.ok) return

    const reason = answer.code === 'NEED_MORE_PLAYERS'
      ? t('game.report.needplayers')
      : t('game.report.failed')

    game.addNotice(reason)
  }

  return (
    <div className="game-wrap">
      <div className="game-topbar">
        <div className="who">
          <div className="mini-avatar">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              selfName.charAt(0).toUpperCase()
            )}
          </div>
          {selfName} — <span>{myPoints}</span> <span>{t('game.points')}</span>
        </div>
        <div className="pill-stat">
          <span>{t('game.round')}</span> {game.round ? `${game.round.round}/${game.round.totalRounds} (${game.round.turn}/${game.round.turnsPerRound})` : '—'}
        </div>
        <div className="pill-stat word-blank">
          <span>{t('game.word')}</span>: {game.wordToShow || '—'}
        </div>
        <div className="pill-stat">
          <span>{t('game.time')}</span>:{' '}
          <span className="timer" style={seconds <= 15 ? { color: 'var(--yellow)' } : undefined}>
            {seconds}
          </span>
          s
        </div>
      </div>

      <div className={isMe ? 'game-grid' : 'game-grid guessing'}>
        <div className={fullscreen ? 'canvas-box fullscreen' : 'canvas-box'}>
          <div className="tools">
            {isMe ? (
              <>
                {COLORS.map((color) => (
                  <div
                    key={color}
                    className={color === activeColor ? 'swatch active' : 'swatch'}
                    style={{ background: color }}
                    onClick={() => selectColor(color)}
                  />
                ))}
                <span className="turn-notice">✏️ {t('game.turn.notice')}</span>
                <div className="spacer" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearCanvas}>
                  {t('game.clear')}
                </button>
                {/* Mobile: fullscreen board while it is your turn to draw. */}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm fullscreen-btn"
                  title={t('game.fullscreen')}
                  onClick={() => setFullscreen((f) => !f)}
                >
                  {fullscreen ? '✕' : '⛶'}
                </button>
              </>
            ) : acertoVisible ? (
              // Correct guess: word, trophy (gold/silver/bronze by order) and
              // points. The word is the one I typed — the server never sends it
              // in 'round:correct', so the others cannot read it.
              <div className="acerto-banner" key={acertoVisible.place}>
                <Trophy place={acertoVisible.place} />
                <span className="word">{acertoVisible.word}</span>
                <span className="place">{acertoVisible.place}º</span>
                <span className="pts">+{acertoVisible.points} {t('game.points')}</span>
              </div>
            ) : (
              <span className="turn-notice guess">
                {drawerName ? `🖌️ ${drawerName} ${t('game.isdrawing')}` : `🎯 ${t('game.guess.notice')}`}
              </span>
            )}
          </div>
          {/* Pencil cursor only while drawing; a normal arrow while guessing. */}
          <canvas id="draw-canvas" ref={canvasRef} className={isMe ? 'drawing' : ''} />
        </div>

          <div className="chat-box">
            <h3>{t('game.chat.heading')}</h3>
            <div className="chat-log" ref={chatLogRef}>
              {game.messages.map((message, i) => (
                <div className="msg" key={i}>
                  {message.system ? <i>{message.text}</i> : <><b>{message.name}:</b> {message.text}</>}
                </div>
              ))}
            </div>
            <div className="chat-input-row">
              <input
                type="text"
                placeholder={isMe ? t('game.chat.blocked') : t('game.chat.placeholder')}
                value={chatText}
                disabled={isMe}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={isMe}
                onClick={sendChat}
              >
                {t('game.chat.send')}
              </button>
            </div>
        </div>

        {/* Footer scoreboard, always visible. On mobile it shows only the
            player themselves; a tap opens everyone (and stays so until the next
            tap). */}
        <div className={scoreOpen ? 'panel score-panel open' : 'panel score-panel'}>
          <h3 onClick={() => setScoreOpen((o) => !o)}>
            {t('game.score.heading')}
            <span className="score-caret" aria-hidden="true">{scoreOpen ? ' ▴' : ' ▾'}</span>
          </h3>
          <div className="score-list">
            {scoreRows.map((member) => (
              <div
                key={member.id}
                className={[
                  'score-row',
                  member.isDrawer ? 'drawing' : '',
                  member.name === selfName ? 'self' : '',
                  member.guessed ? 'correct' : '',
                ].join(' ').trim()}
              >
                <div className="mini-avatar">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    member.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="nm">
                  {/* Hovering/tapping the name opens the card: stats + friend + report */}
                  <PlayerHoverCard
                    username={member.name}
                    avatarUrl={member.avatarUrl}
                    isSelf={member.name === selfName}
                    onReport={() => startReport(member.id)}
                  >
                    {member.name}
                  </PlayerHoverCard>
                  {member.isDrawer && (
                    <span className="drawing-tag"> {t('game.drawing')}</span>
                  )}
                  {member.msToDrop !== null && (
                    <span className="drawing-tag">
                      {' '}— {t('game.dropped')} {Math.ceil(member.msToDrop / 1000)}s
                    </span>
                  )}
                </div>
                <div className="pts">{member.pts}</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm report-btn"
            onClick={() => setReportOpen(true)}
          >
            🚩 {t('game.report')}
          </button>
        </div>
      </div>

      {/* Leaving the match lives at the END of the page (appears on scroll). */}
      <div className="leave-row">
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => setConfirmLeave(true)}
        >
          {t('game.leave')}
        </button>
      </div>

      {/* Your turn: 3 REAL words from the server, 10 s to choose (counted on
          the server; when it reaches zero the first one is used). */}
      {game.choices && (
        <div className="modal-overlay show">
          <div className="modal-panel lobby-small">
            <h2>{t('game.choose.title')}</h2>
            <p className="roomlang-text">{t('game.choose.text')}</p>
            <div className="choose-words">
              {game.choices.options.map((word) => (
                <button
                  key={word}
                  type="button"
                  className="choose-word"
                  onClick={() => game.sendChoice(word)}
                >
                  <span>{word}</span>
                </button>
              ))}
            </div>
            <div className="choose-timer">{choiceLeft}s {t('game.choose.timer')}</div>
          </div>
        </div>
      )}

      {/* Leaving the match: warns that the points are lost. */}
      {confirmLeave && (
        <div className="modal-overlay show">
          <div className="modal-panel lobby-small">
            <h2>{t('game.leave')}</h2>
            <p className="roomlang-text">{t('game.leave.warn')}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmLeave(false)}>
                {t('profile.danger.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  // Exit confirmed: WAIT for the room:leave ack before
                  // navigating — navigating would disconnect the socket and the
                  // notice could be lost (a live ghost re-adopted by the profile).
                  await game.leaveRoom()
                  sessionStorage.removeItem('sg-room')
                  navigate('/profile')
                }}
              >
                {t('game.leave')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clicked a link out of the game: confirm before leaving the room. */}
      {pendingNav && (
        <div className="modal-overlay show">
          <div className="modal-panel lobby-small">
            <h2>{t('lobby.leave')}</h2>
            <p className="roomlang-text">{t('game.exit.warn')}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPendingNav(null)}>
                {t('profile.danger.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  // Same fix as the Leave button: wait for the ack first.
                  await game.leaveRoom()
                  sessionStorage.removeItem('sg-room')
                  navigate(pendingNav)
                }}
              >
                {t('roomlang.continue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report: choose which player (never yourself). */}
      {reportOpen && (
        <div className="modal-overlay show">
          <div className="modal-panel lobby-small">
            <h2>{t('game.report.title')}</h2>
            <p className="roomlang-text">{t('game.report.choose')}</p>
            <div className="choose-words">
              {scoreRows
                .filter((member) => member.name !== selfName)
                .map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="choose-word"
                    onClick={() => startReport(member.id)}
                  >
                    <span className="cat">🚩</span>
                    <span>{member.name}</span>
                  </button>
                ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setReportOpen(false)}>
                {t('game.report.back')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clicking twice changes nothing: the server counts 1 vote per person. */}
      {game.flagged && (
        <div className="report-toast">
          <p className="report-warned">🚩 {t('game.report.warned')}</p>
        </div>
      )}

      {game.reportVotes.length > 0 && (
        <div className="report-toasts">
          {game.reportVotes.map((vote) => (
            <div className="report-toast" key={vote.targetId}>
              <p className="report-question">
                🚩 <b>{t('lobby.kick')} {vote.name}?</b>
              </p>
              <p className="report-votes">
                {vote.votes}/{vote.needed} {t('game.report.votes')} · {vote.secondsLeft}s
              </p>
              {!game.hasVoted(vote.targetId) && (
                <div className="report-actions">
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => game.voteExpel(vote.targetId)}>
                    {t('lobby.kick')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* You were left alone mid-match: the room closed, no points. */}
      {game.aborted && (
        <div className="modal-overlay show">
          <div className="modal-panel lobby-small">
            <h2>{t('game.aborted.title')}</h2>
            <p className="roomlang-text">{t('game.aborted.text')}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  sessionStorage.removeItem('sg-room')
                  navigate('/rooms')
                }}
              >
                {t('endgame.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONLY you left/were removed for inactivity — the room continues for the
          others; the message does not say that no one gains points. */}
      {game.dropped && !game.aborted && (
        <div className="modal-overlay show">
          <div className="modal-panel lobby-small">
            <h2>{t('game.removed.title')}</h2>
            <p className="roomlang-text">{t('game.removed.text')}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  sessionStorage.removeItem('sg-room')
                  navigate('/rooms')
                }}
              >
                {t('endgame.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {game.error && (
        <div className="modal-overlay show">
          <div className="modal-panel lobby-small">
            <h2>{t('rooms.access.title')}</h2>
            <p className="roomlang-text">
              {game.error === 'ROOM_BANNED'
                ? t('rooms.access.banned')
                : game.error === 'ROOM_NOT_FOUND'
                  ? t('rooms.access.notfound')
                  : t('rooms.access.full')}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => navigate('/rooms')}>
                {t('endgame.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {game.expelled && (
        <div className="modal-overlay show">
          <div className="modal-panel lobby-small">
            <h2>🚩 {t('game.report.youwere')}</h2>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => navigate('/rooms')}>
                {t('game.report.back')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correct-guess confetti (the key recreates the shower on each guess). */}
      {confettiAt && <Confetti key={confettiAt} />}

      {endgameOpen && (
        <EndGameOverlay
          onClose={async () => {
            // End of game: leaving to /rooms must ALWAYS happen. Order matters —
            // removing sg-room and navigating must NEVER be held hostage by the
            // room:leave await: if that await is interrupted (slow network, or a
            // Vite reload remounting the component mid-way), the navigate in the
            // finally runs anyway and the player is not stuck on the board. The
            // points were already saved at the end of the last round, so leaving
            // here loses nothing.
            sessionStorage.removeItem('sg-room')
            setEndgameClosed(true)
            try {
              await game.leaveRoom()
            } finally {
              navigate('/rooms')
            }
          }}
          scores={finalScores}
        />
      )}
    </div>
  )
}

export default Game
