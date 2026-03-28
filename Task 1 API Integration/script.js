// CODTECH INTERNSHIP — TASK 1: API INTEGRATION
// APIs    : Open-Meteo (weather) + Nominatim (geocoding)

// DOM REFERENCES
const cityInput = document.getElementById("city-input");
const btnSearch = document.getElementById("btn-search");
const statusMsg = document.getElementById("status-msg");
const dashboard = document.getElementById("dashboard");
const suggestionsEl = document.getElementById("suggestions");

// LIVE CLOCK

/* Updates the header clock every second using the
   Intl.DateTimeFormat API for locale-aware formatting */

function updateClock() {
  const now = new Date();
  document.getElementById("live-time").textContent = now.toLocaleTimeString(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  );
  document.getElementById("live-date").textContent = now.toLocaleDateString(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
}
setInterval(updateClock, 1000);
updateClock();

// WEATHER CODE: DESCRIPTION + EMOJI MAPPING
/*
 * Maps WMO weather interpretation codes to human-readable
 * descriptions and representative emojis.
 * Reference: https://open-meteo.com/en/docs#weathervariables
 */
const WMO_CODES = {
  0: { desc: "Clear Sky", emoji: "☀️" },
  1: { desc: "Mainly Clear", emoji: "🌤️" },
  2: { desc: "Partly Cloudy", emoji: "⛅" },
  3: { desc: "Overcast", emoji: "☁️" },
  45: { desc: "Foggy", emoji: "🌫️" },
  48: { desc: "Depositing Rime Fog", emoji: "🌫️" },
  51: { desc: "Light Drizzle", emoji: "🌦️" },
  53: { desc: "Moderate Drizzle", emoji: "🌦️" },
  55: { desc: "Dense Drizzle", emoji: "🌧️" },
  61: { desc: "Slight Rain", emoji: "🌧️" },
  63: { desc: "Moderate Rain", emoji: "🌧️" },
  65: { desc: "Heavy Rain", emoji: "🌧️" },
  71: { desc: "Slight Snowfall", emoji: "🌨️" },
  73: { desc: "Moderate Snowfall", emoji: "❄️" },
  75: { desc: "Heavy Snowfall", emoji: "❄️" },
  77: { desc: "Snow Grains", emoji: "🌨️" },
  80: { desc: "Slight Rain Showers", emoji: "🌦️" },
  81: { desc: "Moderate Rain Showers", emoji: "🌧️" },
  82: { desc: "Violent Rain Showers", emoji: "⛈️" },
  85: { desc: "Slight Snow Showers", emoji: "🌨️" },
  86: { desc: "Heavy Snow Showers", emoji: "🌨️" },
  95: { desc: "Thunderstorm", emoji: "⛈️" },
  96: { desc: "Thunderstorm w/ Hail", emoji: "⛈️" },
  99: { desc: "Thunderstorm w/ Heavy Hail", emoji: "⛈️" },
};

function getWMO(code) {
  return WMO_CODES[code] ?? { desc: "Unknown", emoji: "🌡️" };
}

// GEOCODING (Nominatim / OpenStreetMap)
/**
 * Searches for city candidates using the free Nominatim API.
 * @param {string} query - Partial or full city name
 * @returns {Promise<Array>} Array of location objects
 */
async function geocodeCity(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&featuretype=city`;
  const resp = await fetch(url, {
    headers: {
      "Accept-Language": "en",
      "User-Agent": "WeatherScopeApp/1.0",
    },
  });
  if (!resp.ok) throw new Error("Geocoding failed");
  return resp.json();
}

// OPEN-METEO WEATHER FETCH
/*
 * Fetches current + hourly + daily weather from Open-Meteo.
 * Docs: https://open-meteo.com/en/docs
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Parsed JSON response
 */
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "wind_speed_10m",
      "surface_pressure",
      "rain",
      "weathercode",
    ].join(","),
    hourly: ["temperature_2m", "precipitation_probability", "weathercode"].join(
      ",",
    ),
    daily: [
      "weathercode",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
    ].join(","),
    timezone: "auto",
    forecast_days: 7,
  });

  const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!resp.ok) throw new Error("Weather API request failed");
  return resp.json();
}

// AUTOCOMPLETE SUGGESTIONS
let debounceTimer;

cityInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const q = cityInput.value.trim();
  if (q.length < 2) {
    hideSuggestions();
    return;
  }

  // Debounce: wait 350ms after user stops typing before querying API
  debounceTimer = setTimeout(async () => {
    try {
      const results = await geocodeCity(q);
      renderSuggestions(results);
    } catch (_) {
      hideSuggestions();
    }
  }, 350);
});

function renderSuggestions(results) {
  if (!results.length) {
    hideSuggestions();
    return;
  }
  suggestionsEl.innerHTML = "";
  results.forEach((r) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.setAttribute("role", "option");
    item.textContent = r.display_name;
    item.addEventListener("click", () => {
      cityInput.value = r.display_name.split(",")[0]; // Show short name
      hideSuggestions();
      loadWeather(
        parseFloat(r.lat),
        parseFloat(r.lon),
        r.display_name.split(",").slice(0, 2).join(", "),
      );
    });
    suggestionsEl.appendChild(item);
  });
  suggestionsEl.classList.add("visible");
}

function hideSuggestions() {
  suggestionsEl.classList.remove("visible");
  suggestionsEl.innerHTML = "";
}

// Close suggestions on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrapper")) hideSuggestions();
});

// SEARCH BUTTON
btnSearch.addEventListener("click", handleSearch);
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});

async function handleSearch() {
  const q = cityInput.value.trim();
  if (!q) return;
  hideSuggestions();
  showStatus("loading", '<span class="spinner"></span> Looking up location…');

  try {
    const results = await geocodeCity(q);
    if (!results.length) throw new Error(`No city found for "${q}"`);
    const { lat, lon, display_name } = results[0];
    const label = display_name.split(",").slice(0, 2).join(", ");
    await loadWeather(parseFloat(lat), parseFloat(lon), label);
  } catch (err) {
    showStatus("error", `⚠️ ${err.message}`);
  }
}

// MAIN WEATHER LOADER
/*
 * Core function: fetches weather data and calls render helpers.
 * @param {number} lat     - City latitude
 * @param {number} lon     - City longitude
 * @param {string} label   - Human-readable city label
 */
async function loadWeather(lat, lon, label) {
  showStatus("loading", '<span class="spinner"></span> Fetching weather data…');
  btnSearch.disabled = true;

  try {
    const data = await fetchWeather(lat, lon);
    renderDashboard(data, label);
    hideStatus();
  } catch (err) {
    showStatus("error", `⚠️ ${err.message}. Please try again.`);
  } finally {
    btnSearch.disabled = false;
  }
}

// RENDER: DASHBOARD
function renderDashboard(data, label) {
  renderHero(data.current, label);
  renderStats(data.current);
  renderHourly(data.hourly);
  renderDaily(data.daily);

  // Show the dashboard panel with animation
  dashboard.classList.add("visible");
}

// RENDER: HERO (Current Conditions)
function renderHero(current, label) {
  const { desc, emoji } = getWMO(current.weathercode);
  const temp = Math.round(current.temperature_2m);
  const feels = Math.round(current.apparent_temperature);

  document.getElementById("d-location").textContent = label;
  document.getElementById("d-temp").innerHTML = `${temp}<sup>°C</sup>`;
  document.getElementById("d-desc").textContent = desc;
  document.getElementById("d-feels").textContent = `Feels like ${feels}°C`;
  document.getElementById("d-icon").textContent = emoji;
}

// RENDER: STAT CARDS
function renderStats(current) {
  document.getElementById("d-wind").innerHTML =
    `${Math.round(current.wind_speed_10m)}<span class="stat-unit">km/h</span>`;
  document.getElementById("d-humidity").innerHTML =
    `${current.relative_humidity_2m}<span class="stat-unit">%</span>`;
  document.getElementById("d-pressure").innerHTML =
    `${Math.round(current.surface_pressure)}<span class="stat-unit">hPa</span>`;
  document.getElementById("d-rain").innerHTML =
    `${current.rain.toFixed(1)}<span class="stat-unit">mm</span>`;
}

// RENDER: HOURLY STRIP
function renderHourly(hourly) {
  const container = document.getElementById("d-hourly");
  container.innerHTML = "";

  // Show next 24 hours only; find current hour index
  const now = new Date();
  const start = hourly.time.findIndex((t) => new Date(t) >= now);
  const slice = Math.max(start, 0);

  hourly.time.slice(slice, slice + 24).forEach((isoTime, i) => {
    const date = new Date(isoTime);
    const label =
      i === 0
        ? "Now"
        : date.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          });
    const code = hourly.weathercode[slice + i];
    const temp = Math.round(hourly.temperature_2m[slice + i]);
    const rain = hourly.precipitation_probability[slice + i];
    const { emoji } = getWMO(code);

    const el = document.createElement("div");
    el.className = "hourly-item" + (i === 0 ? " current" : "");
    el.setAttribute("role", "listitem");
    el.innerHTML = `
        <p class="hourly-time">${label}</p>
        <span class="hourly-icon">${emoji}</span>
        <p class="hourly-temp">${temp}°</p>
        <p class="hourly-rain">${rain}%</p>
      `;
    container.appendChild(el);
  });
}

// RENDER: 7-DAY FORECAST
function renderDaily(daily) {
  const container = document.getElementById("d-daily");
  container.innerHTML = "";

  daily.time.forEach((isoDate, i) => {
    const date = new Date(isoDate + "T00:00:00");
    const dayStr =
      i === 0
        ? "Today"
        : i === 1
          ? "Tomorrow"
          : date.toLocaleDateString("en-GB", { weekday: "long" });

    const code = daily.weathercode[i];
    const tmax = Math.round(daily.temperature_2m_max[i]);
    const tmin = Math.round(daily.temperature_2m_min[i]);
    const rain = daily.precipitation_probability_max[i] ?? 0;
    const { desc, emoji } = getWMO(code);

    const row = document.createElement("div");
    row.className = "forecast-row";
    row.setAttribute("role", "listitem");
    row.innerHTML = `
        <span class="forecast-day">${dayStr}</span>
        <span class="forecast-icon">${emoji}</span>
        <span class="forecast-desc">${desc}</span>
        <div class="forecast-rain-bar" title="${rain}% chance of rain">
          <div class="bar-track"><div class="bar-fill" style="width:${rain}%"></div></div>
          <span>${rain}%</span>
        </div>
        <span class="forecast-temps">${tmax}° <span class="low">${tmin}°</span></span>
      `;
    container.appendChild(row);
  });
}

// STATUS MESSAGES
function showStatus(type, html) {
  statusMsg.innerHTML = html;
  statusMsg.className = type;
  dashboard.classList.remove("visible");
}

function hideStatus() {
  statusMsg.innerHTML = "";
  statusMsg.className = "";
}

// ON PAGE LOAD: auto-load with a default city
// Kick off with a default city so the dashboard isn't empty on first load.

window.addEventListener("load", () => {
  cityInput.value = "Mumbai";
  handleSearch();
});
