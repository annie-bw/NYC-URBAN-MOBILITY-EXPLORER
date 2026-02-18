const dataService = require("../services/data.service");
const getPagination = require("../utils/pagination");

const getAllTrips = async (req, res, next) => {
  try {
    const { page, limit, ...filters } = req.query;

    const { limit: l, offset } = getPagination(page, limit);

    const trips = await dataService.getTrips(filters, l, offset);
    const total = await dataService.getTripsCount(filters);

    res.status(200).json({
      success: true,
      page: Number(page) || 1,
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
    const { zone_id } = req.query;

    if (zone_id) {
      const zone = await dataService.getZoneById(zone_id);

      if (!zone) {
        return res.status(404).json({
          success: false,
          message: "Zone not found"
        });
      }

      return res.status(200).json({
        success: true,
        data: zone 
      });
    }

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
