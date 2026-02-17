/**
 * Test DB connection only. Run: node test-db-connection.js
 * Use this to try different DATABASE_URL values until it works.
 */
require("dotenv").config();
const { Pool } = require("pg");

const conn = process.env.DATABASE_URL;
if (!conn) {
  console.error("No DATABASE_URL in .env");
  process.exit(1);
}

// Hide password in log
const safeUrl = conn.replace(/:([^:@]+)@/, ":****@");
console.log("Trying:", safeUrl);

const pool = new Pool({ connectionString: conn });

pool.query("SELECT 1 as ok")
  .then(() => {
    console.log("OK – Connection works. Use this DATABASE_URL in .env and run npm start.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("FAIL –", err.message);
    console.error("\nFix credentials:");
    console.error("1. CockroachDB Cloud → your cluster → Connect → copy the connection string");
    console.error("2. Or: SQL Users → bwiza → Reset password, then set DATABASE_URL in .env");
    process.exit(1);
  })
  .finally(() => pool.end());
