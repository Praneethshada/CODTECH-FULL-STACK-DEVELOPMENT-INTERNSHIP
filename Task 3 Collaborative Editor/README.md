# Task 3 Real-Time Collaborative Document Editor

This task is completed using the required stack:

1. React.js for a dynamic and responsive frontend
2. Node.js (Express) for backend services
3. MongoDB for document storage

The app allows multiple users to edit the same document in real time by sharing the same document id.

## What Was Implemented Properly

1. Full stack architecture with clear separation between client and server
2. Real-time collaboration using Socket.IO rooms
3. Persistent storage in MongoDB with automatic document creation
4. REST APIs for document fetch and save
5. Debounced autosave to reduce database writes
6. Basic security and production-safe middleware
7. Environment-based configuration for easy deployment
8. Clean, readable code with meaningful comments
9. Responsive UI for desktop and mobile screens
10. Simple onboarding flow with shareable document link

## Project Structure

```text
Task 3 Collaborative Ediotr/
  client/
    src/
      components/Editor.jsx
      api.js
      socket.js
      App.jsx
      main.jsx
      styles.css
    package.json
    vite.config.js
    .env.example
  server/
    src/
      config/db.js
      models/Document.js
      socket/documentSocket.js
      index.js
    package.json
    .env.example
  README.md
```

## Architecture Diagram

```text
React Client (Vite)
   |  HTTP (load/save)
   v
Node.js + Express API
   |  Socket.IO (real-time events)
   v
Socket.IO Server (rooms by docId)
   |
   v
MongoDB (document persistence)
```

Flow summary:

1. Client joins a room with `docId`.
2. Socket server broadcasts live edits to other users in the same room.
3. Express API and socket handlers save content to MongoDB.

## How It Works

1. User opens a document id in the React app.
2. Frontend connects to Socket.IO backend and joins that document room.
3. Existing document content is loaded from MongoDB.
4. On each edit, content is broadcast to other users in the same room.
5. Autosave writes latest content to MongoDB after typing pauses.
6. Document remains available after restart because content is stored in database.

## API Endpoints

1. `GET /api/health`
   Checks if server is running.

2. `GET /api/documents/:docId`
   Loads an existing document or creates one if it does not exist.

3. `PUT /api/documents/:docId`
   Saves document content.

## Socket Events

1. `join-document`
   Join a document room and receive current content.

2. `document-change`
   Broadcast live content updates to collaborators.

3. `document-updated`
   Receive content updates from other collaborators.

4. `save-document`
   Persist latest content to MongoDB.

5. `editor-error`
   Send editor-related error messages.

## Setup Instructions

### Prerequisites

1. Node.js 18+
2. MongoDB local or cloud connection string

### Backend Setup

1. Open terminal in `server` folder
2. Run `npm install`
3. Create `.env` from `.env.example`
4. Start server with `npm run dev`

### Frontend Setup

1. Open terminal in `client` folder
2. Run `npm install`
3. Create `.env` from `.env.example`
4. Start app with `npm run dev`

Frontend default: `http://localhost:5173`
Backend default: `http://localhost:5000`

## Testing Real-Time Collaboration

1. Start backend and frontend
2. Open app in two browser tabs
3. Use same document id in both tabs
4. Type in one tab and watch content update in the other tab instantly

## Good Practices Followed

1. Modular code organization
2. Input validation on backend APIs and socket handlers
3. Debounced writes for performance optimization
4. Explicit error handling with clear user-facing messages
5. Environment variables instead of hardcoded values
6. Secure middleware usage (`helmet`, `cors`)
7. Logging support (`morgan`) for debugging and monitoring

## GitHub Submission Guidance

1. Initialize git in the internship root if not already done
2. Add all files and commit Task 3
3. Push to your GitHub repository
4. Share repository link for submission as instructed

## Notes for Internship Instructions

1. Code is organized and commented for readability
2. Task follows requested technologies exactly
3. You can now include this Task 3 folder in your final internship repository submission
