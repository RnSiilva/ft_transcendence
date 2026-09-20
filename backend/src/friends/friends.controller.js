const friendsService = require('./friends.service');
const { getUserSocketIds } = require('./presence');

/* Real-time nudge: after a request/accept/reject/remove, tell both users'
   open tabs to reload their friends list ('friends:changed'). Without this,
   the OTHER side only saw the change after a manual page refresh. */
function notifyFriendsChanged(req, ...userIds) {
  const io = req.app.get('io');
  if (!io) return;
  for (const userId of userIds) {
    for (const socketId of getUserSocketIds(userId)) {
      io.to(socketId).emit('friends:changed');
    }
  }
}

async function getFriends(req, res) {
  try {
    const friends = await friendsService.getFriends(req.user.id);
    res.json({ friends });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function getPendingRequests(req, res) {
  try {
    const requests = await friendsService.getPendingRequests(req.user.id);
    res.json({ requests });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function sendRequest(req, res) {
  try {
    const { username } = req.body;
    const result = await friendsService.sendFriendRequest(req.user.id, username);
    notifyFriendsChanged(req, result.friendship?.senderId, result.friendship?.receiverId);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function acceptRequest(req, res) {
  try {
    const { id } = req.params;
    const result = await friendsService.acceptFriendRequest(req.user.id, id);
    notifyFriendsChanged(req, result.senderId, result.receiverId);
    res.json({ message: 'Friend request accepted', friendship: result });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function rejectRequest(req, res) {
  try {
    const { id } = req.params;
    const result = await friendsService.rejectFriendRequest(req.user.id, id);
    notifyFriendsChanged(req, result.senderId, result.receiverId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function removeFriend(req, res) {
  try {
    const { friendId } = req.params;
    const result = await friendsService.removeFriend(req.user.id, friendId);
    notifyFriendsChanged(req, result.senderId, result.receiverId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = {
  getFriends,
  getPendingRequests,
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
};
