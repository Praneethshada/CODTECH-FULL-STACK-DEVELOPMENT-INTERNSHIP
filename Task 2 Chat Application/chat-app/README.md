# Real-Time Chat Application

**Internship Task 2 — CODTECH Full Stack Development**

A real-time chat application built with Node.js, Express, and Socket.io.  
Single room, multi-user, with username validation, rate limiting, message history, and graceful reconnection handling.

**Live Demo:** https://task-2-chat-app.onrender.com  
**Repository:** https://github.com/Praneethshada/CODTECH-FULL-STACK-DEVELOPMENT-INTERNSHIP

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Socket Events](#socket-events)
- [Security](#security)
- [Edge Cases Handled](#edge-cases-handled)
- [Design Decisions](#design-decisions)
- [Deployment](#deployment)

---

## Overview

This application allows multiple users to join a shared chat room in real time.  
Users choose a username, send messages, and see who else is online — all without any page reloads.

The server handles all state: who is online, message history, and username uniqueness.  
The client handles all UI feedback: connection status, character count, scroll nudges, and error toasts.

---

## Features

- Real-time messaging via WebSocket (Socket.io)
- Username validation — unique, alphanumeric, 2–20 characters
- Message history — last 50 messages delivered on join
- Live online users list in sidebar
- Join / leave system notifications
- Character counter with warning at 90% of limit
- Scroll-to-bottom nudge when new messages arrive while scrolled up
- Connection status indicator (connected / connecting / disconnected)
- Auto-reconnection with re-join after network drops
- Rate limiting — max 10 messages per 5 seconds per user
- XSS protection — server-side HTML escaping + client-side `textContent`
- Graceful server shutdown — notifies all clients before restarting
- Health check endpoint at `/health`
- Responsive layout — sidebar hidden on small screens

---

## Tech Stack

| Layer     | Technology                                     |
| --------- | ---------------------------------------------- |
| Runtime   | Node.js >= 16                                  |
| Framework | Express 4                                      |
| WebSocket | Socket.io 4                                    |
| Frontend  | Vanilla HTML / CSS / JavaScript (no framework) |
| Config    | dotenv                                         |
| Hosting   | Render.com (free tier)                         |

No database. No build step. No bundler. The entire frontend is a single `index.html` file.

---

## Project Structure

```
chat-app/
├── server.js          # Backend — Express server + Socket.io logic
├── package.json       # Dependencies and scripts
├── .env.example       # Environment variable template
├── .gitignore
├── README.md
└── public/
    └── index.html     # Entire frontend — HTML, CSS, and JS in one file
```

### Why this structure?

One server file and one HTML file keeps the project easy to read and explain.  
There is no build pipeline to break, no framework to learn, and no hidden complexity.  
Every line of code is visible and commented.

---

## Getting Started

### Prerequisites

- Node.js >= 16 — download from [nodejs.org](https://nodejs.org)

Verify installation:

```bash
node --version
npm --version
```

### Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/Praneethshada/CODTECH-FULL-STACK-DEVELOPMENT-INTERNSHIP.git
cd "CODTECH-FULL-STACK-DEVELOPMENT-INTERNSHIP/Task 2 Chat Application/chat-app"

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Start the server
node server.js
```

Open **http://localhost:3000** in two browser tabs, use different usernames in each, and chat.

### Development (auto-restart on file changes)

```bash
npm run dev
```

---

## Environment Variables

Copy `.env.example` to `.env` and set values:

```env
PORT=3000
ALLOWED_ORIGIN=*
```

| Variable         | Default | Description                                                                                |
| ---------------- | ------- | ------------------------------------------------------------------------------------------ |
| `PORT`           | `3000`  | Port the server listens on. Render sets this automatically in production.                  |
| `ALLOWED_ORIGIN` | `*`     | Restricts which origins can connect via Socket.io. Set to your frontend URL in production. |

`.env` is listed in `.gitignore` and is never committed to the repository.  
`.env.example` is committed as a template so anyone cloning the repo knows what to configure.

---

## API Reference

### `GET /`

Serves the chat frontend (`public/index.html`).

### `GET /health`

Returns server status. Useful for uptime monitoring and deployment verification.

**Response:**

```json
{
  "status": "ok",
  "connectedUsers": 3,
  "uptime": 142
}
```

---

## Socket Events

### Client → Server

| Event     | Payload             | Description                                                                                                   |
| --------- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `join`    | `username (string)` | Register a username and enter the chat. Must be called before sending messages. Server responds via callback. |
| `message` | `text (string)`     | Send a chat message. Server responds via callback.                                                            |

All events use acknowledgement callbacks — the server always responds with `{ success, reason? }`.

### Server → Client

| Event       | Payload     | Description                                                              |
| ----------- | ----------- | ------------------------------------------------------------------------ |
| `history`   | `Message[]` | Last 50 messages, sent only to the newly joined user.                    |
| `message`   | `Message`   | A new message broadcast to all connected clients.                        |
| `user_list` | `string[]`  | Updated list of online usernames. Sent whenever someone joins or leaves. |

### Message Object

```js
// Chat message
{
  type: "chat",
  username: "alice",
  text: "Hello!",
  timestamp: 1712900000000
}

// System message (join / leave / server notice)
{
  type: "system",
  text: "alice joined the chat.",
  timestamp: 1712900000000
}
```

---

## Security

### XSS Prevention

All user input is HTML-escaped on the server before it is stored or broadcast.  
The escape function replaces the 5 dangerous HTML characters: `& < > " '`

```js
function sanitize(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
```

The client renders all message content using `textContent`, never `innerHTML`.  
This is a second independent layer of XSS protection.

### Rate Limiting

Each socket is limited to 10 messages per 5-second window.  
Exceeding the limit returns an error message — the user is not disconnected.

### Input Validation

Every field is validated server-side, regardless of what the client sends.  
Client-side validation is an additional convenience, not a security boundary.

| Field    | Rules                                                                          |
| -------- | ------------------------------------------------------------------------------ |
| Username | 2–20 characters, letters / numbers / `_` / `-` only, unique (case-insensitive) |
| Message  | 1–500 characters, must not be empty or whitespace-only                         |

### Socket ID Privacy

Socket IDs are never sent to other clients.  
The user list contains only usernames.

---

## Edge Cases Handled

| Scenario                                      | Handling                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| Duplicate username                            | Rejected by server with reason. Case-insensitive: `Alice` blocks `alice`.              |
| Empty / whitespace-only message               | Rejected client-side and server-side.                                                  |
| Message over 500 characters                   | Blocked client-side with a character counter. Also validated server-side.              |
| Sending a message before joining              | Server rejects it and returns an error.                                                |
| Rapid message sending                         | Rate limiter returns an error after 10 messages in 5 seconds. User stays connected.    |
| User disconnects (closes tab / drops network) | Removed from user list. System message sent to all. Username freed for reuse.          |
| User reconnects after network drop            | Socket.io auto-reconnects. Client re-emits `join` with same username.                  |
| Username taken during reconnection downtime   | Server rejects the rejoin. Client redirects user to join screen with a notice.         |
| Server restart / graceful shutdown            | Server broadcasts a notice to all clients before closing. Clients auto-reconnect.      |
| New user joining mid-conversation             | Receives last 50 messages as history before any new messages arrive.                   |
| User scrolled up when new message arrives     | "↓ New messages" button appears. Dismissed on click or when user scrolls to bottom.    |
| XSS attempt in username or message            | Escaped server-side, rendered via `textContent` client-side. Displays as literal text. |

---

## Design Decisions

### Why Socket.io over raw WebSocket?

Socket.io adds automatic reconnection with exponential back-off, HTTP long-polling fallback for environments that block WebSocket connections, and a clean event-based API. For a project at this stage these are the right tradeoffs.

### Why no database?

Message state is in-memory and ephemeral. This keeps the application self-contained with zero infrastructure dependencies. If persistence were needed, only two things change: `messageHistory[]` becomes a DB query, and `activeUsers` Map becomes session storage.

### Why a single HTML file for the frontend?

A single file is the simplest thing that works. It requires no build tool, no bundler, and no framework. Every line of CSS and JavaScript is visible in one place. This is a deliberate tradeoff — easy to read, easy to explain, easy to deploy.

### Why no authentication?

Username-only entry is the minimum viable identity system for a demo. Adding password authentication would require a database, session management, and password hashing — all of which are correct additions for a production system, but out of scope for this task.

### Why validate on both client and server?

Client-side validation gives immediate feedback without a network round-trip.  
Server-side validation is the security boundary — the client can be bypassed.  
Both layers are required. They are not redundant; they serve different purposes.

---

## Deployment

The application is deployed on **Render.com** (free tier) with the backend and frontend served together from the same Node.js process.

### Render Configuration

| Setting        | Value                              |
| -------------- | ---------------------------------- |
| Root Directory | `Task 2 Chat Application/chat-app` |
| Build Command  | `npm install`                      |
| Start Command  | `node server.js`                   |
| Instance Type  | Free                               |

### Free Tier Behaviour

Render's free tier spins down the server after 15 minutes of inactivity. The first request after a sleep period takes approximately 30 seconds to respond while the instance wakes up. This is normal for free hosting and does not affect functionality.

### To Deploy Your Own Instance

1. Fork the repository on GitHub
2. Sign up at [render.com](https://render.com) and connect your GitHub account
3. New → Web Service → select your fork
4. Set Root Directory and commands as shown above
5. Click Create Web Service
6. Your live URL will appear in the Render dashboard within 2–3 minutes

---

## Author

**Praneeth Shada**  
Full Stack Development Internship — CODTECH  
Task 2: Real-Time Chat Application
