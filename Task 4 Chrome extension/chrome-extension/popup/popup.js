/**
 * popup.js — ProductivityPulse Popup Script
 * ─────────────────────────────────────────────────────────────────
 * Runs inside popup.html. Responsibilities:
 *  1. Ask the background worker to flush the in-flight session
 *  2. Load today's data from chrome.storage.local
 *  3. Render the mini dashboard (ring chart, stats, top sites)
 * ─────────────────────────────────────────────────────────────────
 *
 * NOTE: Because popup.html runs as its own document (not as a module),
 * we cannot use ES "import". Instead we duplicate the tiny helpers we
 * need inline. The shared logic lives in utils/ for the background
 * service worker which CAN use modules.
 */

"use strict";

// ── Inline helpers (mirrors utils/storage.js + utils/classifier.js) ──

const DATA_KEY = "timeData";
const SETTINGS_KEY = "ppSettings";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Format seconds → "Xh Ym" or "Ym" or "<1m" */
function fmtTime(seconds) {
  if (seconds < 60) return "<1m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Category → badge styles */
const CAT_STYLE = {
  productive:   { color: "#22c55e", bg: "rgba(34,197,94,0.15)",   label: "Productive" },
  unproductive: { color: "#ef4444", bg: "rgba(239,68,68,0.15)",   label: "Distracting" },
  neutral:      { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  label: "Neutral" },
};

/** Site bar colour by category */
const BAR_COLOUR = {
  productive: "#22c55e",
  unproductive: "#ef4444",
  neutral: "#f59e0b",
};

// ── Boot ──────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Flush in-flight session so numbers are up-to-date
  try {
    await chrome.runtime.sendMessage({ type: "FLUSH_NOW" });
  } catch {
    // background may not be running; continue anyway
  }

  // 2. Grab active session info for "tracking now" banner
  let activeSession = null;
  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_ACTIVE_SESSION" });
    activeSession = res?.session ?? null;
  } catch {
    // ignore
  }

  // 3. Load today's data + settings
  const [storageResult, settingsResult] = await Promise.all([
    new Promise((r) => chrome.storage.local.get(DATA_KEY, r)),
    new Promise((r) => chrome.storage.local.get(SETTINGS_KEY, r)),
  ]);

  const allData   = storageResult[DATA_KEY] || {};
  const dayData   = allData[todayKey()] || {};
  const settings  = { dailyGoalMinutes: 240, ...(settingsResult[SETTINGS_KEY] || {}) };

  // 4. Compute totals
  let prodSec = 0, unproSec = 0, neutSec = 0;
  for (const { seconds, category } of Object.values(dayData)) {
    if (category === "productive")   prodSec  += seconds;
    else if (category === "unproductive") unproSec += seconds;
    else                             neutSec  += seconds;
  }
  const totalSec = prodSec + unproSec + neutSec;
  const trackedSec = prodSec + unproSec + neutSec;
  // Productivity score = productive / (productive + unproductive) × 100
  const score = (prodSec + unproSec) > 0
    ? Math.round((prodSec / (prodSec + unproSec)) * 100)
    : 0;

  // 5. Render active site banner
  const domEl = document.getElementById("activeDomain");
  const badgeEl = document.getElementById("activeBadge");
  if (activeSession?.domain) {
    domEl.textContent = activeSession.domain;
    const s = CAT_STYLE[activeSession.category] || CAT_STYLE.neutral;
    badgeEl.textContent = s.label;
    badgeEl.style.color = s.color;
    badgeEl.style.background = s.bg;
  } else {
    domEl.textContent = "Nothing tracked";
    badgeEl.textContent = "Idle";
    badgeEl.style.color = "#6b7280";
    badgeEl.style.background = "rgba(107,114,128,0.15)";
  }

  // 6. Render ring chart (circumference = 2π×38 ≈ 238.76)
  const circumference = 238.76;
  const offset = circumference - (score / 100) * circumference;
  document.getElementById("ringFill").style.strokeDashoffset = offset;
  document.getElementById("scoreVal").textContent = `${score}%`;

  // Colour ring by score
  const ringColour = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  document.getElementById("ringFill").style.stroke = ringColour;

  // 7. Render stat rows
  document.getElementById("prodTime").textContent  = fmtTime(prodSec);
  document.getElementById("unproTime").textContent = fmtTime(unproSec);
  document.getElementById("neutTime").textContent  = fmtTime(neutSec);
  document.getElementById("totalTime").textContent = fmtTime(totalSec);

  // 8. Goal progress
  const goalSec = settings.dailyGoalMinutes * 60;
  const goalPct = Math.min(100, Math.round((prodSec / goalSec) * 100));
  document.getElementById("goalLabel").textContent =
    `${Math.floor(prodSec / 60)} / ${settings.dailyGoalMinutes} min`;
  document.getElementById("goalBar").style.width = `${goalPct}%`;

  // 9. Top 5 sites
  const sorted = Object.entries(dayData)
    .sort(([, a], [, b]) => b.seconds - a.seconds)
    .slice(0, 5);

  const maxSec = sorted[0]?.[1]?.seconds || 1;
  const listEl = document.getElementById("sitesList");

  if (sorted.length === 0) {
    listEl.innerHTML = '<div class="empty">No data yet today. Keep browsing!</div>';
  } else {
    listEl.innerHTML = sorted.map(([domain, { seconds, category }]) => {
      const pct = Math.round((seconds / maxSec) * 100);
      const barColor = BAR_COLOUR[category] || BAR_COLOUR.neutral;
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      return `
        <div class="site-row">
          <img class="site-favicon" src="${favicon}" alt="" onerror="this.style.display='none'"/>
          <span class="site-name" title="${domain}">${domain}</span>
          <div class="site-bar-wrap">
            <div class="site-bar" style="width:${pct}%;background:${barColor}"></div>
          </div>
          <span class="site-time">${fmtTime(seconds)}</span>
        </div>
      `;
    }).join("");
  }

  // 10. Show content, hide loader
  document.getElementById("loading").style.display = "none";
  document.getElementById("mainContent").style.display = "block";

  // 11. Buttons
  document.getElementById("dashBtn").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById("refreshBtn").addEventListener("click", async () => {
    document.getElementById("loading").style.display = "block";
    document.getElementById("mainContent").style.display = "none";
    // Reload the popup
    window.location.reload();
  });
});
