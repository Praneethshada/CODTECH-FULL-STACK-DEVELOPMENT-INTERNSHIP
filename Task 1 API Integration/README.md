# Task 1 API Integration

This project is a weather dashboard built with plain HTML, CSS, and JavaScript. It fetches live weather data from public APIs and shows it in a clean, responsive interface.

The app starts with Mumbai as the default city and lets users search for any location. It shows current weather, hourly forecast, and 7-day forecast.

## Project Goal

The goal of this task is to practice API integration in a frontend project without using any framework or backend service.

It covers:

1. Calling external APIs using `fetch`
2. Handling user input and search suggestions
3. Rendering dynamic UI from API data
4. Showing loading and error states
5. Making the interface responsive

## Files and What They Do

1. `index.html`
   Contains the full page structure, search input, weather cards, forecast sections, and script/style links.

2. `styles.css`
   Contains all visual styles, color theme, layout, responsiveness, hover effects, and dashboard animations.

3. `script.js`
   Contains all app logic: geocoding, weather fetch, weather code mapping, rendering data, clock updates, and suggestion handling.

## Features

1. City Search
   You can type a city name and press Enter or click the button to load weather.

2. Search Suggestions
   After typing at least two characters, the app fetches matching city suggestions.

3. Current Weather Block
   Shows city, country, local date and time, current temperature, feels like value, and weather condition.

4. Key Weather Stats
   Shows humidity, wind speed, pressure, and rain value.

5. Hourly Forecast
   Shows weather for the next 24 hours in a horizontal list.

6. 7-Day Forecast
   Shows daily condition, description, max and min temperature, and rain probability.

7. Live Clock
   A clock in the UI updates every second.

8. Responsive UI
   Layout adjusts for smaller screens and keeps the dashboard readable on mobile.

## APIs Used

1. Open-Meteo Forecast API
   Used to fetch current, hourly, and daily weather data.

Endpoint example:
`https://api.open-meteo.com/v1/forecast`

2. Nominatim Geocoding API (OpenStreetMap)
   Used to convert typed city names into latitude and longitude.

Endpoint example:
`https://nominatim.openstreetmap.org/search`

No API key is required for this project.

## How Data Flows in the App

1. User enters a city in the search input.
2. App calls geocoding API to get location coordinates.
3. App calls weather API with those coordinates.
4. Response is parsed and mapped to UI-friendly values.
5. Dashboard sections are updated with fresh weather data.
6. If API fails or city is not found, a clear status message is shown.

## How to Run

1. Open the project folder.
2. Open `index.html` in any modern browser.
3. Search for a city to view live weather.

You do not need a build step, package install, or server.

## Known Limitations

1. Uses metric units only (Celsius, km/h).
2. No unit switch (Celsius/Fahrenheit) yet.
3. No saved search history.
4. One city view at a time.
5. Depends on internet and API availability.

## Ideas for Improvement

1. Add unit toggle between Celsius and Fahrenheit.
2. Save recent searches in local storage.
3. Add geolocation for current user location.
4. Add weather icons per time of day.
5. Add loading skeletons for better UX on slow networks.

## Learning Highlights

This task demonstrates practical frontend API integration and teaches how to connect data services with user-friendly UI rendering. It is a strong example of JavaScript DOM manipulation, async programming with `async/await`, and error handling in real-time applications.
