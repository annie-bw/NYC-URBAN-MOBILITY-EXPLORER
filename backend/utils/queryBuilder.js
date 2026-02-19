const buildTripsQuery = (filters = {}) => {
  // Join zones so we can filter by borough name
  let query = `
    SELECT
      t.*,
      pz.borough AS pickup_borough,
      pz.zone_name AS pickup_zone_name,
      dz.borough AS dropoff_borough,
      dz.zone_name AS dropoff_zone_name
    FROM trips t
    LEFT JOIN zones pz ON t.pickup_zone_id = pz.zone_id
    LEFT JOIN zones dz ON t.dropoff_zone_id = dz.zone_id
    WHERE 1=1
  `;
  let values = [];
  let index = 1;

  // Specific zone filters (used by custom-filter endpoint)
  if (filters.pickup_zone) {
    query += ` AND t.pickup_zone_id = $${index++}`;
    values.push(filters.pickup_zone);
  }

  if (filters.dropoff_zone) {
    query += ` AND t.dropoff_zone_id = $${index++}`;
    values.push(filters.dropoff_zone);
  }

  // Fare filters
  if (filters.fare_min) {
    query += ` AND t.fare_amount >= $${index++}`;
    values.push(filters.fare_min);
  }

  if (filters.fare_max) {
    query += ` AND t.fare_amount <= $${index++}`;
    values.push(filters.fare_max);
  }

  // Borough filter — frontend sends ?borough=Manhattan&borough=Brooklyn
  if (filters.boroughs && filters.boroughs.length > 0) {
    const pickupPlaceholders = filters.boroughs
      .map(() => `$${index++}`)
      .join(", ");
    filters.boroughs.forEach((b) => values.push(b));

    const dropoffPlaceholders = filters.boroughs
      .map(() => `$${index++}`)
      .join(", ");
    filters.boroughs.forEach((b) => values.push(b));

    query += ` AND (pz.borough IN (${pickupPlaceholders}) OR dz.borough IN (${dropoffPlaceholders}))`;
  }

  // Zone ID filter
  if (filters.zoneIds && filters.zoneIds.length > 0) {
    const pickupPlaceholders = filters.zoneIds
      .map(() => `$${index++}`)
      .join(", ");
    filters.zoneIds.forEach((id) => values.push(id));

    const dropoffPlaceholders = filters.zoneIds
      .map(() => `$${index++}`)
      .join(", ");
    filters.zoneIds.forEach((id) => values.push(id));

    query += ` AND (t.pickup_zone_id IN (${pickupPlaceholders}) OR t.dropoff_zone_id IN (${dropoffPlaceholders}))`;
  }

  // Date range filters
  if (filters.startDate) {
    query += ` AND t.pickup_datetime >= $${index++}`;
    values.push(filters.startDate);
  }

  if (filters.endDate) {
    // Add 1 day so the end date is inclusive
    query += ` AND t.pickup_datetime < ($${index++}::date + interval '1 day')`;
    values.push(filters.endDate);
  }

  // Time of day — maps label to pickup hour range
  if (filters.timeOfDay) {
    const timeRanges = {
      early: [0, 5],
      morning: [5, 10],
      midday: [10, 16],
      evening: [16, 21],
      night: [21, 24],
    };
    const range = timeRanges[filters.timeOfDay];
    if (range) {
      query += ` AND EXTRACT(HOUR FROM t.pickup_datetime) >= $${index++}`;
      query += ` AND EXTRACT(HOUR FROM t.pickup_datetime) < $${index++}`;
      values.push(range[0], range[1]);
    }
  }

  return { query, values, index };
};

module.exports = { buildTripsQuery };
