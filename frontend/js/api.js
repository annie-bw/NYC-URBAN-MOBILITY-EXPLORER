(function () {
  "use strict";

  var API_BASE = "http://localhost:5000";

  // handle api connection issues
  function handleError(error) {
    var msg = "Something went wrong. Please try again.";
    if (error && error.message) {
      if (
        error.message.indexOf("Failed to fetch") !== -1 ||
        error.message.indexOf("NetworkError") !== -1
      ) {
        msg =
          "Network error. Check your connection and that the server is running.";
      } else if (error.status === 404) {
        msg = "The requested resource was not found.";
      } else if (error.status >= 500) {
        msg = "Server error. Please try again later.";
      }
    }
    var el = document.getElementById("apiErrorMessage");
    if (el) {
      el.textContent = msg;
      el.classList.remove("hidden");
    } else {
      alert(msg);
    }
  }

  function hideError() {
    var el = document.getElementById("apiErrorMessage");
    if (el) el.classList.add("hidden");
  }

  // Build query string from filters and pagination.
  function buildQueryString(page, limit, filters) {
    var params = [];
    if (page != null) params.push("page=" + encodeURIComponent(page));
    if (limit != null) params.push("limit=" + encodeURIComponent(limit));
    if (filters) {
      if (filters.startDate)
        params.push("startDate=" + encodeURIComponent(filters.startDate));
      if (filters.endDate)
        params.push("endDate=" + encodeURIComponent(filters.endDate));
      if (filters.boroughs && filters.boroughs.length) {
        filters.boroughs.forEach(function (b) {
          params.push("borough=" + encodeURIComponent(b));
        });
      }
      if (filters.fareMin != null)
        params.push("fareMin=" + encodeURIComponent(filters.fareMin));
      if (filters.selectedTime)
        params.push("timeOfDay=" + encodeURIComponent(filters.selectedTime));
    }
    return params.length ? "?" + params.join("&") : "";
  }

  // Fetch trips from GET /api/trips.
  function fetchTrips(page, limit, filters) {
    var url =
      API_BASE +
      "/api/trips" +
      buildQueryString(page || 1, limit || 50, filters);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) {
          var err = new Error("Request failed: " + res.status);
          err.status = res.status;
          throw err;
        }
        hideError();
        return res.json();
      })
      .catch(function (err) {
        handleError(err);
        throw err;
      });
  }

  function fetchDateRange() {
    var url = API_BASE + "/api/analytics/date-range";
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        hideError();
        return res.json();
      })
      .catch(function () {
        return null;
      });
  }

  //  Fetch zones from GET /api/zones.
  function fetchZones() {
    var url = API_BASE + "/api/zones";
    return fetch(url)
      .then(function (res) {
        if (!res.ok) {
          var err = new Error("Request failed: " + res.status);
          err.status = res.status;
          throw err;
        }
        hideError();
        return res.json();
      })
      .catch(function (err) {
        handleError(err);
        throw err;
      });
  }

  // Fetch anomaly report from GET /api/analytics/anomalies.
  function fetchAnomalies(silent) {
    var url = API_BASE + "/api/analytics/anomalies";
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        hideError();
        return res.json();
      })
      .catch(function (err) {
        if (!silent) handleError(err);
        throw err;
      });
  }

  //  Fetch top routes from GET /api/analytics/top-routes.
  function fetchTopRoutes() {
    return fetch(API_BASE + "/api/analytics/top-routes")
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        hideError();
        return res.json();
      })
      .catch(function (err) {
        handleError(err);
        throw err;
      });
  }

  // Fetch heat map (borough by hour) from GET /api/analytics/heat-map.
  function fetchHeatMap() {
    return fetch(API_BASE + "/api/analytics/heat-map")
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        hideError();
        return res.json();
      })
      .catch(function (err) {
        handleError(err);
        throw err;
      });
  }

  //  Fetch daily trip counts from GET /api/analytics/time-series.S
  function fetchTimeSeries() {
    return fetch(API_BASE + "/api/analytics/time-series")
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        hideError();
        return res.json();
      })
      .catch(function (err) {
        handleError(err);
        throw err;
      });
  }

  // Fetch city-wide stats from GET /api/analytics/city-overview.
  function fetchCityOverview() {
    return fetch(API_BASE + "/api/analytics/city-overview")
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        hideError();
        return res.json();
      })
      .catch(function (err) {
        handleError(err);
        throw err;
      });
  }

  // Fetch stats for one zone from GET /api/analytics/zone-stats?zone_id=X.
  function fetchZoneStats(zoneId) {
    var url =
      API_BASE +
      "/api/analytics/zone-stats?zone_id=" +
      encodeURIComponent(zoneId);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        hideError();
        return res.json();
      })
      .catch(function (err) {
        handleError(err);
        throw err;
      });
  }

  window.fetchTrips = fetchTrips;
  window.fetchZones = fetchZones;
  window.fetchDateRange = fetchDateRange;
  window.fetchAnomalies = fetchAnomalies;
  window.fetchTopRoutes = fetchTopRoutes;
  window.fetchHeatMap = fetchHeatMap;
  window.fetchTimeSeries = fetchTimeSeries;
  window.fetchCityOverview = fetchCityOverview;
  window.fetchZoneStats = fetchZoneStats;
  window.handleError = handleError;
  window.hideError = hideError;
})();
