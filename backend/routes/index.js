const express = require("express");
const router = express.Router();

const {
  getTopRoutes,
  getHeatMap,
  getZoneStats,
  getTimeSeries,
  getCustomFilters
} = require("../controllers/analytics.controller");

const { getAllTrips, getAllZones } =
  require("../controllers/data.controller");
const { validateZoneId } = require("../middleware/validateRequest");
router.get("/trips", getAllTrips);
router.get("/zones", getAllZones);

router.get("/analytics/top-routes", getTopRoutes);
router.get("/analytics/heat-map", getHeatMap);
router.get("/analytics/zone-stats",validateZoneId, getZoneStats);
router.get("/analytics/time-series", getTimeSeries);
router.post("/analytics/custom-filter", getCustomFilters);

module.exports = router;
