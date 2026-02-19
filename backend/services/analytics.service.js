const { pool } = require("../config/db");
const { buildTripsQuery } = require("../utils/queryBuilder");

const getTopRoutes = async (filters = {}) => {
  const { query, values } = buildTripsQuery(filters);

  const result = await pool.query(
    `
    SELECT
      t.pickup_zone_id,
      t.dropoff_zone_id,
      COUNT(*) AS trip_count
    FROM (${query}) AS t
    GROUP BY t.pickup_zone_id, t.dropoff_zone_id
    ORDER BY trip_count DESC
    LIMIT 10
  `,
    values,
  );

  return result.rows;
};

const getHeatMap = async (filters = {}) => {
  const { query, values } = buildTripsQuery(filters);

  const result = await pool.query(
    `
    SELECT
      t.pickup_borough   AS borough,
      EXTRACT(HOUR FROM t.pickup_datetime)::INT AS hour,
      COUNT(*)::INT      AS trip_count,
      SUM(t.passenger_count)::INT AS passenger_count
    FROM (${query}) AS t
    GROUP BY t.pickup_borough, hour
    ORDER BY t.pickup_borough, hour
  `,
    values,
  );

  return result.rows;
};

const getTimeSeries = async (filters = {}) => {
  const { query, values } = buildTripsQuery(filters);

  const result = await pool.query(
    `
    SELECT
      DATE(t.pickup_datetime) AS day,
      COUNT(*) AS trip_count
    FROM (${query}) AS t
    GROUP BY day
    ORDER BY day
  `,
    values,
  );

  return result.rows;
};

const getCityOverview = async () => {
  const result = await pool.query(`
    SELECT
      COUNT(*)::INT        AS total_trips,
      AVG(fare_amount)     AS average_fare,
      AVG(trip_distance)   AS average_distance,
      AVG(passenger_count) AS average_passenger_count
    FROM trips
  `);
  return result.rows;
};

// Used for summary cards and zone stats
const getFilteredStats = async (filters = {}) => {
  const { query, values } = buildTripsQuery(filters);

  const result = await pool.query(
    `
    SELECT
      COUNT(*)::INT        AS total_trips,
      AVG(t.fare_amount)   AS avg_fare,
      AVG(t.trip_distance) AS avg_distance
    FROM (${query}) AS t
  `,
    values,
  );

  return result.rows[0];
};

const getZoneStats = async (zone_id) => {
  const result = await pool.query(
    `
    SELECT
      COUNT(*) AS total_trips,
      AVG(fare_amount) AS avg_fare,
      AVG(trip_distance) AS avg_distance
    FROM trips
    WHERE pickup_zone_id = $1
  `,
    [zone_id],
  );
  return result.rows;
};

const getCustomFilters = async (filters) => {
  const { query, values, index } = buildTripsQuery(filters);
  const result = await pool.query(
    query + ` ORDER BY trip_id LIMIT 1000`,
    values,
  );
  return result.rows;
};

module.exports = {
  getTopRoutes,
  getHeatMap,
  getTimeSeries,
  getZoneStats,
  getCustomFilters,
  getCityOverview,
  getFilteredStats,
};
