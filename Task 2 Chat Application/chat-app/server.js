// ─────────────────────────────────────────────
//  server.js — Chat App Backend
//  Stack: Express + Socket.io
//  Design decisions documented inline
// ─────────────────────────────────────────────

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// ── Config ────────────────────────────────────
const PORT = process.env.PORT || 3000;
const MAX_USERNAME_LENGTH = 20;
const MIN_USERNAME_LENGTH = 2;
const MAX_MESSAGE_LENGTH = 500;
// Rate limit: max messages per window per user
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 5000; // 5 seconds

// ── App Setup ─────────────────────────────────
const app = express();
const server = http.createServer(app);

// Socket.io CORS: allow same origin only in prod, configurable via env
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
  // Reconnection is handled client-side; pingTimeout ensures stale sockets close
  pingTimeout: 20000,
  pingInterval: 10000,
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// Health check endpoint — useful for uptime monitors and deployment checks
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    connectedUsers: activeUsers.size,
    uptime: Math.floor(process.uptime()),
  });
});

// ── In-Memory State ───────────────────────────
// Design decision: no database for this app.
// State is ephemeral — fine for a chat demo / internship project.
// If persistence is needed later, swap these Maps for DB calls.

// Map<socketId, { username, joinedAt }>
const activeUsers = new Map();

// Usernames currently taken (lowercase for case-insensitive uniqueness)
const takenUsernames = new Set();

// Rate limiter: Map<socketId, { count, windowStart }>
const rateLimiter = new Map();

// Message history — keep last 50 messages so new joiners see context
const MESSAGE_HISTORY_LIMIT = 50;
const messageHistory = [];

// ── Helpers ───────────────────────────────────

/**
 * Sanitize a string to prevent XSS.
 * We do NOT use a library intentionally — the logic is simple and transparent.
 * We escape the 5 dangerous HTML chars. Nothing else.
 */
function sanitize(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Validate a username string.
 * Returns { valid: true } or { valid: false, reason: string }
 */
function validateUsername(username) {
  if (typeof username !== "string")
    return { valid: false, reason: "Invalid type." };

  const trimmed = username.trim();

  if (trimmed.length < MIN_USERNAME_LENGTH)
    return {
      valid: false,
      reason: `Username must be at least ${MIN_USERNAME_LENGTH} characters.`,
    };

  if (trimmed.length > MAX_USERNAME_LENGTH)
    return {
      valid: false,
      reason: `Username must be ${MAX_USERNAME_LENGTH} characters or fewer.`,
    };

  // Allow letters, numbers, underscores, hyphens — no spaces or special chars
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed))
    return {
      valid: false,
      reason: "Only letters, numbers, _ and - are allowed.",
    };

  if (takenUsernames.has(trimmed.toLowerCase()))
    return { valid: false, reason: "Username is already taken." };

  return { valid: true, username: trimmed };
}

/**
 * Check if a socket is sending messages too fast.
 * Returns true if rate limit exceeded.
 */
function isRateLimited(socketId) {
  const now = Date.now();
  const record = rateLimiter.get(socketId);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimiter.set(socketId, { count: 1, windowStart: now });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX) return true;

  record.count += 1;
  return false;
}

/**
 * Build the public user list (only usernames, never socket IDs).
 */
function getPublicUserList() {
  return Array.from(activeUsers.values()).map((u) => u.username);
}

/**
 * Store a message in history, trimming to limit.
 */
function addToHistory(msg) {
  messageHistory.push(msg);
  if (messageHistory.length > MESSAGE_HISTORY_LIMIT) {
    messageHistory.shift(); // drop oldest
  }
}

// ── Socket Events ─────────────────────────────
io.on("connection", (socket) => {
  console.log(`[connect] Socket ${socket.id} connected`);

  // ── Join ──────────────────────────────────
  // Client must send "join" before they can send messages.
  // Design decision: no anonymous messages — every message has an owner.
  socket.on("join", (rawUsername, callback) => {
    // Guard: already joined this session
    if (activeUsers.has(socket.id)) {
      return callback({ success: false, reason: "Already joined." });
    }

    const validation = validateUsername(rawUsername);
    if (!validation.valid) {
      return callback({ success: false, reason: validation.reason });
    }

    const username = validation.username;

    // Register user
    activeUsers.set(socket.id, { username, joinedAt: Date.now() });
    takenUsernames.add(username.toLowerCase());

    console.log(`[join] ${username} (${socket.id})`);

    // Send message history to the new user only
    socket.emit("history", messageHistory);

    // Notify everyone (including the joiner) of the updated user list
    const systemMsg = {
      type: "system",
      text: `${sanitize(username)} joined the chat.`,
      timestamp: Date.now(),
    };
    addToHistory(systemMsg);
    io.emit("message", systemMsg);
    io.emit("user_list", getPublicUserList());

    callback({ success: true, username });
  });

  // ── Message ───────────────────────────────
  socket.on("message", (rawText, callback) => {
    // Guard: must have joined first
    const user = activeUsers.get(socket.id);
    if (!user) {
      return callback({
        success: false,
        reason: "You must join before sending messages.",
      });
    }

    // Rate limit check
    if (isRateLimited(socket.id)) {
      return callback({
        success: false,
        reason: "Slow down — you're sending messages too fast.",
      });
    }

    // Type + length check
    if (typeof rawText !== "string") {
      return callback({ success: false, reason: "Invalid message." });
    }

    const text = rawText.trim();

    if (text.length === 0) {
      return callback({ success: false, reason: "Message cannot be empty." });
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      return callback({
        success: false,
        reason: `Message too long. Max ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    const msg = {
      type: "chat",
      username: sanitize(user.username),
      text: sanitize(text),
      timestamp: Date.now(),
    };

    addToHistory(msg);
    io.emit("message", msg); // broadcast to everyone

    callback({ success: true });
  });

  // ── Disconnect ────────────────────────────
  socket.on("disconnect", (reason) => {
    const user = activeUsers.get(socket.id);

    if (user) {
      console.log(
        `[disconnect] ${user.username} (${socket.id}) — reason: ${reason}`,
      );

      activeUsers.delete(socket.id);
      takenUsernames.delete(user.username.toLowerCase());
      rateLimiter.delete(socket.id);

      const systemMsg = {
        type: "system",
        text: `${sanitize(user.username)} left the chat.`,
        timestamp: Date.now(),
      };
      addToHistory(systemMsg);
      io.emit("message", systemMsg);
      io.emit("user_list", getPublicUserList());
    }
  });
});

// ── Start Server ──────────────────────────────
server.listen(PORT, () => {
  console.log(`\n  Chat server running at http://localhost:${PORT}`);
  console.log(`  Health check:       http://localhost:${PORT}/health\n`);
});

// ── Graceful Shutdown ─────────────────────────
// Allows open sockets to be notified before the process exits.
// Useful in Docker / Render deployments.
function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);

  io.emit("message", {
    type: "system",
    text: "Server is restarting. You will be reconnected shortly.",
    timestamp: Date.now(),
  });

  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  // Force exit after 5s if graceful close hangs
  setTimeout(() => process.exit(1), 5000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
