import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export const createIndexes = async () => {
    try {
        const query = 'CREATE INDEX IF NOT EXISTS idx_trips_route ON trips (pickup_zone_id, dropoff_zone_id)';
        await pool.query(query);
        console.log('Indexes created successfully');
    } catch (error) {
        console.error('Error creating indexes', error.stack);
        throw error;
    }
};

export default pool;
