import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import EndGameOverlay from '../components/EndGameOverlay'
import PlayerHoverCard from '../components/PlayerHoverCard'
import { useAuth } from '../hooks/useAuth'
import { useGameSocket } from '../hooks/useGameSocket'

const COLORS = ['#15161B', '#FF4B3E', '#3EC1D3', '#FFC93C', '#6BCB77']

type ChatMessage = { name: string; text: string; system?: boolean }
type Acerto = { word: string; place: number; points: number; turnKey: string }

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
  // Identidade real da sessão: o nome/pontos vêm da conta autenticada; o
  // 'utilizador_demo' fica só como recurso quando não há sessão (dev local).
  const { user } = useAuth()
  const selfName = user?.username ?? 'utilizador_demo'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const drawingRef = useRef(false)
  const colorRef = useRef(COLORS[0])
  const [activeColor, setActiveColor] = useState(COLORS[0])
  const [chatText, setChatText] = useState('')
  const [endgameClosed, setEndgameClosed] = useState(false)

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

  // ---- vez de desenhar: decidida pelo servidor, sem botões de teste ----
  const isMe = game.isDrawer
  const isMeRef = useRef(isMe)
  useEffect(() => {
    isMeRef.current = isMe
  })

  // Contagem visual dos 10 s para escolher a palavra (quem manda é o
  // servidor: se ela chegar a zero, ele escolhe a primeira por ti).
  // O par {src,left} liga a contagem a ESTA oferta: enquanto o relógio não
  // bate, mostra os segundos anunciados — sem setState síncrono no effect.
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

  // ---- acerto real: 'round:correct' do servidor + o que eu escrevi ----
  // O servidor nunca envia a palavra no acerto (senão entregava-a aos
  // outros); a que aparece no MEU banner é a que eu próprio escrevi.
  const [notices, setNotices] = useState<ChatMessage[]>([])
  const [acerto, setAcerto] = useState<Acerto | null>(null)
  const [confettiAt, setConfettiAt] = useState<number | null>(null)
  const lastGuessRef = useRef('')
  // Identifica o turno atual; o banner só vive dentro do turno em que nasceu.
  const turnKey = game.round ? `${game.round.round}-${game.round.turn}` : ''
  const seenCorrectRef = useRef(0)
  useEffect(() => {
    const hit = game.lastCorrect
    if (!hit || hit.at === seenCorrectRef.current) return
    seenCorrectRef.current = hit.at
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

  // Derivado: o banner some sozinho quando o turno seguinte começa.
  const acertoVisible = acerto && acerto.turnKey === turnKey ? acerto : null

  // ---- modais de saída ----
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [pendingNav, setPendingNav] = useState<string | null>(null)

  // ---- quadro em ecrã inteiro (telemóvel, na vez de desenhar) ----
  const [fullscreen, setFullscreen] = useState(false)

  // ---- placar recolhido no telemóvel (só o próprio; toque mostra todos) --
  const [scoreOpen, setScoreOpen] = useState(false)

  // ---- denunciar um jogador ----
  // A votação vive no servidor: conta 1 voto por jogador, precisa de MAIS de
  // metade e expulsa como se a pessoa tivesse saído, perdendo os pontos.
  const [reportOpen, setReportOpen] = useState(false)

  // O tempo é do servidor: todos os jogadores da sala veem o mesmo número, e
  // ninguém ganha segundos por ter a página mais lenta.
  const seconds = game.round?.secondsLeft ?? 0

  // Derivado em vez de guardado: o fim de jogo aparece porque o servidor diz
  // que acabou, e desaparece porque o jogador o fechou.
  const finished = game.round?.phase === 'finished'
  const endgameOpen = finished && !endgameClosed

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    function fitCanvas() {
      if (!canvas || !ctx) return
      // Tamanho igual ao atual: nada a fazer. Nos telemóveis o browser
      // dispara 'resize' constantemente (barra de endereço, teclado) e cada
      // refit apaga o quadro e repinta o histórico inteiro — era isso que
      // deixava o desenho em ecrã inteiro lentíssimo.
      const size = canvas.getBoundingClientRect()
      if (canvas.width === Math.round(size.width * 2) && canvas.height === Math.round(size.height * 2)) {
        return
      }
      // Mudar width/height APAGA o canvas: antes disso o desenho atual é
      // copiado para um canvas temporário e volta a ser pintado à escala.
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
      drawingRef.current = true
      lastPointRef.current = pos(e)
    }
    function move(e: MouseEvent | TouchEvent) {
      if (!drawingRef.current) return
      const p = pos(e)
      const from = lastPointRef.current
      ctx!.strokeStyle = colorRef.current
      // UM segmento por evento. Antes, lineTo acumulava o traço inteiro num
      // caminho só e cada stroke() redesenhava TUDO desde o início — O(n²):
      // era isto que travava o desenho no telemóvel (pior em ecrã inteiro).
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
    // Debounce do refit: rajadas de 'resize' (típicas no telemóvel) fazem UM
    // ajuste no fim, em vez de apagar+repintar o quadro dezenas de vezes.
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

  const shownMessages: ChatMessage[] = [...game.messages, ...notices]

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

  // Um único campo serve para conversar e para adivinhar: o SERVIDOR compara
  // a mensagem com a palavra secreta e decide o que ela foi ('round:correct'
  // com nome/pontos/posição). Quem desenha não escreve: o input está
  // desativado e o round.js ignora palpites do desenhador.
  function sendChat() {
    if (isMe) return
    const text = chatText.trim()
    if (!text) return
    // Guardada para o banner: se isto for o acerto, é esta a palavra.
    lastGuessRef.current = text
    game.sendChat(text)
    setChatText('')
  }

  // Placar 100% do servidor: quem está na sala e os pontos da partida.
  const scoreRows = game.members.map((member) => ({
    id: member.id,
    name: member.name,
    isDrawer: member.isDrawer,
    msToDrop: member.msToDrop,
    pts: game.round?.scores.find((s) => s.id === member.id)?.points ?? 0,
  }))

  // Os meus pontos nesta partida, para a topbar.
  const myPoints = game.round?.scores.find((s) => s.name === selfName)?.points ?? 0

  // Se o servidor recusar, a razão vai para o chat: o silêncio era o que
  // fazia isto parecer partido.
  async function startReport(targetId: string) {
    setReportOpen(false)

    const answer = await game.startReport(targetId)
    if (answer.ok) return

    const reason = answer.code === 'NEED_MORE_PLAYERS'
      ? t('game.report.needplayers')
      : t('game.report.failed')

    setNotices((all) => [...all, { name: '', text: reason, system: true }])
  }

  return (
    <div className="game-wrap">
      <div className="game-topbar">
        <div className="who">
          <div className="mini-avatar">{selfName.charAt(0).toUpperCase()}</div>
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
            ) : acertoVisible ? (
              // Acerto: palavra, troféu (ouro/prata/bronze pela ordem) e
              // pontos. A palavra é a que EU escrevi — o servidor nunca a
              // envia no 'round:correct', para os outros não a lerem.
              <div className="acerto-banner" key={acertoVisible.place}>
                <Trophy place={acertoVisible.place} />
                <span className="word">{acertoVisible.word}</span>
                <span className="place">{acertoVisible.place}º</span>
                <span className="pts">+{acertoVisible.points} {t('game.points')}</span>
              </div>
            ) : (
              <span className="turn-notice guess">🎯 {t('game.guess.notice')}</span>
            )}
          </div>
          {/* O cursor-lápis só na vez de desenhar; a adivinhar é seta normal. */}
          <canvas id="draw-canvas" ref={canvasRef} className={isMe ? 'drawing' : ''} />
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
                  member.name === selfName ? 'self' : '',
                ].join(' ').trim()}
              >
                <div className="mini-avatar">{member.name.charAt(0).toUpperCase()}</div>
                <div className="nm">
                  {/* Pousar/tocar no nome abre o cartão: stats + amigo + report */}
                  <PlayerHoverCard
                    username={member.name}
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

      {/* É a tua vez: 3 palavras REAIS do servidor, 10 s para escolher
          (contados no servidor; ao chegar a zero vai a primeira). */}
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
                onClick={async () => {
                  // Sair confirmado: ESPERA o ack do room:leave antes de
                  // navegar — navegar já desligava o socket e o aviso
                  // podia perder-se (fantasma vivo readotado pelo perfil).
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
                onClick={async () => {
                  // Mesma correção do botão Sair: esperar o ack primeiro.
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

      {/* Denunciar: escolher qual jogador (nunca o próprio). */}
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

      {/* Carregar duas vezes não muda nada: o servidor conta 1 voto por pessoa. */}
      {game.flagged && (
        <div className="report-toast">
          <p className="report-warned">🚩 {t('game.report.warned')}</p>
        </div>
      )}

      {game.reportVote && (
        <div className="report-toast">
          <p className="report-question">
            🚩 <b>{t('lobby.kick')} {game.reportVote.name}?</b>
          </p>
          <p className="report-votes">
            {game.reportVote.votes}/{game.reportVote.needed} {t('game.report.votes')}
          </p>
          <div className="report-actions">
            <button type="button" className="btn btn-danger btn-sm" onClick={() => game.voteExpel()}>
              {t('lobby.kick')}
            </button>
          </div>
        </div>
      )}

      {/* Ficaste sozinho a meio da partida: a sala fechou, sem pontos. */}
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

      {/* SÓ tu saíste/foste removido por inatividade — a sala segue para os
          outros; a mensagem não diz que ninguém ganha pontos. */}
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

      {/* Confetes do acerto (o key recria a chuva a cada acerto). */}
      {confettiAt && <Confetti key={confettiAt} />}

      {endgameOpen && (
        <EndGameOverlay
          onClose={async () => {
            // Fim de jogo: sair para /rooms tem de acontecer SEMPRE. A ordem
            // importa — remover o sg-room e navegar NUNCA podem ficar reféns
            // do await do room:leave: se esse await for interrompido (rede
            // lenta, ou um recarregamento do Vite a remontar o componente a
            // meio), o navigate no finally corre à mesma e o jogador não
            // fica preso no tabuleiro. Os pontos já foram gravados no fim da
            // última ronda, por isso sair aqui não perde nada.
            sessionStorage.removeItem('sg-room')
            setEndgameClosed(true)
            try {
              await game.leaveRoom()
            } finally {
              navigate('/rooms')
            }
          }}
          scores={game.round?.scores.map((s) => ({ name: s.name, points: s.points })) ?? []}
        />
      )}
    </div>
  )
}

export default Game
