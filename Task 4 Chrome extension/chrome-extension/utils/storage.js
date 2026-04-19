/**
 * storage.js
 * ─────────────────────────────────────────────────────────────────
 * Abstraction layer over chrome.storage.local.
 *
 * Data Schema (stored under key "timeData"):
 * {
 *   "2024-04-12": {                    ← ISO date string (YYYY-MM-DD)
 *     "github.com": {
 *       seconds: 3600,
 *       category: "productive",
 *       visits: 12,
 *       lastVisit: 1712900000000       ← timestamp ms
 *     },
 *     ...
 *   },
 *   ...
 * }
 *
 * Settings stored under key "ppSettings":
 * {
 *   dailyGoalMinutes: 240,             ← target productive minutes/day
 *   notifications: true,
 *   customProductive: [],              ← user-added productive domains
 *   customUnproductive: []
 * }
 * ─────────────────────────────────────────────────────────────────
 */

const DATA_KEY = "timeData";
const SETTINGS_KEY = "ppSettings";

/** Returns today's ISO date string (YYYY-MM-DD in local time). */
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns an ISO date string N days ago. */
export function daysAgoKey(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Loads all tracking data from storage.
 * @returns {Promise<Object>} The full timeData object
 */
export async function loadAllData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DATA_KEY, (result) => {
      resolve(result[DATA_KEY] || {});
    });
  });
}

/**
 * Loads data for a single day.
 * @param {string} dateKey - "YYYY-MM-DD"
 * @returns {Promise<Object>} Map of domain → stats
 */
export async function loadDayData(dateKey) {
  const all = await loadAllData();
  return all[dateKey] || {};
}

/**
 * Adds seconds to a domain's total for a given date.
 * Creates the entry if it doesn't exist.
 *
 * @param {string} dateKey
 * @param {string} domain
 * @param {string} category
 * @param {number} seconds
 */
export async function addTime(dateKey, domain, category, seconds) {
  if (seconds <= 0) return;

  const all = await loadAllData();

  if (!all[dateKey]) all[dateKey] = {};
  if (!all[dateKey][domain]) {
    all[dateKey][domain] = { seconds: 0, category, visits: 0, lastVisit: 0 };
  }

  all[dateKey][domain].seconds += seconds;
  all[dateKey][domain].category = category; // keep category fresh
  all[dateKey][domain].lastVisit = Date.now();

  return new Promise((resolve) => {
    chrome.storage.local.set({ [DATA_KEY]: all }, resolve);
  });
}

/**
 * Increments the visit counter for a domain/day.
 *
 * @param {string} dateKey
 * @param {string} domain
 * @param {string} category
 */
export async function recordVisit(dateKey, domain, category) {
  const all = await loadAllData();

  if (!all[dateKey]) all[dateKey] = {};
  if (!all[dateKey][domain]) {
    all[dateKey][domain] = { seconds: 0, category, visits: 0, lastVisit: 0 };
  }

  all[dateKey][domain].visits += 1;
  all[dateKey][domain].category = category;
  all[dateKey][domain].lastVisit = Date.now();

  return new Promise((resolve) => {
    chrome.storage.local.set({ [DATA_KEY]: all }, resolve);
  });
}

/**
 * Loads user settings with defaults applied.
 * @returns {Promise<Object>}
 */
export async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEY, (result) => {
      resolve({
        dailyGoalMinutes: 240,
        notifications: true,
        customProductive: [],
        customUnproductive: [],
        ...(result[SETTINGS_KEY] || {}),
      });
    });
  });
}

/**
 * Saves (merges) settings.
 * @param {Object} patch
 */
export async function saveSettings(patch) {
  const current = await loadSettings();
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, ...patch } }, resolve);
  });
}

/**
 * Clears all stored time data (keeps settings).
 */
export async function clearAllData() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(DATA_KEY, resolve);
  });
}

/**
 * Aggregates data across a date range into per-domain totals.
 *
 * @param {string[]} dateKeys - Array of "YYYY-MM-DD" strings
 * @returns {Promise<Object>} { domain: { seconds, category, visits } }
 */
export async function aggregateDates(dateKeys) {
  const all = await loadAllData();
  const result = {};

  for (const dateKey of dateKeys) {
    const dayData = all[dateKey] || {};
    for (const [domain, stats] of Object.entries(dayData)) {
      if (!result[domain]) {
        result[domain] = { seconds: 0, category: stats.category, visits: 0 };
      }
      result[domain].seconds += stats.seconds;
      result[domain].visits += stats.visits;
    }
  }

  return result;
}
