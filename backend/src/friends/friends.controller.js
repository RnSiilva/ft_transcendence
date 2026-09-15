const friendsService = require('./friends.service');

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
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function acceptRequest(req, res) {
  try {
    const { id } = req.params;
    const result = await friendsService.acceptFriendRequest(req.user.id, id);
    res.json({ message: 'Friend request accepted', friendship: result });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function rejectRequest(req, res) {
  try {
    const { id } = req.params;
    const result = await friendsService.rejectFriendRequest(req.user.id, id);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function removeFriend(req, res) {
  try {
    const { friendId } = req.params;
    const result = await friendsService.removeFriend(req.user.id, friendId);
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
