import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useLanguage } from '../i18n/LanguageContext'

/**
 * Connects the game screen to the room engine on the server.
 *
 * The room comes from ?room= in the URL; without one a room is created and
 * the URL updated, so it can be copied into a second window. Remote strokes
 * are painted here, onto the canvas the page already owns, so the page itself
 * barely has to change.
 */

export type Stroke =
{
	x0: number
	y0: number
	x1: number
	y1: number
	colour?: string
}

export type RoomMember =
{
	id: string
	userId: number
	name: string
	isDrawer: boolean
	/** Milliseconds left before a disconnected player loses their seat. */
	msToDrop: number | null
}

type RoomState =
{
	code: string
	drawerId: string | null
	members: RoomMember[]
}

export type RoundScore =
{
	id: string
	name: string
	points: number
	isDrawer: boolean
	guessed: boolean
}

export type RoundState =
{
	phase: 'waiting' | 'drawing' | 'result' | 'paused' | 'finished'
	round: number
	totalRounds: number
	/** Which player is drawing within this round, and how many will. */
	turn: number
	turnsPerRound: number
	secondsLeft: number
	maskedWord: string
	/** Only filled once the round is over; until then everyone sees the mask. */
	word: string | null
	scores: RoundScore[]
}

export type ChatMessage = { name: string; text: string; system?: boolean }

/** A vote in progress. The player being voted on never receives this. */
export type ReportVote =
{
	targetId: string
	name: string
	votes: number
	needed: number
}

type Ack = { ok: boolean; room?: RoomState; error?: string; code?: string }

const DEFAULT_COLOUR = '#15161B'

function paintSegment(canvas: HTMLCanvasElement, stroke: Stroke)
{
	const ctx = canvas.getContext('2d')
	if (!ctx)
		return

	// The canvas is scaled 2x for retina, so drawing happens in CSS pixels.
	const rect = canvas.getBoundingClientRect()

	ctx.beginPath()
	ctx.strokeStyle = stroke.colour ?? DEFAULT_COLOUR
	ctx.moveTo(stroke.x0 * rect.width, stroke.y0 * rect.height)
	ctx.lineTo(stroke.x1 * rect.width, stroke.y1 * rect.height)
	ctx.stroke()
}

