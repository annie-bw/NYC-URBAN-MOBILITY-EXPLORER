const { pool } = require("../config/db");
const { buildTripsQuery } = require("../utils/queryBuilder");

// filters is the first argument — previously the controller was passing (limit, offset)
// here which meant filters was receiving the limit number and the query ran with no filters at all
const getTrips = async (filters = {}, limit, offset) => {
  const { query, values, index } = buildTripsQuery(filters);

  const finalQuery = `
    ${query}
    ORDER BY t.trip_id
    LIMIT $${index} OFFSET $${index + 1}
  `;

  const result = await pool.query(finalQuery, [...values, limit, offset]);
  return result.rows;
};

// Uses the same filters as getTrips so pagination totals are always accurate
const getTripsCount = async (filters = {}) => {
  const { query, values } = buildTripsQuery(filters);
  const countQuery = `SELECT COUNT(*) FROM (${query}) AS filtered_trips`;
  const result = await pool.query(countQuery, values);
  return parseInt(result.rows[0].count);
};

const getZones = async () => {
  const result = await pool.query(`SELECT * FROM zones ORDER BY zone_id`);
  return result.rows;
};

const getZoneById = async (zone_id) => {
  const result = await pool.query(`SELECT * FROM zones WHERE zone_id = $1`, [zone_id]);
  return result.rows[0];
};

module.exports = { getTrips, getTripsCount, getZones, getZoneById };
