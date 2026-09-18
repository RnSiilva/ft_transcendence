# ft_transcendence Requirements Tracker

**Target: 14 points required.**
*(Major modules = 2 points, Minor modules = 1 point)*

---

## Chapter III: Mandatory Part

### General Requirements
- 🟢 The project must be a web application, and requires a frontend, backend, and a database.
- 🟢 Git must be used with clear and meaningful commit messages. The repository must show:
  - 🟢 Commits from all team members.
  - 🟢 Clear commit messages describing the changes.
  - 🟢 Proper work distribution across the team.
- 🟢 Deployment must use a containerization solution (Docker, Podman, or equivalent) and run with a single command.
- 🔴 Your website must be compatible with the latest stable version of Google Chrome.
- 🔴 No warnings or errors about the Javascript code should appear in the browser console.
- 🟡 The project must include accessible Privacy Policy and Terms of Service pages with relevant content.
  - 🟢 Be easily accessible from the application (e.g., footer links).
  - 🔴 Contain relevant and appropriate content for your project.
  - 🟢 Not be placeholder or empty pages.
- 🟢 Multi-user Support (Mandatory): Your website must support multiple users simultaneously.
  - 🟢 Multiple users can be logged in and active at the same time.
  - 🟢 Concurrent actions by different users are handled properly.
  - 🟢 Real-time updates are reflected across all connected users when applicable.
  - 🟢 No data corruption or race conditions occur with simultaneous user actions.

### Technical Requirements
- 🟢 A frontend that is clear, responsive, and accessible across all devices.
- 🟢 Use a CSS framework or styling solution of your choice.
- 🟢 Store credentials (API keys, environment variables, etc.) in a local .env file that is ignored by Git, and provide an .env.example file.
- 🟢 The database must have a clear schema and well-defined relations.
- 🟢 Your application must have a basic user management system. Users must be able to sign up and log in securely:
  - 🟢 At minimum: email and password authentication with proper security (hashed passwords, salted, etc.).
  - 🟢 Additional authentication methods (OAuth, 2FA, etc.) can be implemented via modules.
- 🟢 All forms and user inputs must be properly validated in both the frontend and backend.
- 🔴 Any connection to the backend, from a browser, from a script, from an external API, etc., must use HTTPS.

---

## Chapter IV: Modules

### IV.1 Web *(11 points)*
- 🟢 **Major (2pt):** Use a framework for both the frontend and backend.
  - 🟢 Use a frontend framework (React, Vue, Angular, Svelte, etc.).
  - 🟢 Use a backend framework (Express, NestJS, Django, Flask, Ruby on Rails, etc.).
- 🟡 **Minor (1pt):** Use a frontend framework. ***(N/A)***
- 🟡 **Minor (1pt):** Use a backend framework. ***(N/A)***
- 🟢 **Major (2pt):** Implement real-time features using WebSockets or similar technology.
  - 🟢 Real-time updates across clients.
  - 🟢 Handle connection/disconnection gracefully.
  - 🟢 Efficient message broadcasting.
- 🟢 **Major (2pt):** Allow users to interact with other users. The minimum requirements are:
  - 🟢 A basic chat system (send/receive messages between users).
  - 🟢 A profile system (view user information).
  - 🟢 A friends system (add/remove friends, see friends list).
- 🔴 **Major (2pt):** A public API to interact with the database with a secured API key, rate limiting, documentation, and at least 5 endpoints:
  - 🔴 GET /api/{something}
  - 🔴 POST /api/{something}
  - 🔴 PUT /api/{something}
  - 🔴 DELETE /api/{something}
- 🟢 **Minor (1pt):** Use an ORM for the database.
- 🔴 **Minor (1pt):** A complete notification system for all creation, update, and deletion actions.
- 🟢 **Minor (1pt):** Real-time collaborative features (shared workspaces, live editing, collaborative drawing, etc.).
- 🔴 **Minor (1pt):** Server-Side Rendering (SSR) for improved performance and SEO.
- 🔴 **Minor (1pt):** Progressive Web App (PWA) with offline support and installability.
- 🔴 **Minor (1pt):** Custom-made design system with reusable components, including a proper color palette, typography, and icons (minimum: 10 reusable components).
- 🔴 **Minor (1pt):** Implement advanced search functionality with filters, sorting, and pagination.
- 🔴 **Minor (1pt):** File upload and management system.
  - 🔴 Support multiple file types (images, documents, etc.).
  - 🔴 Client-side and server-side validation (type, size, format).
  - 🔴 Secure file storage with proper access control.
  - 🔴 File preview functionality where applicable.
  - 🔴 Progress indicators for uploads.
  - 🔴 Ability to delete uploaded files.

