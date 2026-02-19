const { getAnomaliesData } = require("../services/anomalies.service");
const { detectAnomalies } = require("../algorithms/anomalyDetector");


const getAnomalies = async (req, res, next) => {
  try {
    const rawTrips = await getAnomaliesData();
    const anomalyReport = detectAnomalies(rawTrips);
    res.json(anomalyReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to detect anomalies" });
  }
};


module.exports = {
  getAnomalies,
};
