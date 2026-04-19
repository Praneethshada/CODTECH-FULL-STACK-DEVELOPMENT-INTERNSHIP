/**
 * dashboard.js — ProductivityPulse Analytics Dashboard
 * ─────────────────────────────────────────────────────────────────
 * Renders all charts and tables in dashboard.html using data from
 * chrome.storage.local. Chart.js is used for all visualisations.
 *
 * Pages:
 *  • today   – hourly bar chart, donut, top sites table
 *  • weekly  – 7-day grid, trend line chart, aggregate table
 *  • sites   – all-time per-domain table with search
 *  • settings – goal, notifications, custom domains, clear data
 * ─────────────────────────────────────────────────────────────────
 */

"use strict";

// ── Constants ─────────────────────────────────────────────────────

const DATA_KEY     = "timeData";
const SETTINGS_KEY = "ppSettings";

const CAT_COLOR = {
  productive:   "#22c55e",
  unproductive: "#ef4444",
  neutral:      "#f59e0b",
};

const CAT_LABEL = {
  productive:   "Productive",
  unproductive: "Distracting",
  neutral:      "Neutral",
};

// ── Utility helpers ───────────────────────────────────────────────

/** Format seconds → "Xh Ym" or "Zm" or "<1m" */
function fmt(sec) {
  if (sec < 60) return "<1m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** ISO date string for a day N days ago */
function dateKey(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

/** Human-readable date label */
function dateLabel(isoKey) {
  const [y, mo, day] = isoKey.split("-").map(Number);
  return new Date(y, mo - 1, day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Load all data from chrome.storage.local */
async function loadAll() {
  return new Promise((r) => chrome.storage.local.get(DATA_KEY, (res) => r(res[DATA_KEY] || {})));
}

/** Load settings from chrome.storage.local */
async function loadSettings() {
  return new Promise((r) => chrome.storage.local.get(SETTINGS_KEY, (res) =>
    r({ dailyGoalMinutes: 240, notifications: true, customProductive: [], customUnproductive: [], ...(res[SETTINGS_KEY] || {}) })
  ));
}

/** Compute totals from a day data object → { prod, unpro, neut } */
function dayTotals(dayData) {
  let prod = 0, unpro = 0, neut = 0;
  for (const { seconds, category } of Object.values(dayData)) {
    if (category === "productive")   prod  += seconds;
    else if (category === "unproductive") unpro += seconds;
    else                             neut  += seconds;
  }
  return { prod, unpro, neut };
}

/** Productivity score (0–100) from totals */
function score(prod, unpro) {
  return (prod + unpro) > 0 ? Math.round((prod / (prod + unpro)) * 100) : 0;
}

/** Score → colour */
function scoreColor(s) {
  return s >= 70 ? "#22c55e" : s >= 40 ? "#f59e0b" : "#ef4444";
}

/** Category pill HTML */
function catPill(cat) {
  const color = CAT_COLOR[cat] || "#6b7280";
  return `<span class="cat-pill" style="color:${color};background:${color}22">${CAT_LABEL[cat] || "Neutral"}</span>`;
}

/** Show toast notification */
function showToast(msg, error = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.background = error ? "#ef4444" : "#22c55e";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

// ── Chart instances (kept for destroy on re-render) ───────────────
let hourlyChart, donutChart, weeklyChart;

// ── TODAY PAGE ────────────────────────────────────────────────────

async function renderToday() {
  // Flush latest session
  try { await chrome.runtime.sendMessage({ type: "FLUSH_NOW" }); } catch {}

  const all = await loadAll();
  const settings = await loadSettings();
  const today = dateKey(0);
  const dayData = all[today] || {};

  // Set date label
  document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Totals
  const { prod, unpro, neut } = dayTotals(dayData);
  const total = prod + unpro + neut;
  const sc = score(prod, unpro);
  const goalSec = settings.dailyGoalMinutes * 60;
  const goalPct = Math.min(100, Math.round((prod / goalSec) * 100));

  // Stat cards
  document.getElementById("s-prod").textContent   = fmt(prod);
  document.getElementById("s-unpro").textContent  = fmt(unpro);
  document.getElementById("s-neut").textContent   = fmt(neut);
  document.getElementById("s-score").textContent  = `${sc}%`;
  document.getElementById("s-score").style.color  = scoreColor(sc);

  document.getElementById("s-prod-pct").textContent  = total > 0 ? `${Math.round((prod/total)*100)}% of tracked time` : "No data yet";
  document.getElementById("s-unpro-pct").textContent = total > 0 ? `${Math.round((unpro/total)*100)}% of tracked time` : "";
  document.getElementById("s-neut-pct").textContent  = total > 0 ? `${Math.round((neut/total)*100)}% of tracked time` : "";
  document.getElementById("s-goal").textContent = `Goal: ${goalPct}% (${Math.floor(prod/60)}/${settings.dailyGoalMinutes} min)`;

  // ── Hourly chart ──────────────────────────────────────────
  // Build hourly buckets from raw data using lastVisit timestamps
  // Since we store only totals, we distribute time across the current hour
  const hourBuckets = new Array(24).fill(0).map(() => ({ prod: 0, unpro: 0, neut: 0 }));

  // We approximate: put all of today's seconds into the bucket for the lastVisit hour
  for (const { seconds, category, lastVisit } of Object.values(dayData)) {
    if (!lastVisit) continue;
    const h = new Date(lastVisit).getHours();
    if (category === "productive")   hourBuckets[h].prod  += seconds;
    else if (category === "unproductive") hourBuckets[h].unpro += seconds;
    else                             hourBuckets[h].neut  += seconds;
  }

  const hourLabels = hourBuckets.map((_, i) => {
    const h = i % 12 || 12;
    return `${h}${i < 12 ? "am" : "pm"}`;
  });

  if (hourlyChart) hourlyChart.destroy();
  hourlyChart = new Chart(document.getElementById("hourlyChart"), {
    type: "bar",
    data: {
      labels: hourLabels,
      datasets: [
        { label: "Productive",   data: hourBuckets.map((b) => Math.round(b.prod / 60)),  backgroundColor: "#22c55e88", borderRadius: 4 },
        { label: "Distracting",  data: hourBuckets.map((b) => Math.round(b.unpro / 60)), backgroundColor: "#ef444488", borderRadius: 4 },
        { label: "Neutral",      data: hourBuckets.map((b) => Math.round(b.neut / 60)),  backgroundColor: "#f59e0b88", borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#94a3b8", boxRadius: 4 } } },
      scales: {
        x: { stacked: true, ticks: { color: "#64748b", maxRotation: 0 }, grid: { color: "#1e2235" } },
        y: { stacked: true, ticks: { color: "#64748b" }, grid: { color: "#1e2235" }, title: { display: true, text: "Minutes", color: "#64748b" } },
      },
    },
  });

  // ── Donut chart ──────────────────────────────────────────
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById("donutChart"), {
    type: "doughnut",
    data: {
      labels: ["Productive", "Distracting", "Neutral"],
      datasets: [{
        data: [Math.round(prod / 60), Math.round(unpro / 60), Math.round(neut / 60)],
        backgroundColor: ["#22c55ecc", "#ef4444cc", "#f59e0bcc"],
        borderColor: "#0f1320",
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: false,
      cutout: "65%",
      plugins: {
        legend: { position: "bottom", labels: { color: "#94a3b8", padding: 12, boxRadius: 4 } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}m` } },
      },
    },
  });

  // ── Sites table ──────────────────────────────────────────
  renderTodayTable(dayData, "");

  document.getElementById("todaySearch").addEventListener("input", (e) => {
    renderTodayTable(dayData, e.target.value);
  });
}

function renderTodayTable(dayData, filter) {
  const sorted = Object.entries(dayData)
    .filter(([d]) => d.includes(filter))
    .sort(([, a], [, b]) => b.seconds - a.seconds);

  const maxSec = sorted[0]?.[1]?.seconds || 1;
  const total = sorted.reduce((s, [, v]) => s + v.seconds, 0) || 1;

  document.getElementById("todayTable").innerHTML = sorted.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:20px">No data found</td></tr>`
    : sorted.map(([domain, { seconds, category, visits }]) => `
      <tr>
        <td>
          <div class="table-domain">
            <img class="favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" onerror="this.style.display='none'" />
            ${domain}
          </div>
        </td>
        <td>${catPill(category)}</td>
        <td style="font-weight:700">${fmt(seconds)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="bar-wrap">
              <div class="bar-fill" style="width:${Math.round((seconds/maxSec)*100)}%;background:${CAT_COLOR[category]||'#64748b'}"></div>
            </div>
            <span style="color:#64748b;font-size:12px">${Math.round((seconds/total)*100)}%</span>
          </div>
        </td>
        <td style="color:#64748b">${visits || 0}</td>
      </tr>
    `).join("");
}

// ── WEEKLY PAGE ───────────────────────────────────────────────────

async function renderWeekly() {
  const all = await loadAll();

  const days = Array.from({ length: 7 }, (_, i) => ({
    key: dateKey(6 - i),
    label: new Date(new Date().setDate(new Date().getDate() - (6 - i)))
      .toLocaleDateString("en-US", { weekday: "short" }),
    data: all[dateKey(6 - i)] || {},
  }));

  // ── Weekly day cards ─────────────────────────────────
  const maxProd = Math.max(...days.map((d) => dayTotals(d.data).prod), 1);

  document.getElementById("weekGrid").innerHTML = days.map(({ key, label, data }) => {
    const { prod, unpro, neut } = dayTotals(data);
    const sc = score(prod, unpro);
    const color = scoreColor(sc);
    const barPct = Math.round((prod / maxProd) * 100);
    return `
      <div class="day-card">
        <div class="day-name">${label}</div>
        <div class="day-score" style="color:${color}">${sc}%</div>
        <div class="day-time">${fmt(prod + unpro + neut)}</div>
        <div class="day-bar-track">
          <div class="day-bar-fill" style="width:${barPct}%;background:${color}"></div>
        </div>
      </div>
    `;
  }).join("");

  // ── Weekly trend chart ────────────────────────────────
  if (weeklyChart) weeklyChart.destroy();
  weeklyChart = new Chart(document.getElementById("weeklyChart"), {
    type: "line",
    data: {
      labels: days.map((d) => d.label),
      datasets: [
        {
          label: "Productive (min)",
          data: days.map((d) => Math.round(dayTotals(d.data).prod / 60)),
          borderColor: "#22c55e",
          backgroundColor: "#22c55e22",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#22c55e",
        },
        {
          label: "Distracting (min)",
          data: days.map((d) => Math.round(dayTotals(d.data).unpro / 60)),
          borderColor: "#ef4444",
          backgroundColor: "#ef444422",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#ef4444",
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#94a3b8", boxRadius: 4 } } },
      scales: {
        x: { ticks: { color: "#64748b" }, grid: { color: "#1e2235" } },
        y: { ticks: { color: "#64748b" }, grid: { color: "#1e2235" }, beginAtZero: true },
      },
    },
  });

  // ── Aggregate weekly table ───────────────────────────
  const aggregate = {};
  for (const { data } of days) {
    for (const [domain, stats] of Object.entries(data)) {
      if (!aggregate[domain]) aggregate[domain] = { seconds: 0, category: stats.category, visits: 0 };
      aggregate[domain].seconds += stats.seconds;
      aggregate[domain].visits  += (stats.visits || 0);
    }
  }

  const sorted = Object.entries(aggregate).sort(([, a], [, b]) => b.seconds - a.seconds);

  document.getElementById("weeklyTable").innerHTML = sorted.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#64748b;padding:20px">No data this week yet</td></tr>`
    : sorted.map(([domain, { seconds, category, visits }]) => `
      <tr>
        <td>
          <div class="table-domain">
            <img class="favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" onerror="this.style.display='none'" />
            ${domain}
          </div>
        </td>
        <td>${catPill(category)}</td>
        <td style="font-weight:700">${fmt(seconds)}</td>
        <td style="color:#64748b">${visits}</td>
      </tr>
    `).join("");
}

// ── ALL SITES PAGE ────────────────────────────────────────────────

async function renderAllSites(filter = "") {
  const all = await loadAll();

  // Aggregate all dates
  const aggregate = {};
  for (const dayData of Object.values(all)) {
    for (const [domain, stats] of Object.entries(dayData)) {
      if (!aggregate[domain]) {
        aggregate[domain] = { seconds: 0, category: stats.category, visits: 0, lastVisit: 0 };
      }
      aggregate[domain].seconds  += stats.seconds;
      aggregate[domain].visits   += (stats.visits || 0);
      aggregate[domain].lastVisit = Math.max(aggregate[domain].lastVisit, stats.lastVisit || 0);
    }
  }

  const sorted = Object.entries(aggregate)
    .filter(([d]) => d.includes(filter))
    .sort(([, a], [, b]) => b.seconds - a.seconds);

  document.getElementById("allTable").innerHTML = sorted.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:20px">No data found</td></tr>`
    : sorted.map(([domain, { seconds, category, visits, lastVisit }]) => `
      <tr>
        <td>
          <div class="table-domain">
            <img class="favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" onerror="this.style.display='none'" />
            ${domain}
          </div>
        </td>
        <td>${catPill(category)}</td>
        <td style="font-weight:700">${fmt(seconds)}</td>
        <td style="color:#64748b">${visits}</td>
        <td style="color:#64748b;font-size:12px">${lastVisit ? new Date(lastVisit).toLocaleDateString() : "—"}</td>
      </tr>
    `).join("");
}

// ── SETTINGS PAGE ─────────────────────────────────────────────────

async function renderSettings() {
  const s = await loadSettings();
  document.getElementById("goalInput").value    = s.dailyGoalMinutes;
  document.getElementById("notifToggle").checked = s.notifications;
  document.getElementById("customProd").value   = (s.customProductive || []).join("\n");
  document.getElementById("customUnprod").value = (s.customUnproductive || []).join("\n");
}

async function saveSettings() {
  const patch = {
    dailyGoalMinutes: parseInt(document.getElementById("goalInput").value, 10) || 240,
    notifications:   document.getElementById("notifToggle").checked,
    customProductive: document.getElementById("customProd").value
      .split("\n").map((s) => s.trim()).filter(Boolean),
    customUnproductive: document.getElementById("customUnprod").value
      .split("\n").map((s) => s.trim()).filter(Boolean),
  };

  const current = await loadSettings();
  await new Promise((r) => chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, ...patch } }, r));
  showToast("✅ Settings saved!");
}

// ── EXPORT ────────────────────────────────────────────────────────

async function exportData() {
  const all = await loadAll();
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `productivity-pulse-export-${dateKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("📦 Data exported!");
}

// ── Navigation ────────────────────────────────────────────────────

const pageRenderers = {
  today:    renderToday,
  weekly:   renderWeekly,
  sites:    () => renderAllSites(""),
  settings: renderSettings,
};

function switchPage(id) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));

  document.getElementById(`page-${id}`)?.classList.add("active");
  document.querySelector(`[data-page="${id}"]`)?.classList.add("active");

  pageRenderers[id]?.();
}

// ── Boot ──────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Nav clicks
  document.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => switchPage(btn.dataset.page));
  });

  // All-sites search
  document.getElementById("allSearch").addEventListener("input", (e) => {
    renderAllSites(e.target.value.trim());
  });

  // Refresh button
  document.getElementById("refreshDash").addEventListener("click", renderToday);

  // Settings save
  document.getElementById("saveSettings").addEventListener("click", saveSettings);

  // Clear data
  document.getElementById("clearDataBtn").addEventListener("click", async () => {
    if (!confirm("This will permanently delete ALL tracking history. Continue?")) return;
    await new Promise((r) => chrome.storage.local.remove(DATA_KEY, r));
    showToast("🗑 All data cleared", false);
    renderToday();
  });

  // Export
  document.getElementById("exportBtn").addEventListener("click", exportData);

  // Initial render
  renderToday();
});
