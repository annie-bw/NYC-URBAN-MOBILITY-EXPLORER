const validateZoneId = (req, res, next) => {
  const { zone_id } = req.query;

  if (!zone_id) {
    return res.status(400).json({
      success: false,
      message: "zone_id is required"
    });
  }

  next(); 
};

module.exports = { validateZoneId };
