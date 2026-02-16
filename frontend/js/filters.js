/**
 * Filter panel: reads form values and exposes getFilterValues().
 * Clear All resets the form.
 */

(function () {
  "use strict";

  var BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

  function getFilterValues() {
    var boroughs = [];
    BOROUGHS.forEach(function (name) {
      var id = "borough-" + name.replace(/\s/g, "");
      var el = document.getElementById(id);
      if (el && el.checked) boroughs.push(name);
    });
    var timeBtn = document.querySelector(".time-btn.active");
    var selectedTime = timeBtn ? timeBtn.getAttribute("data-time") : null;
    var zoneSelect = document.getElementById("zoneSelect");
    var selectedZones = [];
    if (zoneSelect) {
      for (var i = 0; i < zoneSelect.options.length; i++) {
        if (zoneSelect.options[i].selected) selectedZones.push(zoneSelect.options[i].value);
      }
    }
    return {
      startDate: document.getElementById("startDate") ? document.getElementById("startDate").value || null : null,
      endDate: document.getElementById("endDate") ? document.getElementById("endDate").value || null : null,
      boroughs: boroughs,
      selectedZones: selectedZones,
      fareMin: parseInt(document.getElementById("fareRange") ? document.getElementById("fareRange").value : 0, 10) || 0,
      selectedTime: selectedTime
    };
  }

  function clearAllFilters() {
    var startDate = document.getElementById("startDate");
    var endDate = document.getElementById("endDate");
    if (startDate) startDate.value = "";
    if (endDate) endDate.value = "";
    BOROUGHS.forEach(function (name) {
      var id = "borough-" + name.replace(/\s/g, "");
      var el = document.getElementById(id);
      if (el) el.checked = false;
    });
    var zoneSelect = document.getElementById("zoneSelect");
    if (zoneSelect) {
      for (var i = 0; i < zoneSelect.options.length; i++) {
        zoneSelect.options[i].selected = false;
      }
    }
    var fareRange = document.getElementById("fareRange");
    var fareValue = document.getElementById("fareValue");
    if (fareRange) fareRange.value = 0;
    if (fareValue) fareValue.textContent = "0";
    document.querySelectorAll(".time-btn").forEach(function (btn) {
      btn.classList.remove("active");
    });
  }

  window.getFilterValues = getFilterValues;
  window.clearAllFilters = clearAllFilters;
})();
