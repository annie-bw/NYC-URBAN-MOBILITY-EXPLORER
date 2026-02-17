/**
 * API service: fetch trips and zones from backend.
 * Handles errors with user-friendly messages.
 */

(function () {
  "use strict";

  var API_BASE = "";

  /**
   * Show a user-friendly error message on the page.
   */
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

  /**
   * Hide the error message (call after successful fetch).
   */
  function hideError() {
    var el = document.getElementById("apiErrorMessage");
    if (el) el.classList.add("hidden");
  }

  /**
   * Build query string from filters and pagination.
   */
  function buildQueryString(page, limit, filters) {
    var params = [];
    if (page != null) params.push("page=" + encodeURIComponent(page));
    if (limit != null) params.push("limit=" + encodeURIComponent(limit));
    if (filters) {
      if (filters.startDate) params.push("startDate=" + encodeURIComponent(filters.startDate));
      if (filters.endDate) params.push("endDate=" + encodeURIComponent(filters.endDate));
      if (filters.boroughs && filters.boroughs.length) {
        filters.boroughs.forEach(function (b) {
          params.push("borough=" + encodeURIComponent(b));
        });
      }
      if (filters.fareMin != null) params.push("fareMin=" + encodeURIComponent(filters.fareMin));
      if (filters.selectedTime) params.push("timeOfDay=" + encodeURIComponent(filters.selectedTime));
    }
    return params.length ? "?" + params.join("&") : "";
  }

  /**
   * Fetch trips from GET /api/trips.
   * Returns a promise that resolves to the JSON response or rejects on error.
   */
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

  /**
   * Fetch zones from GET /api/zones.
   * Returns a promise that resolves to the JSON response or rejects on error.
   */
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

  window.fetchTrips = fetchTrips;
  window.fetchZones = fetchZones;
  window.handleError = handleError;
  window.hideError = hideError;
})();