### IV.2 Accessibility and Internationalization *(1 point)*
- 🔴 **Major (2pt):** Complete accessibility compliance (WCAG 2.1 AA) with screen reader support, keyboard navigation, and assistive technologies.
- 🟢 **Minor (1pt):** Support for multiple languages (at least 3 languages).
  - 🟢 Implement i18n (internationalization) system.
  - 🟢 At least 3 complete language translations.
  - 🟢 Language switcher in the UI.
  - 🟢 All user-facing text must be translatable.
- 🔴 **Minor (1pt):** Right-to-left (RTL) language support.
  - 🔴 Support for at least one RTL language (Arabic, Hebrew, etc.).
  - 🔴 Complete layout mirroring (not just text direction).
  - 🔴 RTL-specific UI adjustments where needed.
  - 🔴 Seamless switching between LTR and RTL.
- 🔴 **Minor (1pt):** Support for additional browsers.
  - 🔴 Full compatibility with at least 2 additional browsers (Firefox, Safari, Edge, etc.).
  - 🔴 Test and fix all features in each browser.
  - 🔴 Document any browser-specific limitations.
  - 🔴 Consistent UI/UX across all supported browsers.

### IV.3 User Management *(3 points)*
- 🟢 **Major (2pt):** Standard user management and authentication.
  - 🟢 Users can update their profile information.
  - 🟢 Users can upload an avatar (with a default avatar if none provided).
  - 🟢 Users can add other users as friends and see their online status.
  - 🟢 Users have a profile page displaying their information.
- 🟢 **Minor (1pt):** Game statistics and match history (requires a game module).
  - 🟢 Track user game statistics (wins, losses, ranking, level, etc.).
  - 🟢 Display match history (1v1 games, dates, results, opponents).
  - 🟢 Show achievements and progression.
  - 🟢 Leaderboard integration.
- 🔴 **Minor (1pt):** Implement remote authentication with OAuth 2.0 (Google, GitHub, 42, etc.).
- 🔴 **Major (2pt):** Advanced permissions system:
  - 🔴 View, edit, and delete users (CRUD).
  - 🔴 Roles management (admin, user, guest, moderator, etc.).
  - 🔴 Different views and actions based on user role.
- 🔴 **Major (2pt):** An organization system:
  - 🔴 Create, edit, and delete organizations.
  - 🔴 Add users to organizations.
  - 🔴 Remove users from organizations.
  - 🔴 View organizations and allow users to perform specific actions within an organization (minimum: create, read, update).
- 🔴 **Minor (1pt):** Implement a complete 2FA (Two-Factor Authentication) system for the users.
- 🔴 **Minor (1pt):** User activity analytics and insights dashboard.

### IV.4 Artificial Intelligence *(0 points)*
- 🔴 **Major (2pt):** Introduce an AI Opponent for games.
  - 🔴 The AI must be challenging and able to win occasionally.
  - 🔴 The AI should simulate human-like behavior (not perfect play).
  - 🔴 If you implement game customization options, the AI must be able to use them.
  - 🔴 You must be able to explain your AI implementation during evaluation.
- 🔴 **Major (2pt):** Implement a complete RAG (Retrieval-Augmented Generation) system.
  - 🔴 Interact with a large dataset of information.
  - 🔴 Users can ask questions and get relevant answers.
  - 🔴 Implement proper context retrieval and response generation.
- 🔴 **Major (2pt):** Implement a complete LLM system interface.
  - 🔴 Generate text and/or images based on user input.
  - 🔴 Handle streaming responses properly.
  - 🔴 Implement error handling and rate limiting.
- 🔴 **Major (2pt):** Recommendation system using machine learning.
  - 🔴 Personalized recommendations based on user behavior.
  - 🔴 Collaborative filtering or content-based filtering.
  - 🔴 Continuously improve recommendations over time.
