import pool from '../db.js';

export const getTopRoutes = async () => {
    try {
        const query = `
            SELECT 
                z_pickup.zone_name AS pickup_zone_name,
                z_dropoff.zone_name AS dropoff_zone_name,
                COUNT(*)::INT AS trip_count
            FROM trips t
            JOIN zones z_pickup ON t.pickup_zone_id = z_pickup.zone_id
            JOIN zones z_dropoff ON t.dropoff_zone_id = z_dropoff.zone_id
            GROUP BY z_pickup.zone_name, z_dropoff.zone_name
            ORDER BY trip_count DESC
            LIMIT 20
        `;
        const { rows } = await pool.query(query);
        return rows;
    } catch (error) {
        console.error('Error fetching top routes', error.stack);
        throw error;
    }
};



