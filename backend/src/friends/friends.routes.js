const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const friendsController = require('./friends.controller');

const router = express.Router();

// All friends endpoints require an authenticated user
router.use(requireAuth);

router.get('/', friendsController.getFriends);
router.get('/pending', friendsController.getPendingRequests);
router.post('/request', friendsController.sendRequest);
router.post('/accept/:id', friendsController.acceptRequest);
router.post('/reject/:id', friendsController.rejectRequest);
router.delete('/:friendId', friendsController.removeFriend);

module.exports = router;
