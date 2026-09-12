import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import EndGameOverlay from '../components/EndGameOverlay'
import { useGameSocket } from '../hooks/useGameSocket'

const COLORS = ['#15161B', '#FF4B3E', '#3EC1D3', '#FFC93C', '#6BCB77']

function Game() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const drawingRef = useRef(false)
  const colorRef = useRef(COLORS[0])
  const [activeColor, setActiveColor] = useState(COLORS[0])
  const [chatText, setChatText] = useState('')
  const [endgameClosed, setEndgameClosed] = useState(false)
  const [testOpen, setTestOpen] = useState(false)

  // Server-side room engine: who is in the room, who holds the pencil, and
  // the transport for strokes. Kept in a ref so the canvas listeners below
  // can read the latest value without being torn down and rebuilt.
  const game = useGameSocket(canvasRef)
  const gameRef = useRef(game)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    gameRef.current = game
  })

  // O tempo é do servidor: todos os jogadores da sala veem o mesmo número, e
  // ninguém ganha segundos por ter a página mais lenta.
  const seconds = game.round?.secondsLeft ?? 0

  // Derivado em vez de guardado: o fim de jogo aparece porque o servidor diz
  // que acabou, e desaparece porque o jogador o fechou.
  const finished = game.round?.phase === 'finished'
  const endgameOpen = testOpen || (finished && !endgameClosed)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    function fitCanvas() {
      if (!canvas || !ctx) return
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * 2
      canvas.height = rect.height * 2
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
      if (!gameRef.current.isDrawer) return
      drawingRef.current = true
      const p = pos(e)
      lastPointRef.current = p
      ctx!.beginPath()
      ctx!.moveTo(p.x, p.y)
    }
    function move(e: MouseEvent | TouchEvent) {
      if (!drawingRef.current) return
      const p = pos(e)
      ctx!.strokeStyle = colorRef.current
      ctx!.lineTo(p.x, p.y)
      ctx!.stroke()

      // Normalised to 0..1 so windows of different sizes stay in sync.
      const rect = canvas!.getBoundingClientRect()
      const from = lastPointRef.current
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
    window.addEventListener('resize', fitCanvas)
    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', end)
      window.removeEventListener('resize', fitCanvas)
    }
  }, [])

  useEffect(() => {
    const log = chatLogRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [game.messages])

  function selectColor(color: string) {
    colorRef.current = color
    setActiveColor(color)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    game.sendClear()
  }

  // Um único campo serve para conversar e para adivinhar: o servidor compara
  // a mensagem com a palavra secreta e decide o que ela foi.
  function sendChat() {
    if (!chatText.trim()) return
    game.sendChat(chatText.trim())
    setChatText('')
  }

  return (
    <div className="game-wrap">
      <div className="game-topbar">
        <div className="who">
          <div className="mini-avatar">U</div>
          utilizador_demo — <span>120</span> <span>{t('game.points')}</span>
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
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setTestOpen(true)}
        >
          {t('endgame.test')}
        </button>
      </div>

      <div className="game-grid">
        <div className="panel score-panel">
          <h3>{t('game.score.heading')}</h3>
          {/* Vem do servidor. Sem estilo próprio: só classes que já existiam,
              incluindo o aviso de quem se desligou. @Thevaris à vontade. */}
          <div className="score-list">
            {game.members.map((member) => (
              <div
                key={member.id}
                className={member.isDrawer ? 'score-row drawing' : 'score-row'}
              >
                <div className="mini-avatar">{member.name.charAt(0).toUpperCase()}</div>
                <div className="nm">
                  {member.name}
                  {member.isDrawer && (
                    <span className="drawing-tag"> {t('game.drawing')}</span>
                  )}
                  {member.msToDrop !== null && (
                    <span className="drawing-tag">
                      {' '}— desligou-se, {Math.ceil(member.msToDrop / 1000)}s
                    </span>
                  )}
                </div>
                <div className="pts">
                  {game.round?.scores.find((s) => s.id === member.id)?.points ?? 0}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-danger btn-sm leave-btn"
            onClick={() => {
              // AQUI O CODIGO DO SERVIDOR (sair da sala real: avisar o
              // Socket.IO para remover o jogador e saltar o turno dele)
              navigate('/profile')
            }}
          >
            {t('game.leave')}
          </button>
        </div>

        <div className="canvas-box">
            <div className="tools">
              {COLORS.map((color) => (
                <div
                  key={color}
                  className={color === activeColor ? 'swatch active' : 'swatch'}
                  style={{ background: color }}
                  onClick={() => selectColor(color)}
                />
              ))}
              <div className="spacer" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearCanvas}>
                {t('game.clear')}
              </button>
            </div>
          <canvas id="draw-canvas" ref={canvasRef} />
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
                placeholder={t('game.chat.placeholder')}
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={sendChat}>
                {t('game.chat.send')}
              </button>
            </div>
        </div>
      </div>

      {endgameOpen && (
        <EndGameOverlay
          onClose={() => { setTestOpen(false); setEndgameClosed(true) }}
          scores={game.round?.scores.map((s) => ({ name: s.name, points: s.points })) ?? []}
        />
      )}
    </div>
  )
}

export default Game
