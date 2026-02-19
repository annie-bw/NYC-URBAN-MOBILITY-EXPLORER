(function () {
  "use strict";

  var STORAGE_KEY = "nycDashboardTheme";
  var lastChartData = null;

  // Get/set theme preference; dark default, light uses white bg and same accent
  function getStoredTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      return saved === "light" ? "light" : "dark";
    } catch (e) {
      return "dark";
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
    var btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "dark" ? "Light" : "Dark";
  }

  // Zone list for heatmap; filled from API or fallback boroughs
  var zoneNamesForHeatmap = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
  var zoneLookup = {};
  var zoneIdToBorough = {};
  var zonesList = [];
  var zonesLoaded = false;



  // Map raw trip from API to normalized format for table and filters
  function normalizeTrip(raw, lookup) {
    var pickup = raw.pickup_datetime || raw.time;
    var dropoff = raw.dropoff_datetime || raw.time;
    var pickupDate = pickup ? new Date(pickup) : null;
    var durationMins = null;
    if (pickupDate && dropoff) {
      durationMins = Math.round((new Date(dropoff) - pickupDate) / 60000);
    }
    return {
      time: pickup,
      from: lookup[raw.pickup_zone_id] || "?",
      to: lookup[raw.dropoff_zone_id] || "?",
      fare: raw.fare_amount != null ? raw.fare_amount : raw.fare,
      passengers: raw.passenger_count != null ? raw.passenger_count : raw.passengers || 1,
      hour: pickupDate ? pickupDate.getHours() : 0,
      distance: raw.trip_distance != null ? raw.trip_distance : raw.distance,
      duration: raw.trip_duration_minutes != null ? raw.trip_duration_minutes : durationMins,
      trip_duration_minutes: raw.trip_duration_minutes != null ? raw.trip_duration_minutes : durationMins,
      pickup_zone_id: raw.pickup_zone_id,
      dropoff_zone_id: raw.dropoff_zone_id
    };
  }

  // Convert backend heat map (borough + hours) to our grid format.
  // Borough list is built from whatever the API actually returns — not the
  // hardcoded fallback — so filtered views only show the relevant boroughs.
  function heatMapFromApi(apiRows) {
    if (!apiRows || !Array.isArray(apiRows) || apiRows.length === 0) return {};

    // Derive borough order from API response and update the module-level list
    // so updateHeatmap renders exactly these rows, nothing more.
    // Preserve the order the API returns — do not re-sort.
    var names = apiRows.map(function (r) { return r.name; }).filter(Boolean);
    zoneNamesForHeatmap = names;

    var zoneHours = {};
    zoneNamesForHeatmap.forEach(function (z) {
      zoneHours[z] = Array(24).fill(0);
    });
    apiRows.forEach(function (row) {
      if (!zoneHours[row.name]) return;
      for (var h = 0; h < 24; h++) {
        var cell = row.hours && row.hours[h];
        zoneHours[row.name][h] = cell ? (cell.trips || 0) : 0;
      }
    });
    return zoneHours;
  }

  // Use getFilterValues from filters.js
  function getFilters() {
    return window.getFilterValues ? window.getFilterValues() : { startDate: null, endDate: null, boroughs: [], selectedZones: [], fareMin: 0, selectedTime: null };
  }

  // All filtering is now handled by the backend via buildTripsQuery.
  // Borough, date, fare, time of day, and zone IDs are all sent as query params
  // and applied in SQL — no client-side re-filtering needed.
  function filterTrips(tripsData) {
    return tripsData.slice();
  }

  var routesChart = null;
  var timeSeriesChart = null;
  var anomalyChart = null;

  // Chart colors follow theme: accent #0FA3A3, scale text from data-theme
  function getChartThemeColors() {
    var isLight = document.documentElement.getAttribute("data-theme") === "light";
    return {
      accent: "rgba(15, 163, 163, 0.8)",
      accentBorder: "#0FA3A3",
      scaleText: isLight ? "#525252" : "#a3a3a3",
      grid: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"
    };
  }

  // Shorten long route labels so they fit in the chart; full text shows in tooltip
  function shortenRouteLabel(route, maxLen) {
    maxLen = maxLen || 20;
    var s = String(route).replace(/\s*-\s*/g, " → ");
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen - 1) + "…";
  }

  // Update bar chart and line chart with new route and time-series data
  function updateCharts(tripsData, topRoutes, timeSeries) {
    var colors = getChartThemeColors();
    var routeLabels = topRoutes.map(function (r) { return shortenRouteLabel(r.route); });
    var routeValues = topRoutes.map(function (r) { return r.trips; });
    var routesCtx = document.getElementById("routesChart").getContext("2d");
    if (routesChart) routesChart.destroy();
    routesChart = new Chart(routesCtx, {
      type: "bar",
      data: {
        labels: routeLabels.length ? routeLabels : ["No data"],
        datasets: [{ label: "Trips", data: routeValues.length ? routeValues : [0], backgroundColor: colors.accent }]
      },
      options: {
        indexAxis: "y",
        layout: {
          padding: { left: 12, right: 8, top: 4, bottom: 4 }
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: function (items) {
                var idx = items[0] && items[0].dataIndex;
                return idx >= 0 && topRoutes[idx] ? topRoutes[idx].route : "";
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: "Number of Trips", color: colors.scaleText },
            ticks: { color: colors.scaleText },
            grid: { color: colors.grid }
          },
          y: {
            ticks: { color: colors.scaleText, maxWidth: 140, autoSkip: false },
            grid: { color: colors.grid }
          }
        },
        responsive: true,
        maintainAspectRatio: true
      }
    });

    var tsLabels = timeSeries.map(function (d) { return d.day; });
    var tsValues = timeSeries.map(function (d) { return d.trips; });
    var tsCtx = document.getElementById("timeSeriesChart").getContext("2d");
    if (timeSeriesChart) timeSeriesChart.destroy();
    timeSeriesChart = new Chart(tsCtx, {
      type: "line",
      data: {
        labels: tsLabels.length ? tsLabels : ["No data"],
        datasets: [{ label: "Trips", data: tsValues.length ? tsValues : [0], borderColor: colors.accentBorder, fill: false, tension: 0.2 }]
      },
      options: {
        scales: {
          x: {
            title: { display: true, text: "Day", color: colors.scaleText },
            ticks: { color: colors.scaleText },
            grid: { color: colors.grid }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: "Number of Trips", color: colors.scaleText },
            ticks: { color: colors.scaleText },
            grid: { color: colors.grid }
          }
        },
        responsive: true,
        maintainAspectRatio: true
      }
    });
  }

  function updateHeatmap(zoneHours) {
    var gridEl = document.getElementById("heatmapGrid");
    if (!gridEl) return;

    // If no data came back (e.g. a filter returned zero trips), show a message
    if (!zoneHours || zoneNamesForHeatmap.length === 0) {
      gridEl.innerHTML = "<div class='heatmap-empty'>No data for current selection.</div>";
      return;
    }

    // Normalize per borough — each row uses its own min/max so every borough
    // shows its own relative activity pattern. A shared global min/max causes
    // high-volume boroughs (Manhattan) to wash out all others to near-zero colour.
    var zoneBounds = {};
    zoneNamesForHeatmap.forEach(function (z) {
      var vals = zoneHours[z] || [];
      var lo = Infinity, hi = -Infinity;
      vals.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
      zoneBounds[z] = { min: lo === Infinity ? 0 : lo, max: hi === -Infinity ? 0 : hi };
    });

    function normalize(val, z) {
      var lo = zoneBounds[z].min;
      var range = zoneBounds[z].max - lo;
      return range === 0 ? 0 : (val - lo) / range;
    }

    // Color scale: Low #134E4A, Medium #14B8A6, High #2DD4BF. Two-segment interpolation.
    // Low to Medium (normalized 0-0.5), then Medium to High (0.5-1). High values = stronger/brighter.
    function getColor(normalized) {
      var r, g, b;
      if (normalized <= 0.5) {
        var t = normalized * 2;
        r = 19 + (20 - 19) * t;
        g = 78 + (184 - 78) * t;
        b = 74 + (166 - 74) * t;
      } else {
        var t = (normalized - 0.5) * 2;
        r = 20 + (45 - 20) * t;
        g = 184 + (212 - 184) * t;
        b = 166 + (191 - 166) * t;
      }
      return "rgb(" + Math.round(r) + "," + Math.round(g) + "," + Math.round(b) + ")";
    }

    function hourLabel(h) {
      return h === 0 ? "12AM" : h < 12 ? h + "AM" : h === 12 ? "12PM" : (h - 12) + "PM";
    }

    gridEl.innerHTML = "";

    // Build grid: all cells as direct children for CSS grid layout. No numbers in data cells.
    // Row 0: empty corner + 24 hour labels
    var corner = document.createElement("div");
    corner.className = "heatmap-cell heatmap-corner";
    gridEl.appendChild(corner);
    for (var h = 0; h < 24; h++) {
      var headerCell = document.createElement("div");
      headerCell.className = "heatmap-cell heatmap-header-cell";
      headerCell.textContent = hourLabel(h);
      gridEl.appendChild(headerCell);
    }

    // Rows: borough name + 24 data cells (background color only)
    zoneNamesForHeatmap.forEach(function (z) {
      var zoneCell = document.createElement("div");
      zoneCell.className = "heatmap-cell heatmap-zone-cell";
      zoneCell.textContent = z;
      gridEl.appendChild(zoneCell);
      for (var j = 0; j < 24; j++) {
        var val = zoneHours[z][j];
        var norm = normalize(val, z);
        var color = getColor(norm);
        var dataCell = document.createElement("div");
        dataCell.className = "heatmap-cell heatmap-data-cell";
        dataCell.style.backgroundColor = color;
        dataCell.title = z + " " + hourLabel(j) + ": " + val + " trips";
        gridEl.appendChild(dataCell);
      }
    });
  }

  function updateSummaryCards(tripsData) {
    var total = tripsData.length;
    var avgFare = total ? (tripsData.reduce(function (s, t) { return s + t.fare; }, 0) / total).toFixed(2) : "0";
    var avgDist = total ? (tripsData.reduce(function (s, t) { return s + (t.distance || 0); }, 0) / total).toFixed(1) : "0";
    if (window.updateCards) {
      window.updateCards({ totalTrips: total, avgFare: "$" + avgFare, avgDistance: avgDist + " mi" });
    } else {
      document.getElementById("totalTrips").textContent = total;
      document.getElementById("avgFare").textContent = "$" + avgFare;
      document.getElementById("avgDistance").textContent = avgDist + " mi";
    }
  }

  // Zone stats are always computed from whatever trips the backend already returned.
  // No filters = all trips = city-wide stats.
  // Manhattan selected = only Manhattan trips = Manhattan stats.
  // Manhattan + Brooklyn = combined stats for both boroughs.
  // The "Total Trips" here always matches the row count in the table below.
  function updateZoneStats(trips) {
    var total = trips ? trips.length : 0;
    var avgFare = total
      ? "$" + (trips.reduce(function (s, t) { return s + (parseFloat(t.fare) || 0); }, 0) / total).toFixed(2)
      : "$0";
    var avgDist = total
      ? (trips.reduce(function (s, t) { return s + (parseFloat(t.distance) || 0); }, 0) / total).toFixed(1) + " mi"
      : "0 mi";
    setZoneStatsEls(avgFare, avgDist, total);
  }

  function setZoneStatsEls(avgFare, avgDist, total) {
    var fa = document.getElementById("zoneAvgFare");
    var ad = document.getElementById("zoneAvgDistance");
    var tt = document.getElementById("zoneTotalTrips");
    if (fa) fa.textContent = avgFare;
    if (ad) ad.textContent = avgDist;
    if (tt) tt.textContent = total;
  }

  var currentTrips = [];
  var sortColumn = "time";
  var sortDir = 1;

  function updateTable(tripsData) {
    currentTrips = tripsData.slice();
    renderTableRows();
  }

  function formatDuration(trip) {
    var mins = trip.duration != null ? trip.duration : trip.trip_duration_minutes;
    if (mins == null) return "-";
    return mins + " min";
  }

  function renderTableRows() {
    var sorted = currentTrips.slice().sort(function (a, b) {
      var va = a[sortColumn];
      var vb = b[sortColumn];
      if (sortColumn === "time") return sortDir * (new Date(va) - new Date(vb));
      if (sortColumn === "fare" || sortColumn === "passengers") return sortDir * (va - vb);
      if (sortColumn === "duration") {
        var da = a.duration != null ? a.duration : a.trip_duration_minutes;
        var db = b.duration != null ? b.duration : b.trip_duration_minutes;
        return sortDir * ((da || 0) - (db || 0));
      }
      return sortDir * String(va).localeCompare(String(vb));
    });
    var tbody = document.getElementById("tripsTableBody");
    tbody.innerHTML = sorted.map(function (t) {
      var timeStr = new Date(t.time).toLocaleString();
      var dur = formatDuration(t);
      return "<tr><td>" + timeStr + "</td><td>" + t.from + "</td><td>" + t.to + "</td><td>" + dur + "</td><td>$" + t.fare + "</td><td>" + t.passengers + "</td></tr>";
    }).join("");
  }

  // Renders Previous / page numbers / Next below the trips table.
  // Shows pages around the current page (window of 5), always shows first and last.
  function renderPagination(page, totalPages, total) {
    var container = document.getElementById("tripsPagination");
    if (!container) return;
    if (!totalPages || totalPages <= 1) {
      container.innerHTML = "";
      return;
    }

    var html = '<div class="pagination-info">Showing page ' + page + ' of ' + totalPages + ' (' + total + ' trips total)</div>';
    html += '<div class="pagination-controls">';

    // Previous button
    html += '<button class="page-btn" ' + (page <= 1 ? "disabled" : "") + ' onclick="goToPage(' + (page - 1) + ')">← Prev</button>';

    // Page number buttons — show up to 5 around current page
    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, page + 2);

    if (start > 1) {
      html += '<button class="page-btn" onclick="goToPage(1)">1</button>';
      if (start > 2) html += '<span class="page-ellipsis">…</span>';
    }
    for (var p = start; p <= end; p++) {
      html += '<button class="page-btn' + (p === page ? " page-btn--active" : "") + '" onclick="goToPage(' + p + ')">' + p + '</button>';
    }
    if (end < totalPages) {
      if (end < totalPages - 1) html += '<span class="page-ellipsis">…</span>';
      html += '<button class="page-btn" onclick="goToPage(' + totalPages + ')">' + totalPages + '</button>';
    }

    // Next button
    html += '<button class="page-btn" ' + (page >= totalPages ? "disabled" : "") + ' onclick="goToPage(' + (page + 1) + ')">Next →</button>';

    html += '</div>';
    container.innerHTML = html;
  }

  // Called when a page button is clicked — fetches just that page of trips,
  // updates table and pagination, leaves charts/heatmap/cards unchanged
  window.goToPage = function (page) {
    if (page < 1 || page > currentTotalPages) return;
    currentPage = page;
    window.fetchTrips(page, 50, currentFilters)
      .then(function (res) {
        var rawTrips = (res.data || []);
        var trips = rawTrips.map(function (t) { return normalizeTrip(t, zoneLookup); });
        var filtered = filterTrips(trips, currentFilters);
        updateTable(filtered);
        renderPagination(res.page, res.totalPages, res.total);
        // Scroll table into view smoothly
        var tableEl = document.querySelector(".table-section");
        if (tableEl) tableEl.scrollIntoView({ behavior: "smooth", block: "start" });
      })
      .catch(function () {});
  };

  function bindTableSort() {
    document.querySelectorAll("#tripsTable th[data-sort]").forEach(function (th) {
      th.addEventListener("click", function () {
        var col = this.getAttribute("data-sort");
        if (sortColumn === col) sortDir = -sortDir; else { sortColumn = col; sortDir = 1; }
        document.querySelectorAll("#tripsTable th .sort-indicator").forEach(function (el) { el.remove(); });
        var ind = document.createElement("span");
        ind.className = "sort-indicator";
        ind.textContent = sortDir === 1 ? " ^" : " v";
        this.appendChild(ind);
        renderTableRows();
      });
    });
  }

  // Constrain date filters to the range of dates we have in the data
  function setDateRange(minDate, maxDate) {
    var startEl = document.getElementById("startDate");
    var endEl = document.getElementById("endDate");
    if (!startEl || !endEl || !minDate || !maxDate) return;
    startEl.min = minDate;
    startEl.max = maxDate;
    endEl.min = minDate;
    endEl.max = maxDate;
  }



  function showLoading(show) {
    var el = document.getElementById("loadingOverlay");
    if (show) el.classList.remove("hidden"); else el.classList.add("hidden");
  }

  // Load zones once on first call, reuse on every subsequent filter apply
  function loadZonesAndLookups(cb) {
    if (zonesLoaded || !window.fetchZones) {
      cb();
      return;
    }
    window.fetchZones()
      .then(function (res) {
        var rows = res.data || res || [];
        zonesList = rows;
        zoneLookup = {};
        zoneIdToBorough = {};
        rows.forEach(function (z) {
          var id = z.zone_id;
          var name = z.zone_name || z.borough || String(id);
          zoneLookup[id] = name;
          zoneIdToBorough[id] = z.borough || name;
        });
        populateZoneSelect(rows);
        zonesLoaded = true;
        cb();
      })
      .catch(function () {
        cb();
      });
  }

  function populateZoneSelect(zones) {
    var sel = document.getElementById("zoneSelect");
    if (!sel) return;
    sel.innerHTML = "";
    (zones || []).forEach(function (z) {
      var opt = document.createElement("option");
      opt.value = z.zone_id;
      opt.textContent = z.zone_name || z.borough || z.zone_id;
      sel.appendChild(opt);
    });
  }

  // Fetch all backend data; fall back to mock if any critical call fails
  function fetchData(filters, callback) {
    showLoading(true);
    loadZonesAndLookups(function () {

      Promise.all([
        window.fetchTrips(1, 50, filters).catch(function () { return null; }),
        window.fetchTopRoutes(filters).catch(function () { return null; }),
        window.fetchHeatMap(filters).catch(function () { return null; }),
        window.fetchTimeSeries(filters).catch(function () { return null; }),
        window.fetchCityOverview().catch(function () { return null; }),
        window.fetchFilteredStats ? window.fetchFilteredStats(filters).catch(function () { return null; }) : Promise.resolve(null)
      ]).then(function (results) {
        var tripsRes = results[0];
        var topRoutesRes = results[1];
        var heatMapRes = results[2];
        var timeSeriesRes = results[3];
        var cityOverviewRes = results[4];
        var filteredStatsRes = results[5];
        if (!tripsRes || !topRoutesRes || !heatMapRes || !timeSeriesRes) {
          if (window.handleError) window.handleError(new Error("Failed to fetch"));
          showLoading(false);
          return;
        }
        hideError();
        var rawTrips = (tripsRes.data || tripsRes) || [];
        var trips = rawTrips.map(function (t) { return normalizeTrip(t, zoneLookup); });
        var filtered = filterTrips(trips, filters);
        var topRoutes = topRoutesFromApi(topRoutesRes, zoneLookup);
        var heatmapData = heatMapFromApi(heatMapRes);
        var timeSeries = timeSeriesFromApi(timeSeriesRes);
        var dateRange = dateRangeFromTimeSeries(timeSeries);
        if (dateRange) setDateRange(dateRange.minDate, dateRange.maxDate);
        var summary = cityOverviewFromApi(cityOverviewRes);
        callback({
          trips: filtered,
          topRoutes: topRoutes,
          timeSeries: timeSeries,
          heatmap: heatmapData,
          cityOverview: summary,
          filteredStats: filteredStatsRes ? (filteredStatsRes.data || null) : null,
          dataSource: "api",
          page: tripsRes.page || 1,
          totalPages: tripsRes.totalPages || 1,
          total: tripsRes.total || 0
        });
        showLoading(false);
      }).catch(function () {
        if (window.handleError) window.handleError(new Error("Failed to fetch"));
        showLoading(false);
      });
    });
  }

  function topRoutesFromApi(res, lookup) {
    var rows = (res && res.data) || [];
    return rows.slice(0, 10).map(function (r) {
      var from = lookup[r.pickup_zone_id] || "Zone " + r.pickup_zone_id;
      var to = lookup[r.dropoff_zone_id] || "Zone " + r.dropoff_zone_id;
      return { route: from + " - " + to, trips: r.trip_count || 0 };
    });
  }

  function timeSeriesFromApi(res) {
    var rows = (res && res.data) || [];
    return rows.map(function (r) {
      var day = r.day;
      if (day && typeof day.toISOString === "function") day = day.toISOString().slice(0, 10);
      return { day: String(day || ""), trips: r.trip_count || 0 };
    }).sort(function (a, b) { return a.day.localeCompare(b.day); });
  }

  function dateRangeFromTimeSeries(ts) {
    if (!ts || ts.length === 0) return null;
    var days = ts.map(function (d) { return d.day; }).filter(Boolean);
    if (days.length === 0) return null;
    days.sort();
    return { minDate: days[0], maxDate: days[days.length - 1] };
  }

  function cityOverviewFromApi(res) {
    var rows = (res && res.data) || [];
    var row = rows[0];
    if (!row) return null;
    return {
      totalTrips: row.total_trips || 0,
      avgFare: row.average_fare != null ? "$" + Number(row.average_fare).toFixed(2) : "$0",
      avgDistance: row.average_distance != null ? Number(row.average_distance).toFixed(1) + " mi" : "0 mi"
    };
  }



  // Tracks current pagination state and the full-dataset stats
  var currentPage = 1;
  var currentTotalPages = 1;
  var currentFilters = {};
  var currentFilteredStats = null;

  function applyFiltersAndRefresh() {
    currentPage = 1; // reset to first page whenever filters change
    currentFilters = getFilters();

    var hasActiveFilters = (currentFilters.boroughs && currentFilters.boroughs.length > 0) ||
      (currentFilters.selectedZones && currentFilters.selectedZones.length > 0) ||
      currentFilters.startDate || currentFilters.endDate ||
      (currentFilters.fareMin && currentFilters.fareMin > 0) ||
      currentFilters.selectedTime;

    fetchData(currentFilters, function (data) {
      lastChartData = data;
      currentTotalPages = data.totalPages || 1;
      currentFilteredStats = data.filteredStats || null;


      // Summary cards + zone stats:
      // filteredStats comes from /api/analytics/filtered-stats which runs COUNT+AVG
      // over the FULL filtered dataset — not just the 50 trips on the current page.
      // Falls back to cityOverview (no filters) or computing from the page's trips.
      if (data.filteredStats) {
        var fs = data.filteredStats;
        var statsObj = {
          totalTrips: fs.total_trips || 0,
          avgFare: fs.avg_fare != null ? "$" + Number(fs.avg_fare).toFixed(2) : "$0",
          avgDistance: fs.avg_distance != null ? Number(fs.avg_distance).toFixed(1) + " mi" : "0 mi"
        };
        if (window.updateCards) window.updateCards(statsObj);
        else updateSummaryCards(data.trips);
        setZoneStatsEls(statsObj.avgFare, statsObj.avgDistance, statsObj.totalTrips);
      } else if (!hasActiveFilters && data.cityOverview) {
        if (window.updateCards) window.updateCards(data.cityOverview);
        else updateSummaryCards(data.trips);
        updateZoneStats(data.trips);
      } else {
        updateSummaryCards(data.trips);
        updateZoneStats(data.trips);
      }

      updateCharts(data.trips, data.topRoutes, data.timeSeries);
      updateHeatmap(data.heatmap);
      updateTable(data.trips);
      renderPagination(data.page, data.totalPages, data.total);
    });
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme") || "dark";
    var next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    if (lastChartData) {
      updateCharts(lastChartData.trips, lastChartData.topRoutes, lastChartData.timeSeries);
    }
  }

  function clearFilters() {
    if (window.clearAllFilters) window.clearAllFilters();
    applyFiltersAndRefresh();
  }

  // Anomaly panel: toggle to show/hide card with bar chart of anomaly counts
  function initAnomalyPanel() {
    var toggleBtn = document.getElementById("anomalyToggle");
    var closeBtn = document.getElementById("anomalyClose");
    var card = document.getElementById("anomalyCard");

    function openPanel() {
      card.classList.remove("hidden");
      loadAnomalyChart();
    }

    function closePanel() {
      card.classList.add("hidden");
    }

    function loadAnomalyChart() {
      if (window.fetchAnomalies) {
        // Anomalies always show city-wide totals — no filters applied.
        window.fetchAnomalies(true)
          .then(function (data) { renderAnomalyChart(data); })
          .catch(function () { renderAnomalyChart({ summary: {} }); });
      }
    }

    function renderAnomalyChart(data) {
      var summary = data.summary || {};
      var labels = ["Speed Too Fast", "Speed Too Slow", "Fare Too High", "Fare Too Low"];
      var values = [
        summary.speedTooFast || 0,
        summary.speedTooSlow || 0,
        summary.fareTooHigh || 0,
        summary.fareTooLow || 0
      ];
      var colors = getChartThemeColors();
      var ctx = document.getElementById("anomalyChart");
      if (!ctx) return;
      if (anomalyChart) anomalyChart.destroy();
      anomalyChart = new Chart(ctx.getContext("2d"), {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{ label: "Count", data: values, backgroundColor: colors.accent }]
        },
        options: {
          indexAxis: "y",
          scales: {
            x: { beginAtZero: true, ticks: { color: colors.scaleText }, grid: { color: colors.grid } },
            y: { ticks: { color: colors.scaleText }, grid: { color: colors.grid } }
          },
          plugins: { legend: { display: false } },
          responsive: true,
          maintainAspectRatio: true
        }
      });
    }

    if (toggleBtn) toggleBtn.addEventListener("click", openPanel);
    if (closeBtn) closeBtn.addEventListener("click", closePanel);
  }

  function init() {
    applyTheme(getStoredTheme());

    document.getElementById("themeToggle").addEventListener("click", toggleTheme);
    // Zone dropdown is filled when we load zones from API (in fetchData)

    document.getElementById("fareRange").addEventListener("input", function () {
      document.getElementById("fareValue").textContent = this.value;
    });

    document.querySelectorAll(".time-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".time-btn").forEach(function (b) { b.classList.remove("active"); });
        this.classList.add("active");
      });
    });

    document.getElementById("applyFilters").addEventListener("click", applyFiltersAndRefresh);
    document.getElementById("clearFilters").addEventListener("click", clearFilters);

    document.getElementById("sidebarToggle").addEventListener("click", function () {
      document.getElementById("sidebar").classList.toggle("open");
    });

    bindTableSort();
    initAnomalyPanel();

    // Date range is set from time-series data when we load (dates that exist in DB)
    // Initial load
    applyFiltersAndRefresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
