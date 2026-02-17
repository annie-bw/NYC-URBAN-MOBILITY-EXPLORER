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

  function randomInRange(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function generateMockTrips(count) {
    var mockZones = zoneNamesForHeatmap.concat(["JFK", "LaGuardia", "Newark"]);
    var trips = [];
    var baseDate = new Date("2024-01-01");
    for (var i = 0; i < count; i++) {
      var fromZone = mockZones[randomInRange(0, mockZones.length - 1)];
      var toZone = mockZones[randomInRange(0, mockZones.length - 1)];
      if (fromZone === toZone) toZone = mockZones[(mockZones.indexOf(fromZone) + 1) % mockZones.length];
      var hour = randomInRange(0, 23);
      var d = new Date(baseDate);
      d.setDate(d.getDate() + randomInRange(0, 30));
      d.setHours(hour, randomInRange(0, 59), 0, 0);
      var duration = randomInRange(5, 45);
      trips.push({
        time: d.toISOString(),
        from: fromZone,
        to: toZone,
        fare: randomInRange(5, 85),
        passengers: randomInRange(1, 4),
        hour: hour,
        distance: randomInRange(2, 15),
        duration: duration,
        trip_duration_minutes: duration
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
    zoneNamesForHeatmap.forEach(function (z) {
      zoneHours[z] = [];
      for (var h = 0; h < 24; h++) zoneHours[z].push(0);
    });
    tripsData.forEach(function (t) {
      if (zoneHours[t.from]) zoneHours[t.from][t.hour]++;
    });
    return zoneHours;
  }

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

  // Convert backend heat map (borough + hours) to our grid format
  function heatMapFromApi(apiRows) {
    var zoneHours = {};
    zoneNamesForHeatmap.forEach(function (z) {
      zoneHours[z] = [];
      for (var h = 0; h < 24; h++) zoneHours[z].push(0);
    });
    if (!apiRows || !Array.isArray(apiRows)) return zoneHours;
    apiRows.forEach(function (row) {
      var name = row.name;
      if (!zoneHours[name]) zoneHours[name] = Array(24).fill(0);
      for (var h = 0; h < 24; h++) {
        var cell = row.hours && row.hours[h];
        zoneHours[name][h] = cell ? (cell.trips || 0) : 0;
      }
    });
    return zoneHours;
  }

  // Use getFilterValues from filters.js
  function getFilters() {
    return window.getFilterValues ? window.getFilterValues() : { startDate: null, endDate: null, boroughs: [], selectedZones: [], fareMin: 0, selectedTime: null };
  }

  // Filter trips: date range, boroughs, zone ids, fare, time of day
  function filterTrips(tripsData, filters) {
    var result = tripsData.slice();
    var timeStr = function (t) { return (t.time || "").toString().slice(0, 10); };
    if (filters.startDate) {
      result = result.filter(function (t) { return timeStr(t) >= filters.startDate; });
    }
    if (filters.endDate) {
      result = result.filter(function (t) { return timeStr(t) <= filters.endDate; });
    }
    if (filters.boroughs && filters.boroughs.length > 0) {
      result = result.filter(function (t) {
        if (t.pickup_zone_id != null && zoneIdToBorough[t.pickup_zone_id]) {
          if (filters.boroughs.indexOf(zoneIdToBorough[t.pickup_zone_id]) !== -1) return true;
        }
        if (t.dropoff_zone_id != null && zoneIdToBorough[t.dropoff_zone_id]) {
          if (filters.boroughs.indexOf(zoneIdToBorough[t.dropoff_zone_id]) !== -1) return true;
        }
        return filters.boroughs.indexOf(t.from) !== -1 || filters.boroughs.indexOf(t.to) !== -1;
      });
    }
    if (filters.selectedZones && filters.selectedZones.length > 0) {
      var zoneIds = filters.selectedZones.map(function (v) { return parseInt(v, 10); });
      var validIds = zoneIds.filter(function (n) { return !isNaN(n); });
      result = result.filter(function (t) {
        if (validIds.length && (t.pickup_zone_id != null || t.dropoff_zone_id != null)) {
          return validIds.indexOf(t.pickup_zone_id) !== -1 || validIds.indexOf(t.dropoff_zone_id) !== -1;
        }
        return filters.selectedZones.indexOf(t.from) !== -1 || filters.selectedZones.indexOf(t.to) !== -1;
      });
    }
    result = result.filter(function (t) { return (t.fare || 0) >= (filters.fareMin || 0); });
    if (filters.selectedTime) {
      var ranges = { early: [0, 5], morning: [5, 10], midday: [10, 16], evening: [16, 21], night: [21, 24] };
      var r = ranges[filters.selectedTime];
      if (r) result = result.filter(function (t) { return t.hour >= r[0] && t.hour < r[1]; });
    }
    return result;
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
    var gridEl = document.getElementById("heatmapGrid");
    if (!gridEl) return;

    // Find min and max trip counts across all cells
    var minVal = Infinity;
    var maxVal = -Infinity;
    zoneNamesForHeatmap.forEach(function (z) {
      zoneHours[z].forEach(function (v) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      });
    });
    if (minVal === Infinity) minVal = 0;
    if (maxVal === -Infinity) maxVal = 0;
    var range = maxVal - minVal;
    if (range === 0) range = 1;

    // Normalize: (value - min) / range maps each value to 0-1. 0 = lowest, 1 = highest.
    function normalize(val) {
      return (val - minVal) / range;
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
        var norm = normalize(val);
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

  // Zone stats: fetch from API when a zone is selected; else use filtered trips or zeros
  function updateZoneStatsFromFilters(filters) {
    var firstZoneId = (filters.selectedZones && filters.selectedZones[0]) ? filters.selectedZones[0] : null;
    if (firstZoneId && window.fetchZoneStats) {
      window.fetchZoneStats(firstZoneId)
        .then(function (res) {
          var rows = (res && res.data) || [];
          var row = rows[0];
          var total = row ? (row.total_trips || 0) : 0;
          var avgFare = row && row.avg_fare != null ? "$" + Number(row.avg_fare).toFixed(2) : "$0";
          var avgDist = row && row.avg_distance != null ? Number(row.avg_distance).toFixed(1) + " mi" : "0 mi";
          setZoneStatsEls(avgFare, avgDist, total);
        })
        .catch(function () {
          setZoneStatsEls("$0", "0 mi", 0);
        });
    } else {
      var trips = lastChartData ? lastChartData.trips : [];
      var zoneTrips = trips;
      var selected = (filters.boroughs && filters.boroughs.length > 0) ? filters.boroughs : [];
      if (selected.length > 0) {
        zoneTrips = trips.filter(function (t) {
          var pb = zoneIdToBorough[t.pickup_zone_id];
          var db = zoneIdToBorough[t.dropoff_zone_id];
          return selected.indexOf(pb) !== -1 || selected.indexOf(db) !== -1;
        });
      }
      var total = zoneTrips.length;
      var avgFare = total ? "$" + (zoneTrips.reduce(function (s, t) { return s + (t.fare || 0); }, 0) / total).toFixed(2) : "$0";
      var avgDist = total ? (zoneTrips.reduce(function (s, t) { return s + (t.distance || 0); }, 0) / total).toFixed(1) + " mi" : "0 mi";
      setZoneStatsEls(avgFare, avgDist, total);
    }
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

  function getDateRangeFromTrips(trips) {
    if (!trips || trips.length === 0) return null;
    function dateStr(t) {
      var raw = t.time || t.pickup_datetime || "";
      return String(raw).slice(0, 10);
    }
    var first = dateStr(trips[0]);
    if (!first) return null;
    var minD = first;
    var maxD = first;
    for (var i = 1; i < trips.length; i++) {
      var d = dateStr(trips[i]);
      if (!d) continue;
      if (d < minD) minD = d;
      if (d > maxD) maxD = d;
    }
    return { minDate: minD, maxDate: maxD };
  }

  function showLoading(show) {
    var el = document.getElementById("loadingOverlay");
    if (show) el.classList.remove("hidden"); else el.classList.add("hidden");
  }

  // Load zones once and build lookups; populate zone dropdown
  function loadZonesAndLookups(cb) {
    if (!window.fetchZones) {
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
      var hasApi = window.fetchTrips && window.fetchTopRoutes && window.fetchHeatMap && window.fetchTimeSeries && window.fetchCityOverview;
      if (!hasApi) {
        useMockData(filters, function (d) {
          callback(d);
          showLoading(false);
        });
        return;
      }
      Promise.all([
        window.fetchTrips(1, 500, filters).catch(function () { return null; }),
        window.fetchTopRoutes().catch(function () { return null; }),
        window.fetchHeatMap().catch(function () { return null; }),
        window.fetchTimeSeries().catch(function () { return null; }),
        window.fetchCityOverview().catch(function () { return null; })
      ]).then(function (results) {
        var tripsRes = results[0];
        var topRoutesRes = results[1];
        var heatMapRes = results[2];
        var timeSeriesRes = results[3];
        var cityOverviewRes = results[4];
        var usedBackend = tripsRes && topRoutesRes && heatMapRes && timeSeriesRes;
        if (!usedBackend) {
          useMockData(filters, function (d) {
            callback(d);
            showLoading(false);
          });
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
          cityOverview: summary
        });
        showLoading(false);
      }).catch(function () {
        useMockData(filters, function (d) {
          callback(d);
          showLoading(false);
        });
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

  function useMockData(filters, callback) {
    setTimeout(function () {
      var trips = generateMockTrips(400);
      var filtered = filterTrips(trips, filters);
      var topRoutes = buildTopRoutesFromTrips(filtered);
      var timeSeries = buildTimeSeriesFromTrips(filtered);
      var heatmapData = buildHeatmapData(filtered);
      var dateRange = getDateRangeFromTrips(trips);
      if (dateRange) setDateRange(dateRange.minDate, dateRange.maxDate);
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
      // Summary cards: prefer city overview (full DB); else compute from filtered trips
      if (data.cityOverview) {
        updateSummaryCards({
          totalTrips: data.cityOverview.totalTrips,
          avgFare: data.cityOverview.avgFare,
          avgDistance: data.cityOverview.avgDistance
        });
      } else {
        updateSummaryCards(data.trips);
      }
      updateCharts(data.trips, data.topRoutes, data.timeSeries);
      updateHeatmap(data.heatmap);
      updateZoneStatsFromFilters(filters);
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
        window.fetchAnomalies(true)
          .then(function (data) {
            renderAnomalyChart(data);
          })
          .catch(function () {
            renderAnomalyChart(getMockAnomalyData());
          });
      } else {
        renderAnomalyChart(getMockAnomalyData());
      }
    }

    function getMockAnomalyData() {
      return {
        summary: {
          totalTripsAnalyzed: 400,
          totalAnomalies: 12,
          speedTooFast: 3,
          speedTooSlow: 2,
          fareTooHigh: 4,
          fareTooLow: 3
        }
      };
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
