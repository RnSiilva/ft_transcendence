import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import EndGameOverlay from '../components/EndGameOverlay'
import { useGameSocket } from '../hooks/useGameSocket'

const COLORS = ['#15161B', '#FF4B3E', '#3EC1D3', '#FFC93C', '#6BCB77']

// DEMO: no jogo real as 3 opções vêm do SERVIDOR (words.repository.pickWord
// por tema; evento tipo 'round:choices' → escolha 'round:choose'; os 5 s
// para decidir também são contados no servidor). AQUI O CODIGO DO SERVIDOR.
const DEMO_CHOICES = [
  { catKey: 'game.cat.animal', word: 'GATO' },
  { catKey: 'game.cat.object', word: 'CADEIRA' },
  { catKey: 'game.cat.country', word: 'JAPÃO' },
]
// DEMO: palavra secreta fixa para veres a animação de acerto no chat.
const DEMO_SECRET = 'gato'
const CHOOSE_SECONDS = 10

type ChatMessage = { name: string; text: string; system?: boolean }
type Acerto = { word: string; place: number; points: number }

// Chuva de confetes do acerto: ~80 pedacinhos nas cores do projeto, cada um
// com posição, atraso, tamanho e rotação aleatórios (só CSS, sem libraria).
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

/** Troféu do acerto: dourado 1.º, prateado 2.º, bronze do 3.º em diante. */
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const drawingRef = useRef(false)
  const colorRef = useRef(COLORS[0])
  const [activeColor, setActiveColor] = useState(COLORS[0])
  const [chatText, setChatText] = useState('')
  const [endgameOpen, setEndgameOpen] = useState(false)

  // Se chegámos aqui sem ?room= mas há uma sala recente, repõe-a no URL
  // ANTES do socket ligar: o servidor segura o lugar 15 s (reclaimSeat) e o
  // draw:history repõe o desenho — sair sem querer deixa de perder tudo.
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

  // ---- vez de desenhar (real: game.isDrawer; demo: botões na topbar) ----
  // Sozinho numa sala real és sempre o desenhador; o "Testar adivinhar"
  // (demoGuesser) força o modo de adivinhar por cima disso, para testes.
  const [demoDrawer, setDemoDrawer] = useState(false)
  const [demoGuesser, setDemoGuesser] = useState(false)
  const [chosenWord, setChosenWord] = useState<string | null>(null)
  const [wordChoices, setWordChoices] = useState<typeof DEMO_CHOICES | null>(null)
  const [chooseLeft, setChooseLeft] = useState(CHOOSE_SECONDS)
  const isMe = demoGuesser ? false : (game.isDrawer || demoDrawer)
  const isMeRef = useRef(isMe)
  useEffect(() => {
    isMeRef.current = isMe
  })

  // ---- acerto (demo local; no real vem do servidor: 'round:correct') ----
  const [demoMessages, setDemoMessages] = useState<ChatMessage[]>([])
  const [acerto, setAcerto] = useState<Acerto | null>(null)
  const [confettiAt, setConfettiAt] = useState<number | null>(null)
  const acertoCount = useRef(0)
  // Quem já acertou não pode voltar a pontuar na mesma ronda.
  const hasGuessedRef = useRef(false)

  // ---- modais de saída ----
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [pendingNav, setPendingNav] = useState<string | null>(null)

  // ---- quadro em ecrã inteiro (telemóvel, na vez de desenhar) ----
  const [fullscreen, setFullscreen] = useState(false)

  // ---- placar recolhido no telemóvel (só o próprio; toque mostra todos) --
  const [scoreOpen, setScoreOpen] = useState(false)

  // ---- denunciar um jogador (demo local com votação simulada) ----
  // AQUI O CODIGO DO SERVIDOR ('report:start' abre a votação e mostra o
  // mini-modal a TODOS os ecrãs da sala; 'report:vote' conta 1 voto por
  // jogador; com MAIS de 50% o denunciado é expulso como se saísse da
  // partida — perde os pontos e sai direto; o denunciado recebe apenas o
  // aviso, sem botões de voto)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportVote, setReportVote] = useState<
    { name: string; votes: number; total: number } | null
  >(null)
  const [demoPlayers, setDemoPlayers] = useState([
    { id: 'c', name: 'Carlos', pts: 140 },
    { id: 'u', name: 'utilizador_demo', pts: 120 },
    { id: 'r', name: 'Renan', pts: 95 },
  ])

  // O tempo é do servidor: todos os jogadores da sala veem o mesmo número, e
  // ninguém ganha segundos por ter a página mais lenta.
  const seconds = game.round?.secondsLeft ?? 0

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    function fitCanvas() {
      if (!canvas || !ctx) return
      // Mudar width/height APAGA o canvas: antes disso o desenho atual é
      // copiado para um canvas temporário e volta a ser pintado à escala.
      const prev = document.createElement('canvas')
      prev.width = canvas.width
      prev.height = canvas.height
      if (prev.width > 0 && prev.height > 0) {
        prev.getContext('2d')?.drawImage(canvas, 0, 0)
      }

      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * 2
      canvas.height = rect.height * 2
      ctx.scale(2, 2)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 4

      if (prev.width > 0 && prev.height > 0) {
        ctx.drawImage(prev, 0, 0, rect.width, rect.height)
      }
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

  // Mudar entre desenhar/adivinhar ou entrar/sair do ecrã inteiro muda o
  // tamanho do quadro: reajusta o canvas (o fitCanvas preserva o desenho).
  useEffect(() => {
    window.dispatchEvent(new Event('resize'))
  }, [isMe, fullscreen])

  // Sair da página = sair da sala: aviso do browser ao fechar/recarregar e
  // modal nosso ao clicar em qualquer link interno.
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

  // Contagem dos 5 segundos para escolher a palavra (demo; no real é o
  // servidor que conta e escolhe por ti se não decidires).
  useEffect(() => {
    if (!wordChoices) return
    const tick = setInterval(() => {
      setChooseLeft((s) => {
        if (s <= 1) {
          setWordChoices((choices) => {
            if (choices) {
              setChosenWord(choices[0].word)
              setDemoDrawer(true)
            }
            return null
          })
          return CHOOSE_SECONDS
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [wordChoices])

  const shownMessages: ChatMessage[] = [...game.messages, ...demoMessages]

  useEffect(() => {
    const log = chatLogRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [shownMessages.length])

  function selectColor(color: string) {
    colorRef.current = color
    setActiveColor(color)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    game.sendClear()
  }

  function startTurnDemo() {
    setDemoGuesser(false)
    setChooseLeft(CHOOSE_SECONDS)
    setWordChoices(DEMO_CHOICES)
  }

  function chooseWord(word: string) {
    // AQUI O CODIGO DO SERVIDOR (enviar a escolha: 'round:choose' { word })
    setChosenWord(word)
    setDemoDrawer(true)
    setWordChoices(null)
    setChooseLeft(CHOOSE_SECONDS)
  }

  // Um único campo serve para conversar e para adivinhar: o servidor compara
  // a mensagem com a palavra secreta e decide o que ela foi.
  // Quem está a desenhar NÃO pode escrever (senão entregava a palavra);
  // o input fica desativado e isto é a segunda tranca. AQUI O CODIGO DO
  // SERVIDOR (o round.socket também deve ignorar chat vindo do desenhador).
  function sendChat() {
    if (isMe) return
    const text = chatText.trim()
    if (!text) return

    // DEMO local: no modo "Testar adivinhar" (ou sem socket ligado) a
    // mensagem não vai ao servidor — "gato" em qualquer capitalização
    // acerta. No real quem valida é o SERVIDOR ('round:correct' com nome,
    // pontos e posição — round.socket.js).
    const demoMode = demoGuesser || !game.code
    if (!demoMode) {
      game.sendChat(text)
    } else {
      if (text.toLowerCase() === DEMO_SECRET) {
        // Já acertou nesta ronda: não pontua outra vez (e a palavra não é
        // reenviada ao chat, senão entregava-a aos outros).
        if (hasGuessedRef.current) {
          setDemoMessages((all) => [
            ...all,
            { name: '', text: t('game.correct.already'), system: true },
          ])
          setChatText('')
          return
        }
        hasGuessedRef.current = true
        acertoCount.current += 1
        const place = acertoCount.current
        const points = Math.max(100 - (place - 1) * 25, 25)
        setAcerto({ word: DEMO_SECRET.toUpperCase(), place, points })
        // Confetes a acompanhar o troféu; somem sozinhos.
        const burst = Date.now()
        setConfettiAt(burst)
        window.setTimeout(() => {
          setConfettiAt((current) => (current === burst ? null : current))
        }, 3800)
        setDemoMessages((all) => [
          ...all,
          { name: '', text: `${t('game.correct.you')} +${points}`, system: true },
        ])
      } else {
        setDemoMessages((all) => [...all, { name: 'utilizador_demo', text }])
      }
    }
    setChatText('')
  }

  // Placar: com 2+ jogadores reais vem do servidor; sozinho (ou sem socket)
  // mostra um exemplo com outros utilizadores e pontos, para se ver o layout.
  const scoreRows = game.members.length >= 2
    ? game.members.map((member) => ({
        id: member.id,
        name: member.name,
        isDrawer: member.isDrawer,
        msToDrop: member.msToDrop,
        pts: game.round?.scores.find((s) => s.id === member.id)?.points ?? 0,
      }))
    : demoPlayers.map((player) => ({
        id: player.id,
        name: player.name,
        isDrawer: player.name === 'utilizador_demo' ? isMe : player.name === 'Carlos' && !isMe,
        msToDrop: null as number | null,
        pts: player.pts,
      }))

  function expelByName(name: string) {
    // DEMO: no real é o SERVIDOR que expulsa (força o room:leave do
    // denunciado quando os votos passam de 50%).
    setDemoPlayers((list) => list.filter((p) => p.name !== name))
    setDemoMessages((all) => [
      ...all,
      { name: '', text: `${name} ${t('game.report.expelled')}`, system: true },
    ])
    setReportVote(null)
  }

  function startReport(name: string) {
    // Todos os jogadores da sala menos o denunciado podem votar.
    setReportOpen(false)
    setReportVote({ name, votes: 0, total: Math.max(scoreRows.length - 1, 1) })
  }

  function voteExpel() {
    if (!reportVote) return
    const updated = { ...reportVote, votes: reportVote.votes + 1 }
    const majority = Math.floor(updated.total / 2) + 1
    if (updated.votes >= majority) {
      expelByName(updated.name)
      return
    }
    setReportVote(updated)
    // DEMO: o voto de outro jogador chega a seguir e fecha a votação.
    const name = updated.name
    window.setTimeout(() => expelByName(name), 1800)
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
          <span>{t('game.word')}</span>: {(isMe && chosenWord) || game.wordToShow || '—'}
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
          onClick={startTurnDemo}
        >
          {t('game.turn.test')}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            // Força o modo de adivinhar (mesmo sendo o desenhador real da
            // sala, o que acontece sempre que estás sozinho nela) e começa
            // uma "ronda" demo limpa: pode acertar-se de novo.
            setDemoGuesser(true)
            setDemoDrawer(false)
            setChosenWord(null)
            setAcerto(null)
            acertoCount.current = 0
            hasGuessedRef.current = false
          }}
        >
          {t('game.guess.test')}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setEndgameOpen(true)}
        >
          {t('endgame.test')}
        </button>
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
                {/* Telemóvel: quadro em ecrã inteiro na vez de desenhar. */}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm fullscreen-btn"
                  title={t('game.fullscreen')}
                  onClick={() => setFullscreen((f) => !f)}
                >
                  {fullscreen ? '✕' : '⛶'}
                </button>
              </>
            ) : acerto ? (
              // Acerto: palavra, troféu (ouro/prata/bronze pela ordem) e
              // pontos. AQUI O CODIGO DO SERVIDOR (a palavra SÓ pode
              // aparecer a quem já acertou e ao desenhador — os outros
              // recebem 'round:correct' apenas com nome/pontos/posição,
              // nunca com a palavra; o servidor é que garante isso)
              <div className="acerto-banner" key={acerto.place}>
                <Trophy place={acerto.place} />
                <span className="word">{acerto.word}</span>
                <span className="place">{acerto.place}º</span>
                <span className="pts">+{acerto.points} {t('game.points')}</span>
              </div>
            ) : (
              <span className="turn-notice guess">🎯 {t('game.guess.notice')}</span>
            )}
          </div>
          <canvas id="draw-canvas" ref={canvasRef} />
        </div>

        <div className="chat-box">
            <h3>{t('game.chat.heading')}</h3>
            <div className="chat-log" ref={chatLogRef}>
              {shownMessages.map((message, i) => (
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

        {/* Placar rodapé sempre visível. No telemóvel mostra só o próprio
            jogador; um toque abre todos (e fica assim até novo toque).
            AQUI O CODIGO DO SERVIDOR (marcar o "próprio" pelo id da sessão) */}
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
                  member.name === 'utilizador_demo' ? 'self' : '',
                ].join(' ').trim()}
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

      {/* Sair da partida vive no FIM da página (aparece ao rolar). */}
      <div className="leave-row">
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => setConfirmLeave(true)}
        >
          {t('game.leave')}
        </button>
      </div>

      {/* É a tua vez: 3 palavras, 5 segundos para escolher. */}
      {wordChoices && (
        <div className="modal-overlay show">
          <div className="modal-panel lobby-small">
            <h2>{t('game.choose.title')}</h2>
            <p className="roomlang-text">{t('game.choose.text')}</p>
            <div className="choose-words">
              {wordChoices.map((choice) => (
                <button
                  key={choice.word}
                  type="button"
                  className="choose-word"
                  onClick={() => chooseWord(choice.word)}
                >
                  <span className="cat">{t(choice.catKey)}</span>
                  <span>{choice.word}</span>
                </button>
              ))}
            </div>
            <div className="choose-timer">{chooseLeft}s {t('game.choose.timer')}</div>
          </div>
        </div>
      )}

      {/* Sair da partida: aviso de que os pontos se perdem. */}
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
                onClick={() => {
                  // AQUI O CODIGO DO SERVIDOR ('room:leave' — o servidor
                  // remove o jogador e os pontos desta partida perdem-se)
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

      {/* Clicou num link para fora do jogo: confirmar antes de sair da sala. */}
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
                onClick={() => {
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

      {/* Denunciar: escolher qual jogador (nunca o próprio). */}
      {reportOpen && (
        <div className="modal-overlay show">
          <div className="modal-panel lobby-small">
            <h2>{t('game.report.title')}</h2>
            <p className="roomlang-text">{t('game.report.choose')}</p>
            <div className="choose-words">
              {scoreRows
                .filter((member) => member.name !== 'utilizador_demo')
                .map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="choose-word"
                    onClick={() => startReport(member.name)}
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

      {/* Votação no canto direito de TODOS os ecrãs da sala; o denunciado
          vê apenas o aviso, sem botões. */}
      {reportVote && (
        <div className="report-toast">
          {reportVote.name === 'utilizador_demo' ? (
            <p className="report-warned">🚩 {t('game.report.warned')}</p>
          ) : (
            <>
              <p className="report-question">
                🚩 <b>{t('lobby.kick')} {reportVote.name}?</b>
              </p>
              <p className="report-votes">
                {reportVote.votes}/{reportVote.total} {t('game.report.votes')}
              </p>
              <div className="report-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReportVote(null)}>
                  {t('game.report.back')}
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={voteExpel}>
                  {t('lobby.kick')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Confetes do acerto (o key recria a chuva a cada acerto). */}
      {confettiAt && <Confetti key={confettiAt} />}

      {endgameOpen && <EndGameOverlay onClose={() => setEndgameOpen(false)} />}
    </div>
  )
}

export default Game
