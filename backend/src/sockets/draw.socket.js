/**
 * draw.socket.js
 * Relays canvas strokes between the members of a room.
 *
 * Two rules, enforced here rather than in the browser: only the current
 * drawer may draw, and a stroke never leaves the room it was drawn in.
 * Coordinates are normalised to 0..1 so canvases of different sizes match.
 */

const rooms = require('../game/rooms');

const { gameOf } = require('./round.socket');

const isNormalised = (n) =>
	typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

function parseSegment(payload)
{
	if (!payload || typeof payload !== 'object')
		return null;

	const { x0, y0, x1, y1 } = payload;
	if (![x0, y0, x1, y1].every(isNormalised))
		return null;

	const colour = typeof payload.colour === 'string' ? payload.colour : null;

	return { x0, y0, x1, y1, colour };
}

function registerDrawHandlers(io, socket)
{
	socket.on('draw:stroke', (payload) =>
	{
		const room = rooms.getRoomOf(socket.id);
		if (!room)
			return;

		// The client hides the canvas too, but this is the check that counts.
		const game = gameOf(room);
		if (!game || game.drawerId !== socket.id)
			return;

		const segment = parseSegment(payload);
		if (!segment)
			return;

		rooms.recordStroke(room, segment);

		// Everyone in the room except the author, who already painted it.
		socket.to(room.code).emit('draw:stroke', segment);
	});

	socket.on('draw:clear', () =>
	{
		const room = rooms.getRoomOf(socket.id);
		if (!room)
			return;	

		const game = gameOf(room);
		if (!game || game.drawerId !== socket.id)
			return;
		
		rooms.clearStrokes(room);
		socket.to(room.code).emit('draw:clear');
	});

	/** Asked for on join and after a reload, so nobody lands on a blank board. */
	socket.on('draw:history', (_payload, ack) =>
	{
		const room = rooms.getRoomOf(socket.id);
		const strokes = room ? room.strokes : [];

		if (typeof ack === 'function')
			ack(strokes);
		else
			socket.emit('draw:history', strokes);
	});
}

module.exports = { registerDrawHandlers };