- 🔴 **Minor (1pt):** Content moderation AI (auto moderation, auto deletion, auto warning, etc.)
- 🔴 **Minor (1pt):** Voice/speech integration for accessibility or interaction.
- 🔴 **Minor (1pt):** Sentiment analysis for user-generated content.
- 🔴 **Minor (1pt):** Image recognition and tagging system.

### IV.5 Cybersecurity *(0 points)*
- 🔴 **Major (2pt):** Implement WAF/ModSecurity (hardened) + HashiCorp Vault for secrets:
  - 🔴 Configure strict ModSecurity/WAF.
  - 🔴 Manage secrets in Vault (API keys, credentials, environment variables), encrypted and isolated.

### IV.6 Gaming and user experience *(4 points)*
- 🟢 **Major (2pt):** Implement a complete web-based game where users can play against each other.
  - 🟢 The game can be real-time multiplayer (e.g., Pong, Chess, Tic-Tac-Toe, Card games, etc.).
  - 🟢 Players must be able to play live matches.
  - 🟢 The game must have clear rules and win/loss conditions.
  - 🟢 The game can be 2D or 3D.
- 🟢 **Major (2pt):** Remote players — Enable two players on separate computers to play the same game in real-time.
  - 🟢 Handle network latency and disconnections gracefully.
  - 🟢 Provide a smooth user experience for remote gameplay.
  - 🟢 Implement reconnection logic.
- 🟢 **Major (2pt):** Multiplayer game (more than two players).
  - 🟢 Support for three or more players simultaneously.
  - 🟢 Fair gameplay mechanics for all participants.
  - 🟢 Proper synchronization across all clients.
- 🔴 **Major (2pt):** Add another game with user history and matchmaking.
  - 🔴 Implement a second distinct game.
  - 🔴 Track user history and statistics for this game.
  - 🔴 Implement a matchmaking system.
  - 🔴 Maintain performance and responsiveness.
- 🔴 **Major (2pt):** Implement advanced 3D graphics using a library like Three.js or Babylon.js.
  - 🔴 Create an immersive 3D environment.
  - 🔴 Implement advanced rendering techniques.
  - 🔴 Ensure smooth performance and user interaction.
- 🔴 **Minor (1pt):** Advanced chat features (enhances the basic chat from "User interaction" module).
  - 🔴 Ability to block users from messaging you.
  - 🔴 Invite users to play games directly from chat.
  - 🔴 Game/tournament notifications in chat.
  - 🔴 Access to user profiles from chat interface.
  - 🔴 Chat history persistence.
  - 🔴 Typing indicators and read receipts.
- 🔴 **Minor (1pt):** Implement a tournament system.
  - 🔴 Clear matchup order and bracket system.
  - 🔴 Track who plays against whom.
  - 🔴 Matchmaking system for tournament participants.
  - 🔴 Tournament registration and management.
- 🔴 **Minor (1pt):** Game customization options.
  - 🔴 Power-ups, attacks, or special abilities.
  - 🔴 Different maps or themes.
  - 🟢 Customizable game settings.
  - 🟢 Default options must be available.
- 🟢 **Minor (1pt):** A gamification system to reward users for their actions.
  - 🟢 Implement at least 3 of the following: achievements, badges, leaderboards, XP/level system, daily challenges, rewards
  - 🟢 System must be persistent (stored in database)
  - 🟢 Visual feedback for users (notifications, progress bars, etc.)
  - 🟢 Clear rules and progression mechanics
- 🔴 **Minor (1pt):** Implement spectator mode for games.
  - 🔴 Allow users to watch ongoing games.
  - 🔴 Real-time updates for spectators.
  - 🔴 Optional: spectator chat.

### IV.7 Devops *(0 points)*
- 🔴 **Major (2pt):** Infrastructure for log management using ELK (Elasticsearch, Logstash, Kibana).
  - 🔴 Elasticsearch to store and index logs.
  - 🔴 Logstash to collect and transform logs.
  - 🔴 Kibana for visualization and dashboards.
  - 🔴 Implement log retention and archiving policies.
  - 🔴 Secure access to all components.
