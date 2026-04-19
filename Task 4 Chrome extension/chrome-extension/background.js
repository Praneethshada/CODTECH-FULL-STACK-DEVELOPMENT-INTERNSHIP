/**
 * background.js — ProductivityPulse Service Worker
 * ─────────────────────────────────────────────────────────────────
 * This is the brain of the extension. It runs persistently (as a
 * Manifest V3 service worker) and is responsible for:
 *
 *  1. Detecting which tab is currently active and visible
 *  2. Measuring time spent on each tab's URL
 *  3. Flushing accumulated seconds to chrome.storage.local
 *  4. Sending daily summary notifications via chrome.alarms
 *  5. Handling idle detection so AFK time isn't counted
 *
 * Design decisions:
 *  • We track wall-clock seconds in memory (activeSession) and flush
 *    every FLUSH_INTERVAL_MS to storage. This avoids hammering
 *    storage on every second while still being accurate.
 *  • Idle detection pauses tracking after IDLE_THRESHOLD_SECONDS of
 *    no user interaction (keyboard / mouse).
 *  • All domain classification is delegated to classifier.js so the
 *    rules live in one place.
 * ─────────────────────────────────────────────────────────────────
 */

import { classifyURL, extractDomain } from "./utils/classifier.js";
import { addTime, recordVisit, todayKey } from "./utils/storage.js";

// ── Constants ────────────────────────────────────────────────────

/** How often (ms) we flush in-memory time to chrome.storage */
const FLUSH_INTERVAL_MS = 10_000; // 10 seconds

/** Seconds of no input before we treat the user as idle */
const IDLE_THRESHOLD_SECONDS = 60;

// ── In-memory tracking state ─────────────────────────────────────

/**
 * Active session descriptor.
 * Null when no tab is being tracked (idle / no focused window).
 *
 * @type {{ url: string, domain: string, category: string, startMs: number } | null}
 */
let activeSession = null;

/** Set of domains already recorded as "visited" today (for visit counting) */
const visitedToday = new Set();

// ── Helper: flush current session seconds to storage ─────────────

/**
 * Computes elapsed seconds for the current activeSession and writes
 * them to storage. Resets the session start time so elapsed seconds
 * aren't double-counted.
 */
async function flushSession() {
  if (!activeSession) return;

  const now = Date.now();
  const elapsed = Math.floor((now - activeSession.startMs) / 1000);
  if (elapsed <= 0) return;

  activeSession.startMs = now; // reset so next flush starts fresh

  await addTime(
    todayKey(),
    activeSession.domain,
    activeSession.category,
    elapsed
  );
}

// ── Helper: start tracking a new URL ─────────────────────────────

/**
 * Starts (or switches) the active session to a new URL.
 * Flushes any in-progress session first.
 *
 * @param {string} url
 */
async function startTracking(url) {
  // Flush whatever was running before
  await flushSession();

  if (!url || url.startsWith("chrome://") || url.startsWith("about:")) {
    activeSession = null;
    return;
  }

  const { category, domain } = classifyURL(url);

  activeSession = {
    url,
    domain,
    category,
    startMs: Date.now(),
  };

  // Record visit (once per domain per browser session day)
  const visitKey = `${todayKey()}:${domain}`;
  if (!visitedToday.has(visitKey)) {
    visitedToday.add(visitKey);
    await recordVisit(todayKey(), domain, category);
  }
}

// ── Helper: stop tracking (idle / window blur) ───────────────────

async function stopTracking() {
  await flushSession();
  activeSession = null;
}

// ── Tab & Window event listeners ─────────────────────────────────

/**
 * Fired when the active tab in any window changes.
 * We start tracking the new tab's URL.
 */
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.url) await startTracking(tab.url);
  } catch {
    // Tab may have already closed
  }
});

/**
 * Fired when a tab's URL changes (navigation / SPA route change).
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return; // wait for full load
  try {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (active?.id === tabId && tab?.url) {
      await startTracking(tab.url);
    }
  } catch {
    // ignore
  }
});

/**
 * Fired when focus moves to a different Chrome window.
 * windowId === chrome.windows.WINDOW_ID_NONE means Chrome lost focus
 * entirely (user switched to another app).
 */
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Chrome no longer focused — stop tracking
    await stopTracking();
    return;
  }

  // A different Chrome window gained focus — track its active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab?.url) await startTracking(tab.url);
  } catch {
    // ignore
  }
});

// ── Idle detection ────────────────────────────────────────────────

/**
 * chrome.idle fires "idle" when no input for IDLE_THRESHOLD_SECONDS,
 * and "active" when the user returns.
 */
chrome.idle.setDetectionInterval(IDLE_THRESHOLD_SECONDS);

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === "idle" || state === "locked") {
    // User stepped away — flush & pause tracking
    await stopTracking();
  } else if (state === "active") {
    // User is back — resume with the current active tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab?.url) await startTracking(tab.url);
    } catch {
      // ignore
    }
  }
});

// ── Periodic flush alarm ──────────────────────────────────────────

/**
 * We create a repeating alarm every FLUSH_INTERVAL_MS seconds.
 * Service workers can be killed between events; alarms wake them up
 * reliably so we never lose more than FLUSH_INTERVAL_MS of data.
 */
chrome.alarms.create("flush", { periodInMinutes: 1 / 6 }); // every 10 s

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "flush") {
    await flushSession();
  }

  // Daily summary notification at 9 PM
  if (alarm.name === "dailySummary") {
    await sendDailySummaryNotification();
  }
});

// ── Daily summary notification ────────────────────────────────────

/** Creates the daily alarm at 21:00 (9 PM) each day. */
function scheduleDailySummary() {
  const now = new Date();
  const next9pm = new Date();
  next9pm.setHours(21, 0, 0, 0);
  if (next9pm <= now) next9pm.setDate(next9pm.getDate() + 1);

  chrome.alarms.create("dailySummary", {
    when: next9pm.getTime(),
    periodInMinutes: 24 * 60, // repeat daily
  });
}

/**
 * Sends a Chrome notification with today's productive vs. unproductive
 * time summary.
 */
async function sendDailySummaryNotification() {
  const { loadDayData } = await import("./utils/storage.js");
  const day = await loadDayData(todayKey());

  let productiveSec = 0;
  let unproductiveSec = 0;

  for (const { seconds, category } of Object.values(day)) {
    if (category === "productive") productiveSec += seconds;
    else if (category === "unproductive") unproductiveSec += seconds;
  }

  const fmt = (s) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "📊 ProductivityPulse — Daily Summary",
    message: `Productive: ${fmt(productiveSec)} | Distracting: ${fmt(unproductiveSec)}`,
    priority: 1,
  });
}

// ── Extension install / startup ───────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  scheduleDailySummary();

  // Immediately start tracking the current tab
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
    if (tab?.url) startTracking(tab.url);
  });
});

chrome.runtime.onStartup.addListener(() => {
  scheduleDailySummary();

  chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
    if (tab?.url) startTracking(tab.url);
  });
});

// ── Message handler (from popup / dashboard) ──────────────────────

/**
 * Allows popup.js / dashboard.js to request an immediate flush so
 * they always see the very latest second counts.
 */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "FLUSH_NOW") {
    flushSession().then(() => sendResponse({ ok: true }));
    return true; // keep channel open for async response
  }

  if (msg.type === "GET_ACTIVE_SESSION") {
    sendResponse({ session: activeSession });
  }
});
