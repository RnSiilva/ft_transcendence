const { PrismaClient } = require('@prisma/client');
const { isUserOnline } = require('./presence');

const prisma = new PrismaClient();

/**
 * Returns all accepted friends for the given user, enriched with live online status.
 */
async function getFriends(userId) {
  const friendships = await prisma.friend.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    },
    include: {
      // gamesPlayed/wins/achievements incluídos para o perfil público do
      // amigo mostrar estatísticas e conquistas REAIS (pedido do Thiago).
      sender: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          rank: true,
          totalPoints: true,
          gamesPlayed: true,
          wins: true,
          achievements: { select: { achievement: { select: { nameKey: true } } } },
        },
      },
      receiver: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          rank: true,
          totalPoints: true,
          gamesPlayed: true,
          wins: true,
          achievements: { select: { achievement: { select: { nameKey: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return friendships.map((f) => {
    const isSender = f.senderId === userId;
    const friend = isSender ? f.receiver : f.sender;
    let relationshipStatus = 'ACCEPTED';
    if (f.status === 'PENDING') {
      relationshipStatus = isSender ? 'SENT_PENDING' : 'RECEIVED_PENDING';
    }
    return {
      friendshipId: f.id,
      id: friend.id,
      username: friend.username,
      avatarUrl: friend.avatarUrl,
      rank: friend.rank,
      totalPoints: friend.totalPoints,
      gamesPlayed: friend.gamesPlayed,
      wins: friend.wins,
      achievements: friend.achievements,
      isOnline: isUserOnline(friend.id),
      status: relationshipStatus,
      since: f.createdAt,
    };
  });
}

/**
 * Returns all incoming pending friend requests for the user.
 */
async function getPendingRequests(userId) {
  const requests = await prisma.friend.findMany({
    where: {
      receiverId: userId,
      status: 'PENDING',
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          rank: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((r) => ({
    requestId: r.id,
    sender: r.sender,
    createdAt: r.createdAt,
  }));
}

/**
 * Sends a friend request by target username.
 * If target has already sent a request to the user, auto-accepts the friendship.
 */
async function sendFriendRequest(userId, targetUsername) {
  if (!targetUsername || typeof targetUsername !== 'string') {
    const err = new Error('Target username is required');
    err.status = 400;
    throw err;
  }

  const cleanUsername = targetUsername.trim();
  const target = await prisma.user.findUnique({
    where: { username: cleanUsername },
  });

  if (!target) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  if (target.id === userId) {
    const err = new Error('You cannot send a friend request to yourself');
    err.status = 400;
    throw err;
  }

  // Check if a relationship already exists in either direction
  const existing = await prisma.friend.findFirst({
    where: {
      OR: [
        { senderId: userId, receiverId: target.id },
        { senderId: target.id, receiverId: userId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') {
      const err = new Error('You are already friends with this user');
      err.status = 400;
      throw err;
    }

    if (existing.senderId === userId && existing.status === 'PENDING') {
      const err = new Error('Friend request already sent');
      err.status = 400;
      throw err;
    }

    // Mutual request: target already sent request to user -> auto accept!
    if (existing.senderId === target.id && existing.status === 'PENDING') {
      const updated = await prisma.friend.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED' },
      });
      return { status: 'ACCEPTED', message: 'Friend request accepted', friendship: updated };
    }

    // If previously rejected, reopen request
    const reopened = await prisma.friend.update({
      where: { id: existing.id },
      data: {
        senderId: userId,
        receiverId: target.id,
        status: 'PENDING',
      },
    });
    return { status: 'PENDING', message: 'Friend request sent', friendship: reopened };
  }

  const created = await prisma.friend.create({
    data: {
      senderId: userId,
      receiverId: target.id,
      status: 'PENDING',
    },
  });

  return { status: 'PENDING', message: 'Friend request sent', friendship: created };
}

/**
 * Accepts an incoming pending friend request.
 */
async function acceptFriendRequest(userId, requestId) {
  const request = await prisma.friend.findUnique({
    where: { id: Number(requestId) },
  });

  if (!request || request.receiverId !== userId || request.status !== 'PENDING') {
    const err = new Error('Friend request not found');
    err.status = 404;
    throw err;
  }

  const updated = await prisma.friend.update({
    where: { id: Number(requestId) },
    data: { status: 'ACCEPTED' },
  });

  return updated;
}

/**
 * Rejects / removes a pending friend request.
 */
async function rejectFriendRequest(userId, requestId) {
  const request = await prisma.friend.findUnique({
    where: { id: Number(requestId) },
  });

  if (!request || request.receiverId !== userId) {
    const err = new Error('Friend request not found');
    err.status = 404;
    throw err;
  }

  await prisma.friend.delete({
    where: { id: Number(requestId) },
  });

  // senderId/receiverId: para o controller avisar os dois lados por socket.
  return { message: 'Friend request rejected', senderId: request.senderId, receiverId: request.receiverId };
}

/**
 * Removes an existing friendship between two users.
 */
async function removeFriend(userId, friendId) {
  const fId = Number(friendId);
  const friendship = await prisma.friend.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { senderId: userId, receiverId: fId },
        { senderId: fId, receiverId: userId },
      ],
    },
  });

  if (!friendship) {
    const err = new Error('Friendship not found');
    err.status = 404;
    throw err;
  }

  await prisma.friend.delete({
    where: { id: friendship.id },
  });

  // senderId/receiverId: para o controller avisar os dois lados por socket.
  return { message: 'Friend removed', senderId: friendship.senderId, receiverId: friendship.receiverId };
}

module.exports = {
  getFriends,
  getPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
};
