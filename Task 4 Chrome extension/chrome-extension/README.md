# ProductivityPulse Chrome Extension

CODTECH Internship Task 4 (Full Stack Development)

This project is a Chrome extension that tracks website usage time and gives productivity reports. It classifies websites as productive, distracting, or neutral and shows analytics in both a popup and a full dashboard.

## Project Structure

```text
chrome-extension/
    manifest.json
    background.js
    content.js
    utils/
        classifier.js
        storage.js
    popup/
        popup.html
        popup.js
    dashboard/
        dashboard.html
        dashboard.js
    icons/
    backend/
        server.js
        package.json
```

## How to Install

1. Open Chrome and go to `chrome://extensions`.
2. Turn on Developer mode.
3. Click `Load unpacked`.
4. Select the `chrome-extension/` folder.
5. The extension icon will appear in the Chrome toolbar.

If icons are missing, add these PNG files:

1. `icons/icon16.png`
2. `icons/icon32.png`
3. `icons/icon48.png`
4. `icons/icon128.png`

## Main Features

### Tracking

1. Tracks active tab time automatically.
2. Pauses tracking when Chrome is not focused.
3. Stops counting when the user is idle.
4. Saves data regularly so progress is not lost.

### Website Classification

1. Includes many pre-classified domains.
2. Supports custom domains from settings.
3. Uses three categories: productive, distracting, and neutral.
4. Handles subdomains with flexible matching.

### Analytics

1. Today view with charts and top websites.
2. Weekly report view with trend data.
3. All-time table with search support.
4. Productivity score based on productive vs distracting time.

### Settings and Data

1. Set a daily productive time goal.
2. Show a daily summary notification.
3. Export saved data as JSON.
4. Clear stored history when needed.

## Optional Backend for Sync

Use the backend only if you want to sync data across devices.

```bash
cd backend
npm install
node server.js
```

### API Endpoints

| Method | Endpoint         | Description                |
| ------ | ---------------- | -------------------------- |
| GET    | `/health`        | Health check               |
| POST   | `/register`      | Create a user ID           |
| POST   | `/sync`          | Sync extension data        |
| GET    | `/report`        | Fetch report by date range |
| GET    | `/weekly-report` | Fetch weekly top sites     |

## Architecture Summary

1. `background.js` is the core tracker and event handler.
2. `utils/classifier.js` decides site category.
3. `utils/storage.js` handles local storage read/write.
4. `popup/` shows quick daily stats.
5. `dashboard/` shows detailed analytics and settings.
6. `backend/` is optional and provides sync APIs.

## Tech Stack

| Layer         | Technology                             |
| ------------- | -------------------------------------- |
| Extension     | Chrome Manifest V3, Vanilla JavaScript |
| Charts        | Chart.js                               |
| Backend       | Node.js, Express                       |
| Database      | SQLite                                 |
| Local Storage | `chrome.storage.local`                 |

## Notes

1. The extension works without a backend.
2. All data stays in local storage unless sync is enabled.
3. This project is designed to run without a frontend build step.
