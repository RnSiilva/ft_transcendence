/**
 * auth.socket.js
 * Puts a real user behind every socket. The browser sends the same httpOnly
 * cookie on the handshake as on any other request, so the client does nothing
 * special and one place still decides what a valid session is.
 */

const cookie = require('cookie');

const { verifyToken } = require('../auth/auth.middleware');

function userFromHandshake(socket)
{
	const header = socket.handshake.headers.cookie;
	if (!header)
		return null;

	return verifyToken(cookie.parse(header).token);
}

function requireAuthenticatedSocket(socket, next)
{
	const user = userFromHandshake(socket);

	if (!user)
		return next(new Error('UNAUTHORIZED'));

	socket.user = user;
	next();
}

module.exports = { requireAuthenticatedSocket, userFromHandshake };