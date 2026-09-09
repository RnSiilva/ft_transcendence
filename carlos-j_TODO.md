# TODO:
- ✅ add friends section not yet translated (Pedido enviado a dsfsd)
- ✅ user online state (connected do socketi.io; socket connected = online?), no extra table, mapped on the server side
- ✅ implement friends functionality (id, user_id, friend_id, state (pending/accepted), created_on) possibility to search and send invite, accept, reject, remove friends, with state online/offline
- ✅ 42 login (our implementation doesn't allow usernames with "-" on it, but 42 does. also, when loging in or registering with 42 account, we should have the option to confirm that we will use the data provided, like username, email, etc or if we wanna change them. there's the possibility to login with 42 and an account with the same email already exists or the username is taken)
- ✅ when login in/out, the "profile/login" text on the top bar doesn't change automatically until we refresh the page...
- ✅ "Username already taken" is not translated


# IDEAS:

- "please fill out this field" not translated when hovering input fields, like in the login/register page
- there will be a feature to report a player/room/draw, but who will it report to? email to the admin? since we won't save any details of the rooms/drawings besides the final points and winners, how can we "save" a report of a drawing? send a snapshot of the drawing + full chat history on the moment of report? what will it be used for? will we have an admin profile and dashboard with previleges to edit/delete users that do malicious things? game rules #9: Reporting a player: the first occurrence of the same reason results in a warning; repeat occurrences result in removal from the room.

- notification on profile (1) when a friend request is received

- (NOT MY PART) instead of showing the available rooms/create room on the player's profile, show them on the main page, where currently is the "game image · placeholder"; if the user is not logged in, just show the "play" button

- (NOT MY PART/NOT TO IMPLEMENT YET) possibility for the admin to invite ONLINE friends to chat rooms (?) if they are not online, we can't invite them. see how fast it is to change status when a person logs in

- (NOT MY PART) the "admin" is the person that creates the room and starts the game, but he doesn't have any more responsabilities after that. he can leave the room mid-game and the game will still procceed

- what is the drawing made under "Play", above the "about us" section? is it an hat? what's the meaning?

- "Garatuja Games, Ltd" -> sugestão "Rabisco, Ltd."

- (NOT MY PART kind of) hability to send friend requests inside a game room

- test modifying the vite connection to a specific ip:port so that every person connected to the same network can open the game
