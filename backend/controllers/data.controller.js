const dataService = require("../services/data.service");
const getPagination = require("../utils/pagination");


const getAllTrips = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    const { limit: l, offset } = getPagination(page, limit);

    const trips = await dataService.getTrips(l, offset);
    const total = await dataService.getTripsCount();

    res.status(200).json({
      success: true,
      page: page || 1,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
      data: trips
    });

  } catch (error) {
    next(error);
  }
};


const getAllZones = async (req, res, next) => {
  try {
    const zones = await dataService.getZones();

    res.status(200).json({
      success: true,
      data: zones
    });

  } catch (error) {
    next(error);
  }
};


module.exports = { getAllTrips, getAllZones };
