const buildTripsQuery = (filters = {}) => {
  let query = `SELECT * FROM trips WHERE 1=1`;
  let values = [];
  let index = 1;

  if (filters.pickup_zone) {
    query += ` AND pickup_zone_id = $${index++}`;
    values.push(filters.pickup_zone);
  }

  if (filters.dropoff_zone) {
    query += ` AND dropoff_zone_id = $${index++}`;
    values.push(filters.dropoff_zone);
  }

  if (filters.fare_min) {
    query += ` AND fare_amount >= $${index++}`;
    values.push(filters.fare_min);
  }

  if (filters.fare_max) {
    query += ` AND fare_amount <= $${index++}`;
    values.push(filters.fare_max);
  }

  return { query, values, index };
};

module.exports = { buildTripsQuery };
