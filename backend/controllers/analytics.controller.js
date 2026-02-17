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
    const data = await analyticsService.getHeatMap();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
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

const getAnomalies = async (req, res, next) => {
  try {
    const data = await analyticsService.getAnomalies();
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
  getAnomalies,
};
