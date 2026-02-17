// Summary cards: Total Trips, Avg Fare, Avg Distance.

(function () {
  "use strict";

  // Update the three summary cards with the given data.
  // data: {totalTrips, avgFare, avgDistance}

  function updateCards(data) {
    var totalEl = document.getElementById("totalTrips");
    var fareEl = document.getElementById("avgFare");
    var distEl = document.getElementById("avgDistance");
    if (totalEl) totalEl.textContent = data.totalTrips != null ? data.totalTrips : 0;
    if (fareEl) fareEl.textContent = data.avgFare != null ? (typeof data.avgFare === "string" ? data.avgFare : "$" + data.avgFare) : "$0";
    if (distEl) distEl.textContent = data.avgDistance != null ? (typeof data.avgDistance === "string" ? data.avgDistance : data.avgDistance + " mi") : "0 mi";
  }

  window.updateCards = updateCards;
})();
