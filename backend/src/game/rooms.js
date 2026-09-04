/**
 * rooms.js
 * In-memory registry of game rooms.
 *
 * Knows nothing about sockets: state plus the rules for changing it, so it
 * can be exercised on its own. Rounds, words, timers and scoring land here
 * later without the transport layer having to change.
 */

const CODE_LENGTH = 6;
// No O/0/I/1: codes get read out loud and typed by hand.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const MAX_MEMBERS = 8;
// A drawing is a few hundred segments; this only bites on abuse.
const MAX_STROKES = 5000;
const MAX_NAME_LENGTH = 20;

// Chosen when the room is created. The client offers these same options, but
// the server decides — anything it does not recognise falls back to a default.
const ROUND_SECONDS = [30, 60, 80, 120];
const THEMES = ['general', 'animals', 'food', 'movies'];
const LANGUAGES = ['pt', 'en', 'es'];

const DEFAULT_SETTINGS = {
	roundSeconds: 60,
	theme: 'general',
	language: 'pt',
};

/**
 * code -> { code, members, drawerId, strokes, createdAt }
 *
 * `members` is a Map, which preserves insertion order. That order *is* the
 * turn order, so passing the pencil never needs a separate index.
 */
const rooms = new Map();

/** memberId -> code. Finds someone's room on disconnect without scanning. */
const memberRoom = new Map();

function fail(message, code)
{
	const err = new Error(message);
	err.code = code;
	return err;
}

function generateCode()
{
	let code;
	do
	{
		code = Array.from(
		{ length: CODE_LENGTH },
		() => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
		).join('');
	}
	while (rooms.has(code));
	return code;
}

function cleanName(name)
{
	if (typeof name !== 'string')
		throw fail('Name is required', 'INVALID_NAME');

	const trimmed = name.trim();
	if (!trimmed)
		throw fail('Name is required', 'INVALID_NAME');

	return trimmed.slice(0, MAX_NAME_LENGTH);
}

function normaliseCode(code)
{
	if (typeof code !== 'string')
		throw fail('Room code is required', 'INVALID_CODE');
	return code.trim().toUpperCase();
}

/** Never trust what the client sends: unknown values become the default. */
function cleanSettings(raw)
{
	const wanted = raw && typeof raw === 'object' ? raw : {};

	const roundSeconds = Number(wanted.roundSeconds);

	return {
		roundSeconds: ROUND_SECONDS.includes(roundSeconds)
			? roundSeconds
			: DEFAULT_SETTINGS.roundSeconds,
		theme: THEMES.includes(wanted.theme) ? wanted.theme : DEFAULT_SETTINGS.theme,
		language: LANGUAGES.includes(wanted.language)
			? wanted.language
			: DEFAULT_SETTINGS.language,
	};
}

function addMember(room, memberId, name)
{
	room.members.set(memberId, { id: memberId, name });
	memberRoom.set(memberId, room.code);

	if (!room.drawerId)
		room.drawerId = memberId;
}

function createRoom(memberId, name, settings)
{
	const cleanedName = cleanName(name);

	if (memberRoom.has(memberId))
		leaveRoom(memberId);

	const room =
	{
		code: generateCode(),
		members: new Map(),
		drawerId: null,
		strokes: [],
		settings: cleanSettings(settings),
		createdAt: new Date(),
	};

	rooms.set(room.code, room);
	addMember(room, memberId, cleanedName);

	return room;
}

/** Throws if the room is missing or full. */
function joinRoom(memberId, rawCode, name)
{
	const code = normaliseCode(rawCode);
	const cleanedName = cleanName(name);

	const room = rooms.get(code);
	if (!room)
		throw fail('Room not found', 'ROOM_NOT_FOUND');

	const alreadyHere = room.members.has(memberId);
	if (!alreadyHere && room.members.size >= MAX_MEMBERS)
		throw fail('Room is full', 'ROOM_FULL');

	// Leaving the old room first keeps the memberRoom index honest.
	if (memberRoom.get(memberId) !== code)
		leaveRoom(memberId);

	addMember(room, memberId, cleanedName);
	return room;
}

/**
 * Hands the pencil to the next member in join order, wrapping around.
 * Rounds will call this on the timer, so they decide only *when*, never *how*.
 */
function passPencil(room)
{
	const order = [...room.members.keys()];

	if (order.length === 0)
	{
		room.drawerId = null;
		return null;
	}

	// indexOf returning -1 means the drawer is already gone, so (-1 + 1) === 0
	// restarts the rotation from the top, which is what we want.
	const current = order.indexOf(room.drawerId);
	room.drawerId = order[(current + 1) % order.length];

	return room.drawerId;
}

/**
 * Returns the room they left, or null if they were not in one. The room may
 * already be deleted; callers still need it to notify the others.
 */
function leaveRoom(memberId)
{
	const code = memberRoom.get(memberId);
	if (!code)
		return null;

	memberRoom.delete(memberId);

	const room = rooms.get(code);
	if (!room)
		return null;

	// Capture the order before the deletion, otherwise the position of the
	// person leaving is lost and "next" becomes meaningless.
	const orderBefore = [...room.members.keys()];
	const heldPencil = room.drawerId === memberId;

	room.members.delete(memberId);

	if (room.members.size === 0)
	{
		rooms.delete(code);
		room.drawerId = null;
		return room;
	}

	if (heldPencil)
	{
		const from = orderBefore.indexOf(memberId);
		for (let step = 1; step < orderBefore.length; step += 1)
		{
			const candidate = orderBefore[(from + step) % orderBefore.length];
			if (room.members.has(candidate))
			{
				room.drawerId = candidate;
				break;
			}
		}
	}

	return room;
}

/** Kept so a client that joins late, or reloads, gets the board as it stands. */
function recordStroke(room, stroke)
{
	room.strokes.push(stroke);

	// Past the cap the oldest go, degrading the picture rather than the server.
	if (room.strokes.length > MAX_STROKES)
		room.strokes.splice(0, room.strokes.length - MAX_STROKES);
}

function clearStrokes(room)
{
	room.strokes.length = 0;
}

function getRoom(rawCode)
{
	return rooms.get(normaliseCode(rawCode)) || null;
}

function getRoomOf(memberId)
{
	const code = memberRoom.get(memberId);
	return code ? rooms.get(code) || null : null;
}

/** The server decides who may draw. Clients are never asked. */
function isDrawer(memberId)
{
	const room = getRoomOf(memberId);
	return Boolean(room && room.drawerId === memberId);
}

/** Shape sent to clients. Maps do not survive JSON. */
function serialiseRoom(room)
{
	return {
		code: room.code,
		drawerId: room.drawerId,
		settings: room.settings,
		members: [...room.members.values()].map((member) => ({
			id: member.id,
			name: member.name,
			isDrawer: member.id === room.drawerId,
		})),
	};
}

/** Test helper: wipes all state between runs. */
function reset()
{
	rooms.clear();
	memberRoom.clear();
}

module.exports = {
	createRoom,
	joinRoom,
	leaveRoom,
	passPencil,
	recordStroke,
	clearStrokes,
	getRoom,
	getRoomOf,
	isDrawer,
	serialiseRoom,
	reset,
	MAX_MEMBERS,
	ROUND_SECONDS,
	THEMES,
	LANGUAGES,
};