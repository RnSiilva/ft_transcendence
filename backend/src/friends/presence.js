/**
 * In-memory user presence registry.
 * Maps userId -> Set of active socket IDs.
 * Fast, lightweight, and requires no database queries for online/offline checks.
 */
const userSockets = new Map();

function markUserOnline(userId, socketId) {
  if (!userId || !socketId) return;
  const id = Number(userId);
  if (!userSockets.has(id)) {
    userSockets.set(id, new Set());
  }
  userSockets.get(id).add(socketId);
}

function markUserOffline(socketId) {
  for (const [userId, sockets] of userSockets.entries()) {
    if (sockets.has(socketId)) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        userSockets.delete(userId);
      }
      return userId;
    }
  }
  return null;
}

function isUserOnline(userId) {
  if (!userId) return false;
  const id = Number(userId);
  return userSockets.has(id) && userSockets.get(id).size > 0;
}

module.exports = {
  markUserOnline,
  markUserOffline,
  isUserOnline,
};
