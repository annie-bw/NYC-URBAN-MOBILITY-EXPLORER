const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createIndexes = async () => {
  try {
    const query =
      "CREATE INDEX IF NOT EXISTS idx_trips_route ON trips (pickup_zone_id, dropoff_zone_id)";
    await pool.query(query);
    console.log("Indexes created successfully");
  } catch (error) {
    console.error("Error creating indexes", error.stack);
    throw error;
  }
};

pool
  .connect()
  .then(() => {
    console.log(" Connected to PostgreSQL");

    // initialize db indexes
    createIndexes();
  })
  .catch((err) => console.error("DB connection error:", err));

module.exports = pool;
