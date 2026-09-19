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
	avatarUrl?: string | null
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
	avatarUrl?: string | null
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
	secondsLeft: number
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
	// The socket effect runs only once; the ref always gives it the t for the
	// current language without having to rewire the listeners on every language change.
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
	const [reportVotes, setReportVotes] = useState<ReportVote[]>([])
	const [votedReportIds, setVotedReportIds] = useState<Set<string>>(new Set())
	const [flagged, setFlagged] = useState(false)
	const [expelled, setExpelled] = useState(false)
	// The room closed mid-game (only one player left): no one gets the points.
	const [aborted, setAborted] = useState(false)
	// Different from `aborted`: here the ROOM continues for the others — only THIS
	// player left/was removed (e.g. the inactivity grace period expired).
	// The message must not say "no one gains points": the others do.
	const [dropped, setDropped] = useState(false)
	// The 3 words offered to the drawer (only they receive them from the server).
	const [choices, setChoices] = useState<{ options: string[]; seconds: number } | null>(null)
	// Last correct guess announced by the room — feeds the banner/confetti.
	const [lastCorrect, setLastCorrect] = useState<
		{ name: string; points: number; position: number; at: number } | null
	>(null)
	useEffect(() =>
	{
		// Same origin: nginx proxies /socket.io/ through to the backend.
		const socket = io({ withCredentials: true })
		socketRef.current = socket

		const request = (event: string, payload: object): Promise<Ack> =>
			new Promise((resolve) => socket.emit(event, payload, resolve))

		// Were we ever inside the room on this page? On a failed RECONNECT
		// (the room died while the phone was idle) the game ended — never
		// silently create a new room, or the player ends up alone in a ghost
		// game without realising it.
		let everEntered = false
		// Entry/re-entry in progress: the probe below must not draw
		// conclusions in the middle of a room:join that has no reply yet.
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
					// Failed reconnect: the seat is no longer ours (the room may well
					// continue for the others) — "you were removed", not "aborted".
					setDropped(true)
					return
				}

				// A link to a full or non-existent room should show an error,
				// rather than silently dumping the user into a brand new empty room.
								if (
					answer.code === 'ROOM_FULL' ||
					answer.code === 'ROOM_NOT_FOUND' ||
					answer.code === 'ROOM_BANNED'
				)
				{
					setError(answer.code)
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
			// The word arrived: the choice (if it was open) closed on the server.
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

		// The account entered the same room via another connection (another tab or
		// the phone reclaiming the seat): this connection was discarded. Reuses the
		// ALREADY_IN_ROOM screen ("the room is open somewhere else").
		socket.on('room:replaced', () =>
		{
			setError('ALREADY_IN_ROOM')
		})

		// Self-healing (same as the lobby's): asks the server every 5 s whether we
		// are still in a room. A missed 'game:aborted'/close while the phone was
		// idle would leave the game open as a "ghost" for minutes.
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
					// We are no longer in the room, but it may continue without us:
					// "you were removed", not "the room closed for everyone".
					setChoices(null)
					setDropped(true)
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
			setReportVotes((all) => [...all.filter((item) => item.targetId !== vote.targetId), vote])
		})

		socket.on('report:tick', ({ targetId, secondsLeft }: { targetId: string; secondsLeft: number }) =>
		{
			setReportVotes((all) => all.map((vote) =>
				vote.targetId === targetId ? { ...vote, secondsLeft } : vote))
		})

		socket.on('report:flagged', () => setFlagged(true))

		socket.on('report:closed', ({ targetId, targetName, expelled: out }: { targetId: string; targetName: string; expelled: boolean }) =>
		{
			setReportVotes((all) => all.filter((vote) => vote.targetId !== targetId))
			setVotedReportIds((all) => {
				const next = new Set(all)
				next.delete(targetId)
				return next
			})
			setFlagged(false)

			if (out && targetName)
				setMessages((all) => [...all, { name: '', text: `${targetName} ${tRef.current('game.chat.expelledmsg')}`, system: true }])
		})

		socket.on('report:expelled', () =>
		{
			setReportVotes([])
			setVotedReportIds(new Set())
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
		error, // ALREADY_IN_ROOM: the room is already open in another tab
		round,
		messages,
		// What goes in the word slot: the real thing if you are the one drawing.
		wordToShow: (isDrawer && secretWord) || round?.word || round?.maskedWord || '',
		sendStroke: (stroke: Stroke) => socketRef.current?.emit('draw:stroke', stroke),
		sendClear: () => socketRef.current?.emit('draw:clear'),
		sendChat: (text: string) => socketRef.current?.emit('chat:message', { text }),
		addNotice: (text: string) => setMessages((all) => [...all, { name: '', text, system: true }]),
		/** Votes in progress. Never includes the player being voted on. */
		reportVotes,
		/** True if this user already started or joined this vote. */
		hasVoted: (targetId: string) => votedReportIds.has(targetId),
		/** You are the reported one: the warning only, no tally, no buttons. */
		flagged,
		expelled,
		startReport: async (targetId: string) =>
		{
			const answer = await ask('report:start', { targetId })
			if (answer.ok)
				setVotedReportIds((all) => new Set(all).add(targetId))
			return answer
		},
		voteExpel: (targetId: string) =>
		{
			setVotedReportIds((all) => new Set(all).add(targetId))
			return ask('report:vote', { targetId })
		},
		/** The 3 words to choose from (only the drawer has them) and the answer. */
		choices,
		sendChoice: (word: string) =>
		{
			socketRef.current?.emit('round:choose', { word })
			setChoices(null)
		},
		/** The room's last correct guess, for the banner/confetti of whoever got it. */
		lastCorrect,
		/** You were left alone mid-game: the room closed and the points were lost. */
		aborted,
		/** Only YOU left/were removed; the room continues for the others. */
		dropped,
		/** DELIBERATE exit: waits for the server's CONFIRMATION before allowing
		    navigation. Without waiting, navigating would disconnect the socket and
		    could kill the notice mid-way — and the next page's socket (profile)
		    would silently reclaim the "abandoned" seat: the player would return to
		    the room as a live ghost and the one-closes-everything rule would never
		    fire. The 1.5 s cap ensures the button never gets stuck if the network fails. */
		leaveRoom: () =>
			Promise.race([
				ask('room:leave', {}),
				new Promise((resolve) => { window.setTimeout(resolve, 1500) }),
			]),
		/** Call after anything that wipes the canvas, such as a resize. */
		repaint: () => repaintRef.current(),
	}
}
