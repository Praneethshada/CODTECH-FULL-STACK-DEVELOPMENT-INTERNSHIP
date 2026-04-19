# ⚡ ProductivityPulse — Chrome Extension
### CODTECH Internship | Task 4 | Full Stack Development

A professional **time tracking and productivity analytics** Chrome Extension that classifies websites, measures focused work time, and generates beautiful reports.

---

## 📁 Project Structure

```
chrome-extension/
│
├── manifest.json          # Manifest V3 — extension config
├── background.js          # Service worker — core tracking engine
├── content.js             # Content script — visibility detection
│
├── utils/
│   ├── classifier.js      # Domain → productive/unproductive/neutral
│   └── storage.js         # chrome.storage.local read/write helpers
│
├── popup/
│   ├── popup.html         # Mini dashboard shown on extension click
│   └── popup.js           # Popup rendering logic
│
├── dashboard/
│   ├── dashboard.html     # Full analytics dashboard (Options page)
│   └── dashboard.js       # Chart.js visualisations + tables
│
├── icons/                 # Extension icons (16, 32, 48, 128px)
│
└── backend/               # Optional Node.js sync server
    ├── server.js           # Express + SQLite REST API
    └── package.json
```

---

## 🚀 How to Install the Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select this `chrome-extension/` folder
5. The ⚡ ProductivityPulse icon will appear in your toolbar!

> **Note:** You need PNG icon files at `icons/icon16.png`, `icons/icon32.png`, `icons/icon48.png`, `icons/icon128.png`. You can use any 16×16, 32×32, 48×48, and 128×128 PNG images, or generate them from the SVG below.

---

## 🎯 Features

### ✅ Core Tracking
- **Automatic tab tracking** — starts/stops as you switch tabs
- **Window focus detection** — pauses when Chrome loses focus
- **Idle detection** — stops counting after 60s of no input (configurable)
- **Periodic flush** — saves data every 10 seconds so nothing is lost

### ✅ Smart Classification
- **70+ known domains** pre-classified as productive or unproductive
- **Custom domains** — add your own via the Settings page
- Three categories: 🚀 Productive | 📵 Distracting | ⚖️ Neutral
- Fuzzy matching handles subdomains automatically

### ✅ Analytics Dashboard
- **Today view** — hourly bar chart, donut chart, top sites table
- **Weekly report** — 7-day grid, trend line, aggregate table
- **All-time history** — searchable table of every tracked domain
- **Productivity score** — calculated as productive/(productive+distracting)×100

### ✅ Settings & Data
- Set a **daily productive minutes goal** with progress bar
- **Daily notification** at 9 PM with your summary
- **Export** all data as JSON
- **Clear** history at any time

---

## 🖥️ Optional Backend (for multi-device sync)

```bash
cd backend
npm install
node server.js
```

### API Endpoints

| Method | Endpoint         | Description                        |
|--------|------------------|------------------------------------|
| GET    | `/health`        | Health check                       |
| POST   | `/register`      | Get a new userId (UUID)            |
| POST   | `/sync`          | Sync extension data to server      |
| GET    | `/report`        | Get data for a date range          |
| GET    | `/weekly-report` | Get top productive/distracting sites |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                Chrome Extension                  │
│                                                  │
│  ┌──────────┐   tabs/windows    ┌─────────────┐ │
│  │background│ ←── events ─────→ │ classifier  │ │
│  │  worker  │                   │  (domains)  │ │
│  │          │ ──── flush ──────→ │  storage    │ │
│  └──────────┘                   └─────────────┘ │
│       ↕ messages                      ↕         │
│  ┌──────────┐               ┌──────────────────┐ │
│  │  popup   │               │    dashboard     │ │
│  │ (mini UI)│               │  (full charts)   │ │
│  └──────────┘               └──────────────────┘ │
└─────────────────────────────────────────────────┘
          ↕ HTTP POST /sync (optional)
┌─────────────────────────────────────────────────┐
│          Node.js Backend (Express + SQLite)      │
│  /register  /sync  /report  /weekly-report       │
└─────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Reason |
|---|---|
| Manifest V3 | Required for new Chrome extensions; uses service workers |
| ES Modules in background | Clean imports, tree-shakeable utilities |
| `chrome.storage.local` | No server required; data persists across browser restarts |
| Periodic alarm flush (10s) | Service workers can be killed; alarms reliably wake them |
| Chart.js from CDN | Lightweight, MIT licensed, zero build step |
| SQLite for backend | Zero database server setup, perfect for a single-server deploy |

---

## 📝 Good Practices Used

- **Separation of concerns**: classifier, storage, background, UI all separate files
- **Comprehensive JSDoc comments** on every function
- **Single Responsibility Principle**: each file does one thing
- **Prepared statements** in SQLite (prevents SQL injection, better performance)
- **Transactions** for bulk DB inserts
- **Error handling** with try/catch everywhere async Chrome APIs are called
- **No third-party trackers**: all data stays on your device unless you opt into the backend

---

## 🏷️ Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest V3, Vanilla JS (ES Modules) |
| Charts | Chart.js 4.4 |
| Backend | Node.js 18+, Express 4 |
| Database | SQLite (via better-sqlite3) |
| Storage | chrome.storage.local (offline-first) |

---

*CODTECH Internship — Full Stack Development — Task 4*
