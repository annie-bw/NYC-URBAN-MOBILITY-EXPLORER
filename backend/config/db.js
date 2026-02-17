const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createIndexes = async () => {
  try {
    const queries = [
      "CREATE INDEX IF NOT EXISTS idx_trips_route ON trips (pickup_zone_id, dropoff_zone_id)",
      "CREATE INDEX IF NOT EXISTS idx_trips_pickup_datetime ON trips (pickup_datetime)",
      "CREATE INDEX IF NOT EXISTS idx_trips_fare_amount ON trips (fare_amount)",
      "CREATE INDEX IF NOT EXISTS idx_trips_trip_distance ON trips (trip_distance)",
      "CREATE INDEX IF NOT EXISTS idx_trips_dropoff_zone_id ON trips (dropoff_zone_id)",
      "CREATE INDEX IF NOT EXISTS idx_trips_passenger_count ON trips (passenger_count)",
    ];
    for (const query of queries) {
      await pool.query(query);
    }
    console.log("Indexes created successfully");
  } catch (error) {
    console.error("Error creating indexes", error.stack);
    throw error;
  }
};

module.exports = { pool, createIndexes };
