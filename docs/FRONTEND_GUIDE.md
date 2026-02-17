# Frontend Guide - NYC Urban Mobility Dashboard

How to run the frontend and how the folder structure is organized.

## How to run

1. Open the project folder and go into `frontend`.
2. Either:
   - Open `index.html` in a browser (double-click or drag into the browser), or
   - Serve the folder with a local server so the app can call the API from the same origin.

To use a local server from the project root:

```bash
# From project root (NYC-URBAN-MOBILITY-EXPLORER)
cd frontend
npx serve -l 3000
```

Then open `http://localhost:3000` in your browser.

If you run the backend API on another port, you may need to set the API base URL in `frontend/js/api.js` (e.g. `var API_BASE = "http://localhost:5000"`) or use a proxy.

## Folder structure

```
frontend/
  index.html              Main HTML: header, filter panel, main content (cards, charts, table)
  script.js               App logic: data fetch, charts, table, heatmap, theme

  styles/
    main.css              Layout, theme variables, grid, header, sidebar, main content
    components.css        Buttons, cards, inputs, table, heatmap, loading overlay

  js/
    api.js                API service: fetchTrips(page, limit, filters), fetchZones(), handleError()
    filters.js             Filter panel: getFilterValues(), clearAllFilters()
    summary-cards.js       Summary cards: updateCards(data)
```

## What each part does

- **index.html**  
  Structure only: filter panel (left), main area (right). Sections for filters, summary cards, charts, heatmap, zone stats, trip table. Scripts loaded in order: api, filters, summary-cards, then script.js.

- **styles/main.css**  
  Page layout, colors (theme variables), typography (Inter), grid, header, sidebar, main content, responsive breakpoints.

- **styles/components.css**  
  Reusable pieces: loading overlay, buttons, cards, form inputs, time-of-day buttons, table, heatmap, error message block.

- **js/api.js**  
  Calls the backend: `fetchTrips(page, limit, filters)` for GET /api/trips, `fetchZones()` for GET /api/zones. `handleError(error)` shows a short message on the page for network or server errors.

- **js/filters.js**  
  Reads the form: `getFilterValues()` returns an object with startDate, endDate, boroughs (Manhattan, Brooklyn, Queens, Bronx, Staten Island), selectedZones, fareMin, selectedTime. `clearAllFilters()` resets every filter input.

- **js/summary-cards.js**  
  `updateCards(data)` updates the three summary cards. `data` should have totalTrips, avgFare, and avgDistance.

- **script.js**  
  Uses the modules above: gets filters, fetches data (API first, then mock if API fails), updates summary cards via updateCards, and updates charts, heatmap, zone stats, and trip table.

## End status

Filters work (date range, borough checkboxes, zones, fare range, time of day, Apply, Clear All). The app can fetch data from the API when the backend is running; otherwise it uses mock data. Summary cards display Total Trips, Average Fare, and Average Distance and update when filters change.
