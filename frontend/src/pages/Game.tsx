import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EndGameOverlay from '../components/EndGameOverlay'
import { useGameSocket } from '../hooks/useGameSocket'

const COLORS = ['#15161B', '#FF4B3E', '#3EC1D3', '#FFC93C', '#6BCB77']

type ChatMessage = { name: string; text: string }

function Game() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const drawingRef = useRef(false)
  const colorRef = useRef(COLORS[0])
  const [activeColor, setActiveColor] = useState(COLORS[0])
  const [seconds, setSeconds] = useState(80)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [guess, setGuess] = useState('')
  const [chatText, setChatText] = useState('')
  const [endgameOpen, setEndgameOpen] = useState(false)

  // Server-side room engine: who is in the room, who holds the pencil, and
  // the transport for strokes. Kept in a ref so the canvas listeners below
  // can read the latest value without being torn down and rebuilt.
  const game = useGameSocket(canvasRef)
  const gameRef = useRef(game)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    gameRef.current = game
  })

  // AQUI O CODIGO DO SERVIDOR (o temporizador real é controlado pelo motor do
  // jogo no servidor; este é só a demonstração visual do modelo aprovado)
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : s))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // AQUI O CODIGO DO JOGO (motor do jogo: transmitir os traços por Socket.IO
  // — ex.: evento 'desenho:traco' — e desenhar também os traços recebidos dos
  // outros jogadores; só quem está "a desenhar" pode usar o quadro)
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
  }, [messages])

  function selectColor(color: string) {
    colorRef.current = color
    setActiveColor(color)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    game.sendClear()
  }

  function sendGuess() {
    if (!guess.trim()) return
    // AQUI O CODIGO DO JOGO (o palpite é enviado ao SERVIDOR, que o valida
    // contra a palavra secreta na língua do jogador e atribui os pontos)
    setMessages((m) => [...m, { name: 'utilizador_demo (palpite)', text: guess.trim() }])
    setGuess('')
  }

  function sendChat() {
    if (!chatText.trim()) return
    // AQUI O CODIGO DO CHAT (Socket.IO — a mensagem vai para todos os
    // jogadores da sala; o chat não é guardado na base de dados)
    setMessages((m) => [...m, { name: 'utilizador_demo', text: chatText.trim() }])
    setChatText('')
  }

  return (
    <div className="game-wrap">
      <div className="game-topbar">
        <div className="who">
          <div className="mini-avatar">U</div>
          utilizador_demo — <span>120</span> <span>{t('game.points')}</span>
        </div>
        <div className="pill-stat"><span>{t('game.round')}</span> 1 / 3</div>
        <div className="pill-stat word-blank"><span>{t('game.word')}</span>: _ _ _ _ _</div>
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
          onClick={() => setEndgameOpen(true)}
        >
          {t('endgame.test')}
        </button>
      </div>

      <div className="game-grid">
        <div className="panel" style={{ margin: 0 }}>
          <h3>{t('game.score.heading')}</h3>
          {/* AQUI O CODIGO DO JOGO (placar em tempo real vindo do SERVIDOR) */}
          <div className="score-list">
            <div className="score-row drawing">
              <div className="mini-avatar">C</div>
              <div className="nm">
                Carlos <span className="drawing-tag">{t('game.drawing')}</span>
              </div>
              <div className="pts">140</div>
            </div>
            <div className="score-row">
              <div className="mini-avatar">U</div>
              <div className="nm">utilizador_demo</div>
              <div className="pts">120</div>
            </div>
            <div className="score-row">
              <div className="mini-avatar">R</div>
              <div className="nm">Renan</div>
              <div className="pts">95</div>
            </div>
          </div>
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
          <div className="guess-row">
            <input
              type="text"
              placeholder={t('game.guess.placeholder')}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendGuess() }}
            />
            <button type="button" className="btn btn-primary" onClick={sendGuess}>
              {t('game.guess.send')}
            </button>
          </div>
        </div>

        <div className="chat-box">
          <h3>{t('game.chat.heading')}</h3>
          <div className="chat-log" ref={chatLogRef}>
            <div className="msg"><b>Renan:</b> <span>{t('game.msg1')}</span></div>
            <div className="msg"><b>Pedro:</b> <span>{t('game.msg2')}</span></div>
            {messages.map((message, i) => (
              <div className="msg" key={i}>
                <b>{message.name}:</b> {message.text}
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

      {endgameOpen && <EndGameOverlay onClose={() => setEndgameOpen(false)} />}
    </div>
  )
}

export default Game
