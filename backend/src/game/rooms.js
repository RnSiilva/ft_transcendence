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

const MAX_MEMBERS = 6;
// A reload drops the socket. Holding the seat for a moment keeps a refresh,
// or a brief network hiccup, from costing someone their turn with the pencil.
const RECONNECT_GRACE_MS = 15000;
// A drawing is a few hundred segments; this only bites on abuse.
const MAX_STROKES = 5000;
const MAX_NAME_LENGTH = 20;

// Chosen when the room is created. The client offers these same options, but
// the server decides anything it does not recognise falls back to a default.
const ROUND_SECONDS = [30, 60, 80, 120];
const ROUND_COUNTS = [1, 2, 3, 4, 5];
const THEMES = ['general', 'objects', 'animals', 'food', 'movies'];
const LANGUAGES = ['pt', 'en', 'es'];

const DEFAULT_SETTINGS = {
	rounds: 3,
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
	const rounds = Number(wanted.rounds);
	const maxPlayers = Number(wanted.maxPlayers) || MAX_MEMBERS;

	return {
		rounds: ROUND_COUNTS.includes(rounds) ? rounds : DEFAULT_SETTINGS.rounds,
		roundSeconds: ROUND_SECONDS.includes(roundSeconds)
			? roundSeconds
			: DEFAULT_SETTINGS.roundSeconds,
		theme: THEMES.includes(wanted.theme) ? wanted.theme : DEFAULT_SETTINGS.theme,
		language: LANGUAGES.includes(wanted.language)
			? wanted.language
			: DEFAULT_SETTINGS.language,
		maxPlayers: Math.max(3, Math.min(maxPlayers, MAX_MEMBERS)),
	};
}

/**
 * Identity comes from the session cookie, never from the client payload —
 * otherwise anyone could join under someone else's name.
 */
function identityOf(user)
{
	if (!user || typeof user !== 'object')
		throw fail('Authentication required', 'UNAUTHENTICATED');

	return { userId: user.id, name: cleanName(user.username) };
}

function addMember(room, memberId, identity)
{
	room.members.set(memberId, {
		id: memberId,
		userId: identity.userId,
		name: identity.name,
		disconnectedAt: null,
	});
	memberRoom.set(memberId, room.code);
}

function createRoom(memberId, user, settings)
{
	const identity = identityOf(user);

	if (memberRoom.has(memberId))
		leaveRoom(memberId);

	const room =
	{
		code: generateCode(),
		members: new Map(),
		creatorId: memberId, // Fixed, never changes after creation.
		// drawerId: null,
		strokes: [],
		settings: cleanSettings(settings),
		// Private room: password set by the creator (kept outside `settings`
		// so it is never serialised to clients). null = open room.
		password: typeof settings?.password === 'string' && settings.password.trim()
			? settings.password.trim().slice(0, 32)
			: null,
		createdAt: new Date(),
	};

	rooms.set(room.code, room);
	addMember(room, memberId, identity);

	return room;
}

/** Throws if the room is missing, full, or the user is already inside it. */
function joinRoom(memberId, rawCode, user, password)
{
	const code = normaliseCode(rawCode);
	const identity = identityOf(user);

	const room = rooms.get(code);
	if (!room)
		throw fail('Room not found', 'ROOM_NOT_FOUND');

	const alreadyHere = room.members.has(memberId);

	if (!alreadyHere)
	{
		// Private room: only someone who knows the creator's password gets
		// in. Those already inside (alreadyHere) and those reclaiming their
		// own seat (seizeSeat, checked earlier in room.socket) skip it.
		if (room.password && String(password ?? '') !== room.password)
			throw fail('Wrong password', 'WRONG_PASSWORD');

		if (room.members.size >= (room.settings.maxPlayers || MAX_MEMBERS))
			throw fail('Room is full', 'ROOM_FULL');

		// One seat per account. Two tabs would otherwise take two turns with
		// the pencil, which is worth more than it looks.
		for (const member of room.members.values())
		{
			if (member.userId === identity.userId)
				throw fail('Already in this room', 'ALREADY_IN_ROOM');
		}
	}

	// Leaving the old room first keeps the memberRoom index honest.
	if (memberRoom.get(memberId) !== code)
		leaveRoom(memberId);

	addMember(room, memberId, identity);
	return room;
}

/**
 * Hands the pencil to the next member in join order, wrapping around.
 * Rounds will call this on the timer, so they decide only *when*, never *how*.
 */
function nextDrawerId(room, currentDrawerId)
{
	const order = [...room.members.keys()];

	if (order.length === 0)
		return null;

	// indexOf returning -1 means the drawer is already gone, so (-1 + 1) === 0
	// restarts the rotation from the top, which is what we want.
	const current = order.indexOf(currentDrawerId);

	return order[(current + 1) % order.length];
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

	room.members.delete(memberId);

	if (room.members.size === 0)
		rooms.delete(code);

	return room;
}

