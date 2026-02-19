const express = require("express");
const analyticsService = require("../services/analytics.service");

// Reads the standard filter params from req.query and returns a filters object.
// Same shape as data.controller.js so both use identical filter parsing.
function parseFilters(query) {
  let boroughs = query.borough;
  if (!boroughs) boroughs = [];
  else if (!Array.isArray(boroughs)) boroughs = [boroughs];

  // zone_id comes as repeated param: ?zone_id=1&zone_id=42
  let zoneIds = query.zone_id;
  if (!zoneIds) zoneIds = [];
  else if (!Array.isArray(zoneIds)) zoneIds = [zoneIds];
  zoneIds = zoneIds.map(Number).filter(Boolean);

  return {
    boroughs,
    zoneIds,
    startDate: query.startDate || null,
    endDate:   query.endDate   || null,
    fare_min:  query.fareMin   ? parseFloat(query.fareMin) : null,
    timeOfDay: query.timeOfDay || null,
  };
}

const getTopRoutes = async (req, res, next) => {
  try {
    const data = await analyticsService.getTopRoutes(parseFilters(req.query));
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getHeatMap = async (req, res, next) => {
  try {
    const dbData = await analyticsService.getHeatMap(parseFilters(req.query));
    const zonesMap = {};

    dbData.forEach((row) => {
      const { borough, hour, trip_count, passenger_count } = row;
      if (!zonesMap[borough]) {
        zonesMap[borough] = { name: borough, hours: {} };
        for (let h = 0; h < 24; h++) {
          zonesMap[borough].hours[h] = { trips: 0, passengers: 0, activityScore: 0 };
        }
      }
      zonesMap[borough].hours[hour] = {
        trips: Number(trip_count),
        passengers: Number(passenger_count),
        activityScore: Number(trip_count) + Number(passenger_count),
      };
    });

    res.json(Object.values(zonesMap));
  } catch (error) {
    next(error);
  }
};

const getTimeSeries = async (req, res, next) => {
  try {
    const data = await analyticsService.getTimeSeries(parseFilters(req.query));
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getZoneStats = async (req, res, next) => {
  try {
    const { zone_id } = req.query;
    const data = await analyticsService.getZoneStats(zone_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getCustomFilters = async (req, res, next) => {
  try {
    const data = await analyticsService.getCustomFilters(req.body || {});
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getCityOverview = async (req, res, next) => {
  try {
    const data = await analyticsService.getCityOverview();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getFilteredStats = async (req, res, next) => {
  try {
    const stats = await analyticsService.getFilteredStats(parseFilters(req.query));
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTopRoutes,
  getZoneStats,
  getCustomFilters,
  getHeatMap,
  getTimeSeries,
  getCityOverview,
  getFilteredStats,
};
