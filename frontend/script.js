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

  // Mock data; replace with fetch(/api/trips), fetch(/api/analytics/time-series), fetch(/api/analytics/top-routes)
  var zones = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island", "JFK", "LaGuardia", "Newark"];

  function randomInRange(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function generateMockTrips(count) {
    var trips = [];
    var baseDate = new Date("2024-01-01");
    for (var i = 0; i < count; i++) {
      var fromZone = zones[randomInRange(0, zones.length - 1)];
      var toZone = zones[randomInRange(0, zones.length - 1)];
      if (fromZone === toZone) toZone = zones[(zones.indexOf(fromZone) + 1) % zones.length];
      var hour = randomInRange(0, 23);
      var d = new Date(baseDate);
      d.setDate(d.getDate() + randomInRange(0, 30));
      d.setHours(hour, randomInRange(0, 59), 0, 0);
      trips.push({
        time: d.toISOString(),
        from: fromZone,
        to: toZone,
        fare: randomInRange(5, 85),
        passengers: randomInRange(1, 4),
        hour: hour,
        distance: randomInRange(2, 15)
      });
    }
    return trips;
  }

  // Build top routes from trip list (route = from-to)
  function buildTopRoutesFromTrips(tripsData) {
    var counts = {};
    tripsData.forEach(function (t) {
      var route = t.from + "-" + t.to;
      counts[route] = (counts[route] || 0) + 1;
    });
    return Object.keys(counts).map(function (r) { return { route: r, trips: counts[r] }; })
      .sort(function (a, b) { return b.trips - a.trips; }).slice(0, 10);
  }

  // Build time series from trip list by day
  function buildTimeSeriesFromTrips(tripsData) {
    var byDay = {};
    tripsData.forEach(function (t) {
      var day = t.time.slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    });
    var days = Object.keys(byDay).sort();
    return days.map(function (d) { return { day: d, trips: byDay[d] }; });
  }

  function buildHeatmapData(tripsData) {
    var zoneHours = {};
    zones.forEach(function (z) {
      zoneHours[z] = [];
      for (var h = 0; h < 24; h++) zoneHours[z].push(0);
    });
    tripsData.forEach(function (t) {
      if (zoneHours[t.from]) zoneHours[t.from][t.hour]++;
    });
    return zoneHours;
  }

  // Use getFilterValues from filters.js
  function getFilters() {
    return window.getFilterValues ? window.getFilterValues() : { startDate: null, endDate: null, boroughs: [], selectedZones: [], fareMin: 0, selectedTime: null };
  }

  // Filter trips based on date range, boroughs, zones, fare, and time of day
  function filterTrips(tripsData, filters) {
    var result = tripsData.slice();
    if (filters.startDate) {
      result = result.filter(function (t) { return t.time.slice(0, 10) >= filters.startDate; });
    }
    if (filters.endDate) {
      result = result.filter(function (t) { return t.time.slice(0, 10) <= filters.endDate; });
    }
    if (filters.boroughs && filters.boroughs.length > 0) {
      result = result.filter(function (t) {
        return filters.boroughs.indexOf(t.from) !== -1 || filters.boroughs.indexOf(t.to) !== -1;
      });
    }
    if (filters.selectedZones && filters.selectedZones.length > 0) {
      result = result.filter(function (t) {
        return filters.selectedZones.indexOf(t.from) !== -1 || filters.selectedZones.indexOf(t.to) !== -1;
      });
    }
    result = result.filter(function (t) { return t.fare >= (filters.fareMin || 0); });
    if (filters.selectedTime) {
      var ranges = { early: [0, 5], morning: [5, 10], midday: [10, 16], evening: [16, 21], night: [21, 24] };
      var r = ranges[filters.selectedTime];
      if (r) result = result.filter(function (t) { return t.hour >= r[0] && t.hour < r[1]; });
    }
    return result;
  }

  var routesChart = null;
  var timeSeriesChart = null;

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

  // Update bar chart and line chart with new route and time-series data
  function updateCharts(tripsData, topRoutes, timeSeries) {
    var colors = getChartThemeColors();
    var routeLabels = topRoutes.map(function (r) { return r.route; });
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
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: "Number of Trips", color: colors.scaleText },
            ticks: { color: colors.scaleText },
            grid: { color: colors.grid }
          },
          y: { ticks: { color: colors.scaleText }, grid: { color: colors.grid } }
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
    var thead = document.getElementById("heatmapHeader");
    var tbody = document.getElementById("heatmapBody");
    thead.innerHTML = "";
    tbody.innerHTML = "";
    var maxVal = 0;
    zones.forEach(function (z) {
      zoneHours[z].forEach(function (v) { if (v > maxVal) maxVal = v; });
    });
    if (maxVal === 0) maxVal = 1;
    var headerRow = "<th>Zone</th>";
    for (var h = 0; h < 24; h++) headerRow += "<th>" + (h === 0 ? "12AM" : h < 12 ? h + "AM" : h === 12 ? "12PM" : (h - 12) + "PM") + "</th>";
    thead.innerHTML = "<tr>" + headerRow + "</tr>";
    zones.forEach(function (z) {
      var row = "<tr><td>" + z + "</td>";
      for (var j = 0; j < 24; j++) {
        var intensity = zoneHours[z][j] / maxVal;
        var alpha = 0.15 + intensity * 0.65;
        row += "<td style=\"background:rgba(15,163,163," + alpha + ")\">" + zoneHours[z][j] + "</td>";
      }
      row += "</tr>";
      tbody.innerHTML += row;
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

  function updateZoneStats(tripsData, filters) {
    var zoneTrips = tripsData;
    var selected = (filters.boroughs && filters.boroughs.length > 0) ? filters.boroughs : (filters.selectedZones || []);
    if (selected.length > 0) {
      zoneTrips = tripsData.filter(function (t) {
        return selected.indexOf(t.from) !== -1 || selected.indexOf(t.to) !== -1;
      });
    }
    var total = zoneTrips.length;
    var avgFare = total ? (zoneTrips.reduce(function (s, t) { return s + t.fare; }, 0) / total).toFixed(2) : "0";
    var avgDist = total ? (zoneTrips.reduce(function (s, t) { return s + (t.distance || 0); }, 0) / total).toFixed(1) : "0";
    document.getElementById("zoneAvgFare").textContent = "$" + avgFare;
    document.getElementById("zoneAvgDistance").textContent = avgDist + " mi";
    document.getElementById("zoneTotalTrips").textContent = total;
  }

  var currentTrips = [];
  var sortColumn = "time";
  var sortDir = 1;

  function updateTable(tripsData) {
    currentTrips = tripsData.slice();
    renderTableRows();
  }

  function renderTableRows() {
    var sorted = currentTrips.slice().sort(function (a, b) {
      var va = a[sortColumn];
      var vb = b[sortColumn];
      if (sortColumn === "time") return sortDir * (new Date(va) - new Date(vb));
      if (sortColumn === "fare" || sortColumn === "passengers") return sortDir * (va - vb);
      return sortDir * String(va).localeCompare(String(vb));
    });
    var tbody = document.getElementById("tripsTableBody");
    tbody.innerHTML = sorted.map(function (t) {
      var timeStr = new Date(t.time).toLocaleString();
      return "<tr><td>" + timeStr + "</td><td>" + t.from + "</td><td>" + t.to + "</td><td>$" + t.fare + "</td><td>" + t.passengers + "</td></tr>";
    }).join("");
  }

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

  function showLoading(show) {
    var el = document.getElementById("loadingOverlay");
    if (show) el.classList.remove("hidden"); else el.classList.add("hidden");
  }

  // Fetch data: try API first, fall back to mock
  function fetchData(filters, callback) {
    showLoading(true);
    if (window.fetchTrips) {
      window.fetchTrips(1, 500, filters)
        .then(function (apiData) {
          var trips = Array.isArray(apiData) ? apiData : (apiData.trips || []);
          var filtered = filterTrips(trips, filters);
          var topRoutes = buildTopRoutesFromTrips(filtered);
          var timeSeries = buildTimeSeriesFromTrips(filtered);
          var heatmapData = buildHeatmapData(filtered);
          callback({ trips: filtered, topRoutes: topRoutes, timeSeries: timeSeries, heatmap: heatmapData });
          showLoading(false);
        })
        .catch(function () {
          useMockData(filters, function (data) {
            callback(data);
            showLoading(false);
          });
        });
    } else {
      useMockData(filters, function (data) {
        callback(data);
        showLoading(false);
      });
    }
  }

  function useMockData(filters, callback) {
    setTimeout(function () {
      var trips = generateMockTrips(400);
      var filtered = filterTrips(trips, filters);
      var topRoutes = buildTopRoutesFromTrips(filtered);
      var timeSeries = buildTimeSeriesFromTrips(filtered);
      var heatmapData = buildHeatmapData(filtered);
      callback({
        trips: filtered,
        topRoutes: topRoutes,
        timeSeries: timeSeries,
        heatmap: heatmapData
      });
    }, 400);
  }

  function applyFiltersAndRefresh() {
    var filters = getFilters();
    fetchData(filters, function (data) {
      lastChartData = data;
      updateSummaryCards(data.trips);
      updateCharts(data.trips, data.topRoutes, data.timeSeries);
      updateHeatmap(data.heatmap);
      updateZoneStats(data.trips, filters);
      updateTable(data.trips);
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

  function init() {
    applyTheme(getStoredTheme());

    document.getElementById("themeToggle").addEventListener("click", toggleTheme);

    // Populate zone dropdown
    var zoneSelect = document.getElementById("zoneSelect");
    zones.forEach(function (z) {
      var opt = document.createElement("option");
      opt.value = z;
      opt.textContent = z;
      zoneSelect.appendChild(opt);
    });

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

    // Initial load with no filters
    applyFiltersAndRefresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
