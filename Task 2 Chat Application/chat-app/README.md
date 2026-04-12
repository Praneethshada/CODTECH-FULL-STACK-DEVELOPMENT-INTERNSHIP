# Chat App

Real-time chat application built with Node.js, Express, and Socket.io.

## Run Locally

```bash
npm install
cp .env.example .env
npm start
# Open http://localhost:3000
```

For development with auto-restart:

```bash
npm run dev
```

## Deploy (Free)

### Render.com (Backend + Frontend together — easiest)

1. Push this repo to GitHub
2. Go to render.com → New → Web Service
3. Connect your repo
4. Build command: `npm install`
5. Start command: `node server.js`
6. Done — Render gives you a public URL

### Health Check

`GET /health` returns server status and connected user count.

---

## Design Decisions

### Why Socket.io over raw WebSocket?

Socket.io adds automatic reconnection, fallback to HTTP long-polling
(for environments that block WebSockets), and event namespacing. For a
demo/internship project this is the right tradeoff.

### Why no database?

State is ephemeral — messages live in memory. This keeps the app
self-contained with zero infrastructure. If persistence is ever needed,
the `messageHistory` array and `activeUsers` Map are the only things
that need swapping out for DB calls.

### Why no auth / rooms?

Single-room, username-only is the simplest thing that works. Adding
rooms would require tracking room membership per socket — the
`socket.join(room)` Socket.io API makes it easy to add later without
changing the core pattern.

### Security surface

- All text is HTML-escaped server-side before broadcast (prevents XSS)
- Client uses `textContent` never `innerHTML` for message rendering
- Username uniqueness enforced case-insensitively
- Rate limiting: max 10 messages per 5-second window per socket
- Message length capped at 500 chars
- Socket IDs never exposed to other clients

### Edge cases handled

| Scenario                                  | Handling                                               |
| ----------------------------------------- | ------------------------------------------------------ |
| Duplicate username                        | Rejected with reason                                   |
| Empty / whitespace-only message           | Rejected client + server                               |
| Message too long                          | Rejected client + server with char counter             |
| Sending before joining                    | Server rejects, returns error                          |
| Rapid fire messages                       | Rate limiter returns error, doesn't disconnect         |
| User disconnects                          | Removed from user list, system message sent            |
| User reconnects                           | Auto-rejoin; if name taken, redirected to join screen  |
| Server restart                            | Graceful shutdown sends notice; client auto-reconnects |
| User scrolled up when new message arrives | "New messages" button shown                            |
| XSS attempt in message                    | Escaped, rendered as literal text                      |
