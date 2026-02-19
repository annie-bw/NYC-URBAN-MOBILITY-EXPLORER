require("dotenv").config();
const { pool } = require("../config/db");


const getAnomaliesData = async () => {
  try {
    const query = `
      SELECT
        t.trip_id,
        t.pickup_zone_id,
        z.zone_name AS pickup_zone_name,
        t.trip_distance,
        t.fare_amount,
        df.trip_speed_mph,
        df.trip_duration_minutes
      FROM trips t
      JOIN derived_features df ON t.trip_id = df.trip_id
      JOIN zones z ON t.pickup_zone_id = z.zone_id
      WHERE df.trip_speed_mph > 0
        AND t.trip_distance > 0
        AND t.fare_amount > 0
      LIMIT 10000
    `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error("Error fetching anomaly data", error.stack);
    throw error;
  }
};


module.exports = {
  getAnomaliesData,
};
