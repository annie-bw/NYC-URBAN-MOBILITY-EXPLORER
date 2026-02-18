const pool = require("../config/db");
const { buildTripsQuery } = require("../utils/queryBuilder");

const getTrips = async (filters = {}, limit, offset) => {
  const { query, values, index } = buildTripsQuery(filters);

  const finalQuery = `
    ${query}
    ORDER BY trip_id
    LIMIT $${index} OFFSET $${index + 1}
  `;

  const result = await pool.query(finalQuery, [...values, limit, offset]);
  return result.rows;
};

const getTripsCount = async (filters = {}) => {
  const { query, values } = buildTripsQuery(filters);

  const countQuery = `
    SELECT COUNT(*)
    FROM (${query}) AS filtered_trips
  `;

  const result = await pool.query(countQuery, values);
  return parseInt(result.rows[0].count);
};

const getZones = async () => {
  const result = await pool.query(`
    SELECT *
    FROM zones
    ORDER BY zone_id
  `);

  return result.rows[0];
};

const getZoneById = async (zone_id) => {
  const result = await pool.query(`
    SELECT *
    FROM zones
    WHERE zone_id = $1
  `, [zone_id]);

  return result.rows[0];
};

module.exports = {
  getTrips,
  getTripsCount,
  getZones,
  getZoneById
};
