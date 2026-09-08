import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

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
}

type RoomState =
{
	code: string
	drawerId: string | null
	members: RoomMember[]
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
	const socketRef = useRef<Socket | null>(null)
	const [room, setRoom] = useState<RoomState | null>(null)
	const [selfId, setSelfId] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() =>
	{
		// Same origin: nginx proxies /socket.io/ through to the backend.
		const socket = io({ withCredentials: true })
		socketRef.current = socket

		const request = (event: string, payload: object): Promise<Ack> =>
			new Promise((resolve) => socket.emit(event, payload, resolve))

		const enterRoom = async () =>
		{
			// The server takes the player's name from the session cookie, so
			// there is nothing to send: it would only be a name to spoof.
			const wanted = new URLSearchParams(window.location.search).get('room')

			let answer = wanted
				? await request('room:join', { code: wanted })
				: await request('room:create', {})

			// Um link de uma sala que ja nao existe cai numa sala nova. Ja
			// estares dentro e outra coisa: abrir outra sala escondia o erro.
			if (!answer.ok && answer.code === 'ALREADY_IN_ROOM')
			{
				setError('ALREADY_IN_ROOM')
				return
			}

			if (!answer.ok)
				answer = await request('room:create', {})

			if (!answer.ok || !answer.room)
			{
				setError(answer.code || 'ROOM_ERROR')
				return
			}

			setError(null)

			const url = new URL(window.location.href)
			url.searchParams.set('room', answer.room.code)
			window.history.replaceState({}, '', url)

			// Catch up on the board, otherwise a reload shows a blank canvas.
			socket.emit('draw:history', {}, (strokes: Stroke[]) =>
			{
				const canvas = canvasRef.current
				if (!canvas || !Array.isArray(strokes))
					return

				strokes.forEach((stroke) => paintSegment(canvas, stroke))
			})
		}

		socket.on('connect', () =>
		{
			setSelfId(socket.id ?? null)
			void enterRoom()
		})

		socket.on('room:state', setRoom)

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

		return () =>
		{
			socket.disconnect()
			socketRef.current = null
		}
	}, [canvasRef])

	/** Temporary: no UI for this yet, so the P key moves the pencil along. */
	useEffect(() =>
	{
		const onKey = (event: KeyboardEvent) =>
		{
			const typing = event.target instanceof HTMLInputElement
			if (typing || event.key.toLowerCase() !== 'p')
				return

			socketRef.current?.emit('room:next-drawer')
		}

		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [])

	const isDrawer = Boolean(selfId && room && room.drawerId === selfId)

	return {
		code: room?.code ?? null,
		members: room?.members ?? [],
		isDrawer,
		error, // ALREADY_IN_ROOM: a sala ja esta aberta noutro separador
		sendStroke: (stroke: Stroke) => socketRef.current?.emit('draw:stroke', stroke),
		sendClear: () => socketRef.current?.emit('draw:clear'),
	}
}