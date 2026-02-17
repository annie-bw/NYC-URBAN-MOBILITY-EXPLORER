const express = require("express");
const analyticsService = require("../services/analytics.service");

const getTopRoutes = async (req, res, next) => {
  try {
    const data = await analyticsService.getTopRoutes();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getHeatMap = async (req, res, next) => {
  try {
    const dbData = await analyticsService.getHeatMap();
    const zonesMap = {};

    // transform sql query results to formated zone-hour data
    dbData.forEach((row) => {
      const { borough, hour, trip_count, passenger_count } = row;

      if (!zonesMap[borough]) {
        zonesMap[borough] = {
          name: borough,
          hours: {},
        };

        // Initialize all 24 hours
        for (let h = 0; h < 24; h++) {
          zonesMap[borough].hours[h] = {
            trips: 0,
            passengers: 0,
            activityScore: 0,
          };
        }
      }

      const activityScore = Number(trip_count) + Number(passenger_count);

      zonesMap[borough].hours[hour] = {
        trips: Number(trip_count),
        passengers: Number(passenger_count),
        activityScore: activityScore,
      };
    });

    const result = Object.values(zonesMap);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch heatmap data" });
  }
};

const getTimeSeries = async (req, res, next) => {
  try {
    const data = await analyticsService.getTimeSeries();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getCustomFilters = async (req, res, next) => {
  try {
    const filters = req.body;
    const data = await analyticsService.getCustomFilters(filters);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getZoneStats = async (req, res, next) => {
  try {
    const { zone_id } = req.query;
    const data = await analyticsService.getZoneStats(zone_id);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getCityOverview = async (req, res, next) => {
  try {
    const data = await analyticsService.getCityOverview();
    res.status(200).json({
      success: true,
      data,
    });
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
};