export function useGameSocket(canvasRef: React.RefObject<HTMLCanvasElement | null>)
{
	const { t } = useLanguage()
	// O efeito do socket corre uma só vez; o ref dá-lhe sempre o t do idioma
	// atual sem obrigar a religar os listeners a cada mudança de língua.
	const tRef = useRef(t)
	useEffect(() =>
	{
		tRef.current = t
	}, [t])

	const socketRef = useRef<Socket | null>(null)
	const repaintRef = useRef<() => void>(() => {})
	const [room, setRoom] = useState<RoomState | null>(null)
	const [selfId, setSelfId] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [round, setRound] = useState<RoundState | null>(null)
	const [secretWord, setSecretWord] = useState<string | null>(null)
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [reportVote, setReportVote] = useState<ReportVote | null>(null)
	const [flagged, setFlagged] = useState(false)
	const [expelled, setExpelled] = useState(false)
	// A sala fechou a meio (ficou só um jogador): ninguém ganha os pontos.
	const [aborted, setAborted] = useState(false)
	// As 3 palavras oferecidas ao desenhador (só ele as recebe do servidor).
	const [choices, setChoices] = useState<{ options: string[]; seconds: number } | null>(null)
	// Último acerto anunciado pela sala — alimenta o banner/confetes.
	const [lastCorrect, setLastCorrect] = useState<
		{ name: string; points: number; position: number; at: number } | null
	>(null)
	// report:closed only carries the targetId, and the name is read in a listener.
	const voteRef = useRef<ReportVote | null>(null)

	useEffect(() =>
	{
		// Same origin: nginx proxies /socket.io/ through to the backend.
		const socket = io({ withCredentials: true })
		socketRef.current = socket

		const request = (event: string, payload: object): Promise<Ack> =>
			new Promise((resolve) => socket.emit(event, payload, resolve))

		// Já estivemos dentro da sala nesta página? Numa RECONEXÃO falhada
		// (a sala morreu com o telemóvel em espera) o jogo terminou — nunca
		// criar uma sala nova em silêncio, senão o jogador fica sozinho num
		// jogo fantasma sem dar por isso.
		let everEntered = false
		// Entrada/reentrada a decorrer: a sonda abaixo não deve tirar
		// conclusões a meio de um room:join ainda sem resposta.
		let joining = false

		const enterRoom = async () =>
		{
			joining = true
			try
			{
				await doEnterRoom()
			}
			finally
			{
				joining = false
			}
		}

		const doEnterRoom = async () =>
		{
			// The server takes the player's name from the session cookie, so
			// there is nothing to send: it would only be a name to spoof.
			const wanted = new URLSearchParams(window.location.search).get('room')

			let answer = wanted
				? await request('room:join', { code: wanted })
				: await request('room:create', {})

			// A link to a room that no longer exists falls back to a new one.
			// Already being in a room is different: opening another would hide it.
			if (!answer.ok && answer.code === 'ALREADY_IN_ROOM')
			{
				setError('ALREADY_IN_ROOM')
				return
			}

			if (!answer.ok)
			{
				if (everEntered)
				{
					setAborted(true)
					return
				}
				answer = await request('room:create', {})
			}

			if (!answer.ok || !answer.room)
			{
				setError(answer.code || 'ROOM_ERROR')
				return
			}

			everEntered = true
			setError(null)

			const url = new URL(window.location.href)
			url.searchParams.set('room', answer.room.code)
			window.history.replaceState({}, '', url)

			repaint()
		}

		/**
		 * Repaints the board from the server's copy. Needed after a reload, and
		 * again after a resize: changing a canvas's width or height wipes it,
		 * and the strokes only live on the server.
		 */
		function repaint()
		{
			socket.emit('draw:history', {}, (strokes: Stroke[]) =>
			{
				const canvas = canvasRef.current
				if (!canvas || !Array.isArray(strokes))
					return

				strokes.forEach((stroke) => paintSegment(canvas, stroke))
			})
		}

		repaintRef.current = repaint

		socket.on('connect', () =>
		{
			setSelfId(socket.id ?? null)
			void enterRoom()
		})

		socket.on('room:state', setRoom)

		socket.on('round:state', setRound)

		// Only the drawer is ever sent this, so keeping it in state is safe.
		socket.on('round:word', (word: string) =>
		{
			setSecretWord(word)
			// A palavra chegou: a escolha (se estava aberta) fechou no servidor.
			setChoices(null)
		})

		socket.on('round:choices', (payload: { options: string[]; seconds: number }) =>
		{
			setChoices(payload)
		})

		socket.on('game:aborted', () =>
		{
			setChoices(null)
			setAborted(true)
		})

		// A conta entrou na mesma sala por outra ligação (outro separador ou o
		// telemóvel a retomar o lugar): esta ligação foi dispensada. Reusa o
		// ecrã do ALREADY_IN_ROOM ("a sala está aberta noutro lado").
		socket.on('room:replaced', () =>
		{
			setError('ALREADY_IN_ROOM')
		})

		// Autorreparação (igual à do lobby): pergunta ao servidor de 5 em 5 s
		// se ainda estamos numa sala. Um 'game:aborted'/fecho perdido com o
		// telemóvel em espera deixava o jogo aberto "fantasma" durante minutos.
		const probe = window.setInterval(() =>
		{
			if (!socket.connected || joining || !everEntered)
				return
			socket.timeout(4000).emit('lobby:sync', {}, (err: unknown, answer?: { ok?: boolean }) =>
			{
				if (err || joining)
					return
				if (answer && answer.ok === false)
				{
					setChoices(null)
					setAborted(true)
				}
			})
		}, 5000)

		socket.on('round:over', ({ word }: { word: string }) =>
		{
			setSecretWord(null)
			setMessages((all) => [...all, { name: '', text: `${tRef.current('game.chat.wordwas')} ${word}`, system: true }])
		})

		socket.on('round:correct', ({ name, points, position }: { name: string; points: number; position: number }) =>
		{
			setMessages((all) => [...all, { name: '', text: `${name} ${tRef.current('game.chat.correctverb')} +${points}`, system: true }])
			setLastCorrect({ name, points, position, at: Date.now() })
		})

		socket.on('chat:message', (message: ChatMessage) =>
		{
			setMessages((all) => [...all, message])
		})

		socket.on('draw:stroke', (stroke: Stroke) =>
		{
			if (canvasRef.current)
				paintSegment(canvasRef.current, stroke)
		})

		socket.on('draw:clear', () =>
		{
			const canvas = canvasRef.current
			canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
		})

		// The reported player gets report:flagged without the tally, so they
		// never learn how many have voted against them.
		socket.on('report:open', (vote: ReportVote) =>
		{
			voteRef.current = vote
			setReportVote(vote)
		})

		socket.on('report:flagged', () => setFlagged(true))

		socket.on('report:closed', ({ expelled: out }: { expelled: boolean }) =>
		{
			const name = voteRef.current?.name
			voteRef.current = null
			setReportVote(null)
			setFlagged(false)

			if (out && name)
				setMessages((all) => [...all, { name: '', text: `${name} ${tRef.current('game.chat.expelledmsg')}`, system: true }])
		})

		socket.on('report:expelled', () =>
		{
			voteRef.current = null
			setReportVote(null)
			setFlagged(false)
			setExpelled(true)
		})

		return () =>
		{
			window.clearInterval(probe)
			socket.disconnect()
			socketRef.current = null
		}
	}, [canvasRef])

	const isDrawer = Boolean(selfId && round?.scores.find((s) => s.id === selfId)?.isDrawer)

	/** With no socket it answers at once, rather than await an ack that never comes. */
	const ask = (event: string, payload: object): Promise<Ack> =>
		new Promise((resolve) =>
		{
			const socket = socketRef.current
			if (!socket)
				return resolve({ ok: false, code: 'NO_SOCKET' })

			socket.emit(event, payload, resolve)
		})

	return {
		code: room?.code ?? null,
		members: room?.members ?? [],
		isDrawer,
		error, // ALREADY_IN_ROOM: a sala ja esta aberta noutro separador
		round,
		messages,
		// What goes in the word slot: the real thing if you are the one drawing.
		wordToShow: (isDrawer && secretWord) || round?.word || round?.maskedWord || '',
		sendStroke: (stroke: Stroke) => socketRef.current?.emit('draw:stroke', stroke),
		sendClear: () => socketRef.current?.emit('draw:clear'),
		sendChat: (text: string) => socketRef.current?.emit('chat:message', { text }),
		/** The vote in progress. Never reaches the player being voted on. */
		reportVote,
		/** You are the reported one: the warning only, no tally, no buttons. */
		flagged,
		expelled,
		startReport: (targetId: string) => ask('report:start', { targetId }),
		voteExpel: () => ask('report:vote', {}),
		/** As 3 palavras à escolha (só o desenhador as tem) e a resposta. */
		choices,
		sendChoice: (word: string) =>
		{
			socketRef.current?.emit('round:choose', { word })
			setChoices(null)
		},
		/** Último acerto da sala, para o banner/confetes de quem acertou. */
		lastCorrect,
		/** Ficaste sozinho a meio: a sala fechou e os pontos perderam-se. */
		aborted,
		/** Saída DELIBERADA: espera a CONFIRMAÇÃO do servidor antes de deixar
		    navegar. Sem esperar, a navegação desligava o socket e podia matar
		    o aviso a meio — e o socket da página seguinte (perfil) recuperava
		    o lugar "abandonado" em silêncio: o jogador voltava à sala como
		    fantasma vivo e a regra do 1-fecha-tudo nunca disparava. O teto de
		    1,5 s garante que o botão nunca fica preso se a rede falhar. */
		leaveRoom: () =>
			Promise.race([
				ask('room:leave', {}),
				new Promise((resolve) => { window.setTimeout(resolve, 1500) }),
			]),
		/** Call after anything that wipes the canvas, such as a resize. */
		repaint: () => repaintRef.current(),
	}
}