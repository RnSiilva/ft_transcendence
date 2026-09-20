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

/* Live socket IDs for a user (empty array when offline). Lets the friends
   API push "something changed" to the other side of a request in real time. */
function getUserSocketIds(userId) {
  if (!userId) return [];
  return [...(userSockets.get(Number(userId)) || [])];
}

module.exports = {
  markUserOnline,
  markUserOffline,
  isUserOnline,
  getUserSocketIds,
};
