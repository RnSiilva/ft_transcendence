/**
 * auth.socket.js
 * Puts a real user behind every socket. The browser sends the same httpOnly
 * cookie on the handshake as on any other request, so the client does nothing
 * special and one place still decides what a valid session is.
 */

const cookie = require('cookie');

const { verifyToken } = require('../auth/auth.middleware');
const { getUserById } = require('../auth/auth.service');

function userFromHandshake(socket)
{
	const header = socket.handshake.headers.cookie;
	if (!header)
		return null;

	return verifyToken(cookie.parse(header).token);
}

async function requireAuthenticatedSocket(socket, next)
{
	const jwtUser = userFromHandshake(socket);

	if (!jwtUser)
		return next(new Error('UNAUTHORIZED'));

	try {
		const dbUser = await getUserById(jwtUser.id);
		if (!dbUser)
			return next(new Error('UNAUTHORIZED'));

		socket.user = { 
			id: dbUser.id, 
			username: dbUser.username, 
			avatarUrl: dbUser.avatarUrl 
		};
		next();
	} catch (err) {
		return next(new Error('UNAUTHORIZED'));
	}
}

module.exports = { requireAuthenticatedSocket, userFromHandshake };