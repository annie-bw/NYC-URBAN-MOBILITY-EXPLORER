const express = require("express");
const router = express.Router();

const {
  getTopRoutes,
  getHeatMap,
  getZoneStats,
  getTimeSeries,
  getCustomFilters,
  getCityOverview,
} = require("../controllers/analytics.controller");

const { getAnomalies } = require("../controllers/anomalies.controller");

const { getAllTrips, getAllZones } = require("../controllers/data.controller");
const { validateZoneId } = require("../middleware/validateRequest");
router.get("/trips", getAllTrips);
router.get("/zones", getAllZones);

router.get("/analytics/top-routes", getTopRoutes);
router.get("/analytics/heat-map", getHeatMap);
router.get("/analytics/zone-stats", validateZoneId, getZoneStats);
router.get("/analytics/time-series", getTimeSeries);
router.post("/analytics/custom-filter", getCustomFilters);
router.get("/analytics/anomalies", getAnomalies);
router.get("/analytics/city-overview", getCityOverview);

module.exports = router;