- 🔴 **Major (2pt):** Monitoring system with Prometheus and Grafana.
  - 🔴 Set up Prometheus to collect metrics.
  - 🔴 Configure exporters and integrations.
  - 🔴 Create custom Grafana dashboards.
  - 🔴 Set up alerting rules.
  - 🔴 Secure access to Grafana.
- 🔴 **Major (2pt):** Backend as microservices.
  - 🔴 Design loosely-coupled services with clear interfaces.
  - 🔴 Use REST APIs or message queues for communication.
  - 🔴 Each service should have a single responsibility.
- 🔴 **Minor (1pt):** Health check and status page system with automated backups and disaster recovery procedures.

### IV.8 Data and Analytics *(0 points)*
- 🔴 **Major (2pt):** Advanced analytics dashboard with data visualization.
  - 🔴 Interactive charts and graphs (line, bar, pie, etc.).
  - 🔴 Real-time data updates.
  - 🔴 Export functionality (PDF, CSV, etc.).
  - 🔴 Customizable date ranges and filters.
- 🔴 **Minor (1pt):** Data export and import functionality.
  - 🔴 Export data in multiple formats (JSON, CSV, XML, etc.).
  - 🔴 Import data with validation.
  - 🔴 Bulk operations support.
- 🔴 **Minor (1pt):** GDPR compliance features.
  - 🔴 Allow users to request their data.
  - 🔴 Data deletion with confirmation.
  - 🔴 Export user data in a readable format.
  - 🔴 Confirmation emails for data operations.

### IV.9 Blockchain *(0 points)*
- 🔴 **Major (2pt):** Store tournament scores on the Blockchain.
  - 🔴 Use Avalanche and Solidity smart contracts on a test blockchain.
  - 🔴 Implement smart contracts to record, manage, and retrieve tournament scores.
  - 🔴 Ensure data integrity and immutability.
- 🔴 **Minor (1pt):** Use ICP (Internet Computer Protocol) for a backend that runs on a blockchain (incompatible with SSR).

### IV.10 Modules of choice *(0 points)*
- 🔴 **Major (2pt):** Implement a custom module that is not listed above.
  - 🔴 The module must be substantial and demonstrate technical complexity.
  - 🔴 You must provide proper justification in your README.md explaining why you chose this module, what technical challenges it addresses, how it adds value, and why it deserves Major module status.
- 🔴 **Minor (1pt):** Same as the major module but smaller in scope and less complex.

---

## Chapter VI: Readme Requirements
- 🔴 The very first line must be italicized and read: *This project has been created as part of the 42 curriculum by <login1>[, <login2>...]*
- 🔴 A “Description” section that clearly presents the project, including its goal and a brief overview.
- 🔴 An “Instructions” section containing any relevant information about compilation, installation, and/or execution (including `.env` setup).
- 🔴 A “Resources” section listing classic references related to the topic, as well as a description of how AI was used.
- 🔴 Team Information:
  - 🔴 Assigned role(s) (PO, PM, Tech Lead, Developers, etc.).
  - 🔴 Brief description of responsibilities for each member.
- 🔴 Project Management:
  - 🔴 How the team organized the work.
  - 🔴 Tools used for project management.
  - 🔴 Communication channels used.
- 🔴 Technical Stack:
  - 🔴 Frontend technologies and frameworks used.
  - 🔴 Backend technologies and frameworks used.
  - 🔴 Database system and why it was chosen.
  - 🔴 Any other significant technologies or libraries.
  - 🔴 Justification for major technical choices.
- 🔴 Database Schema:
  - 🔴 Visual representation or description of the database structure.
  - 🔴 Tables/collections and their relationships.
  - 🔴 Key fields and data types.
- 🔴 Features List:
  - 🔴 Complete list of implemented features.
  - 🔴 Which team member(s) worked on each feature.
  - 🔴 Brief description of each feature’s functionality.
- 🔴 Modules:
  - 🔴 List of all chosen modules (Major and Minor).
  - 🔴 Point calculation (Major = 2pts, Minor = 1pt).
  - 🔴 Justification for each module choice.
  - 🔴 How each module was implemented.
  - 🔴 Which team member(s) worked on each module.
- 🔴 Individual Contributions:
  - 🔴 Detailed breakdown of what each team member contributed.
  - 🔴 Specific features, modules, or components implemented by each person.
  - 🔴 Any challenges faced and how they were overcome.
