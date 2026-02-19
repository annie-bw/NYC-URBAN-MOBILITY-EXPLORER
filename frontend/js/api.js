(function () {
  "use strict";

  var API_BASE = "http://localhost:5000";

  function handleError(error) {
    var msg = "Something went wrong. Please try again.";
    if (error && error.message) {
      if (error.message.indexOf("Failed to fetch") !== -1 || error.message.indexOf("NetworkError") !== -1) {
        msg = "Network error. Check your connection and that the server is running.";
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

  function buildQueryString(page, limit, filters) {
    var params = [];
    if (page != null)  params.push("page="  + encodeURIComponent(page));
    if (limit != null) params.push("limit=" + encodeURIComponent(limit));
    if (filters) {
      if (filters.startDate) params.push("startDate=" + encodeURIComponent(filters.startDate));
      if (filters.endDate)   params.push("endDate="   + encodeURIComponent(filters.endDate));
      if (filters.boroughs && filters.boroughs.length) {
        filters.boroughs.forEach(function (b) {
          params.push("borough=" + encodeURIComponent(b));
        });
      }
      if (filters.fareMin != null && filters.fareMin > 0) params.push("fareMin=" + encodeURIComponent(filters.fareMin));
      if (filters.selectedTime) params.push("timeOfDay=" + encodeURIComponent(filters.selectedTime));
      // zone_id sent as repeated param so backend receives an array
      if (filters.selectedZones && filters.selectedZones.length) {
        filters.selectedZones.forEach(function (id) {
          params.push("zone_id=" + encodeURIComponent(id));
        });
      }
    }
    return params.length ? "?" + params.join("&") : "";
  }

  // page and limit are explicit — callers control pagination directly
  function fetchTrips(page, limit, filters) {
    var url = API_BASE + "/api/trips" + buildQueryString(page || 1, limit || 50, filters);
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
    return fetch(API_BASE + "/api/analytics/date-range")
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        return res.json();
      })
      .catch(function () { return null; });
  }

  function fetchZones() {
    return fetch(API_BASE + "/api/zones")
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
  // Always returns city-wide anomalies — no filters applied.
  // Use silent=true to avoid showing error when backend is down.
  function fetchAnomalies(silent) {
    return fetch(API_BASE + "/api/analytics/anomalies")
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

  function fetchTopRoutes(filters) {
    return fetch(API_BASE + "/api/analytics/top-routes" + buildQueryString(null, null, filters))
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        hideError();
        return res.json();
      })
      .catch(function (err) { handleError(err); throw err; });
  }

  function fetchHeatMap(filters) {
    return fetch(API_BASE + "/api/analytics/heat-map" + buildQueryString(null, null, filters))
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        hideError();
        return res.json();
      })
      .catch(function (err) { handleError(err); throw err; });
  }

  function fetchTimeSeries(filters) {
    return fetch(API_BASE + "/api/analytics/time-series" + buildQueryString(null, null, filters))
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        hideError();
        return res.json();
      })
      .catch(function (err) { handleError(err); throw err; });
  }

  function fetchCityOverview() {
    return fetch(API_BASE + "/api/analytics/city-overview")
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        hideError();
        return res.json();
      })
      .catch(function (err) { handleError(err); throw err; });
  }

  function fetchZoneStats(zoneId) {
    return fetch(API_BASE + "/api/analytics/zone-stats?zone_id=" + encodeURIComponent(zoneId))
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        hideError();
        return res.json();
      })
      .catch(function (err) { handleError(err); throw err; });
  }

  // Fetch COUNT + AVG fare + AVG distance for the full filtered dataset.
  // Accepts the same filter params as fetchTrips but no page/limit.
  // Used to show accurate totals in cards and zone stats regardless of current page.
  function fetchFilteredStats(filters) {
    var url = API_BASE + "/api/analytics/filtered-stats" + buildQueryString(null, null, filters);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        return res.json();
      })
      .catch(function () { return null; });
  }

  window.fetchFilteredStats = fetchFilteredStats;
  window.fetchTrips       = fetchTrips;
  window.fetchZones       = fetchZones;
  window.fetchDateRange   = fetchDateRange;
  window.fetchAnomalies   = fetchAnomalies;
  window.fetchTopRoutes   = fetchTopRoutes;
  window.fetchHeatMap     = fetchHeatMap;
  window.fetchTimeSeries  = fetchTimeSeries;
  window.fetchCityOverview = fetchCityOverview;
  window.fetchZoneStats   = fetchZoneStats;
  window.handleError      = handleError;
  window.hideError        = hideError;
})();