/**
 * Holds someone's seat instead of removing them. They keep their place in the
 * turn order and the pencil, if they had it, until the grace period runs out.
 */
function markAbsent(memberId, now = Date.now())
{
	const room = getRoomOf(memberId);
	const member = room && room.members.get(memberId);

	if (!member)
		return null;

	member.disconnectedAt = now;
	return room;
}

/**
 * Gives a returning player their old seat, with the new connection in place of
 * the dead one. The Map is rebuilt in the same order so they do not fall to the
 * back of the queue for having reloaded.
 */
function reclaimSeat(newMemberId, user, now = Date.now())
{
	if (!user)
		return null;

	for (const room of rooms.values())
	{
		const seat = [...room.members.values()].find(
			(member) => member.userId === user.id && member.disconnectedAt,
		);

		if (!seat)
			continue;

		const oldMemberId = seat.id;   // save before overwriting

		room.members = new Map(
			[...room.members.entries()].map(([id, member]) =>
				id === seat.id
					? [newMemberId, { ...member, id: newMemberId, disconnectedAt: null }]
					: [id, member],
			),
		);

		memberRoom.delete(seat.id);
		memberRoom.set(newMemberId, room.code);

		return { room, oldMemberId };
	}

	return null;
}

/**
 * The account reclaims its OWN seat: the same user joining the room through a
 * new connection (reopened the game on their phone, another tab) keeps the
 * seat that was already theirs — points and turn preserved — and the old
 * connection is dropped by the caller. Without this, a zombie connection (dead
 * without notice) locked the owner out of the room ('ALREADY_IN_ROOM') until
 * the timeout. There is still ONE seat per account: never two pencils.
 */
function seizeSeat(newMemberId, rawCode, user)
{
	const code = normaliseCode(rawCode);
	const room = rooms.get(code);
	if (!room || !user)
		return null;

	const seat = [...room.members.values()].find(
		(member) => member.userId === user.id && member.id !== newMemberId,
	);
	if (!seat)
		return null;

	const oldMemberId = seat.id;

	// The new connection may be in another room: leave it first, as in joinRoom.
	if (memberRoom.get(newMemberId) && memberRoom.get(newMemberId) !== code)
		leaveRoom(newMemberId);

	room.members = new Map(
		[...room.members.entries()].map(([id, member]) =>
			id === oldMemberId
				? [newMemberId, { ...member, id: newMemberId, disconnectedAt: null }]
				: [id, member],
		),
	);

	memberRoom.delete(oldMemberId);
	memberRoom.set(newMemberId, code);

	return { room, oldMemberId };
}

/** Milliseconds before an absent member loses their seat, or null if present. */
function absenceLeft(member, now = Date.now())
{
	if (!member.disconnectedAt)
		return null;

	return Math.max(0, RECONNECT_GRACE_MS - (now - member.disconnectedAt));
}

/** Every room that currently exists, for the game loop to walk through. */
function activeRooms()
{
	return [...rooms.values()];
}

/** Rooms where someone is away, so their countdown can keep being sent out. */
function roomsWithAbsentees()
{
	return [...rooms.values()].filter((room) =>
		[...room.members.values()].some((member) => member.disconnectedAt),
	);
}

/**
 * Removes whoever stayed away too long.
 * Returns { room, memberId } pairs — the caller needs both, to tell the room
 * and to settle whatever the person leaving had going.
 */
function dropAbsent(now = Date.now())
{
	const dropped = [];

	for (const room of [...rooms.values()])
	{
		for (const member of [...room.members.values()])
		{
			if (member.disconnectedAt && absenceLeft(member, now) === 0)
			{
				const left = leaveRoom(member.id);
				if (left)
					dropped.push({ room: left, memberId: member.id });
			}
		}
	}

	return dropped;
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

/** Shape sent to clients. Maps do not survive JSON. */
function serialiseRoom(room, now = Date.now())
{
	return {
		code: room.code,
		creatorId: room.creatorId,   // The front end needs to know who the owner is.
		settings: room.settings,
		members: [...room.members.values()].map((member) => ({
			id: member.id,
			userId: member.userId,
			name: member.name,
			// Non-null while someone is away: the others can show the wait.
			msToDrop: absenceLeft(member, now),
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
	nextDrawerId,
	markAbsent,
	reclaimSeat,
	seizeSeat,
	dropAbsent,
	absenceLeft,
	roomsWithAbsentees,
	activeRooms,
	recordStroke,
	clearStrokes,
	getRoom,
	getRoomOf,
	serialiseRoom,
	reset,
	MAX_MEMBERS,
	RECONNECT_GRACE_MS,
	ROUND_SECONDS,
	ROUND_COUNTS,
	THEMES,
	LANGUAGES,
};