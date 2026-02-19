const dataService = require("../services/data.service");
const getPagination = require("../utils/pagination");

const getAllTrips = async (req, res, next) => {
  try {
    const { page, limit, startDate, endDate, fareMin, timeOfDay } = req.query;

    let boroughs = req.query.borough;
    if (!boroughs) boroughs = [];
    else if (!Array.isArray(boroughs)) boroughs = [boroughs];

    let zoneIds = req.query.zone_id;
    if (!zoneIds) zoneIds = [];
    else if (!Array.isArray(zoneIds)) zoneIds = [zoneIds];
    zoneIds = zoneIds.map(Number).filter(Boolean);

    const filters = {
      boroughs,
      zoneIds,
      startDate: startDate || null,
      endDate: endDate || null,
      fare_min: fareMin ? parseFloat(fareMin) : null,
      timeOfDay: timeOfDay || null,
    };

    const { limit: l, offset } = getPagination(page, limit);

    // Both getTrips and getTripsCount use the same filters
    const trips = await dataService.getTrips(filters, l, offset);
    const total = await dataService.getTripsCount(filters);

    res.status(200).json({
      success: true,
      page: parseInt(page) || 1,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
      data: trips,
    });
  } catch (error) {
    next(error);
  }
};

const getAllZones = async (req, res, next) => {
  try {
    const zones = await dataService.getZones();
    res.status(200).json({ success: true, data: zones });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllTrips, getAllZones };
