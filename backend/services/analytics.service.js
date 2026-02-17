const { pool } = require("../config/db");

const getTopRoutes = async () => {
  const query = `
    SELECT 
      pickup_zone_id,
      dropoff_zone_id,
      COUNT(*) AS trip_count
    FROM trips
    GROUP BY pickup_zone_id, dropoff_zone_id
    ORDER BY trip_count DESC
    LIMIT 10
  `;

  const result = await pool.query(query);
  return result.rows;
};

const getHeatMap = async () => {
  const query = `
            SELECT 
                z.borough,
                EXTRACT(HOUR FROM t.pickup_datetime)::INT AS hour,
                COUNT(*)::INT AS trip_count,
                SUM(t.passenger_count)::INT AS passenger_count
            FROM trips t
            JOIN zones z ON t.pickup_zone_id = z.zone_id
            GROUP BY z.borough, hour
            ORDER BY z.borough, hour;
        `;

  const result = await pool.query(query);
  return result.rows;
};

const getTimeSeries = async () => {
  const query = `
    SELECT 
      DATE(pickup_datetime) AS day,
      COUNT(*) AS trip_count
    FROM trips
    GROUP BY day
    ORDER BY day
  `;

  const result = await pool.query(query);
  return result.rows;
};

const getZoneStats = async (zone_id) => {
  const query = `
    SELECT 
      COUNT(*) AS total_trips,
      AVG(fare_amount) AS avg_fare,
      AVG(trip_distance) AS avg_distance
    FROM trips
    WHERE pickup_zone_id = $1
  `;

  const result = await pool.query(query, [zone_id]);
  return result.rows;
};

const getCustomFilters = async (filters) => {
  let query = "SELECT * FROM trips WHERE 1=1";
  let params = [];
  let index = 1;

  if (filters.fare_min) {
    query += ` AND fare_amount >= $${index++}`;
    params.push(filters.fare_min);
  }

  if (filters.fare_max) {
    query += ` AND fare_amount <= $${index++}`;
    params.push(filters.fare_max);
  }

  if (filters.pickup_zone_id) {
    query += ` AND pickup_zone_id = $${index++}`;
    params.push(filters.pickup_zone_id);
  }

  const result = await pool.query(query, params);
  return result.rows;
};

const getCityOverview = async () => {
  const query = `
            SELECT 
                COUNT(*)::INT AS total_trips,
                AVG(fare_amount)::FLOAT AS average_fare,
                AVG(trip_distance)::FLOAT AS average_distance,
                AVG(passenger_count)::FLOAT AS average_passenger_count
            FROM trips;
        `;

  const result = await pool.query(query);
  return result.rows;
};

module.exports = {
  getTopRoutes,
  getHeatMap,
  getTimeSeries,
  getZoneStats,
  getCustomFilters,
  getCityOverview,
};
