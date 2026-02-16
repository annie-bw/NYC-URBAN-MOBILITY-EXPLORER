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

export const getHeatmapData = async () => {
    try {
        const query = `
            SELECT 
                z.borough,
                EXTRACT(HOUR FROM t.pickup_datetime)::INT AS hour,
                COUNT(*)::INT AS trip_count,
                SUM(t.passenger_count)::INT AS passenger_count
            FROM trips t
            JOIN zones z ON t.pickup_zone_id = z.zone_id
            GROUP BY z.borough, hour
            ORDER BY z.borough, hour;
        `;
        const { rows } = await pool.query(query);
        return rows;
    } catch (error) {
        console.error('Error fetching heatmap data', error.stack);
        throw error;
    }
};

export const getCityOverview = async () => {
    try {
        const query = `
            SELECT 
                COUNT(*)::INT AS total_trips,
                ROUND(AVG(fare_amount)::NUMERIC, 2)::FLOAT AS average_fare,
                ROUND(AVG(trip_distance)::NUMERIC, 2)::FLOAT AS average_distance,
                ROUND(AVG(passenger_count)::NUMERIC, 2)::FLOAT AS average_passenger_count
            FROM trips;
        `;
        const { rows } = await pool.query(query);
        return rows[0];
    } catch (error) {
        console.error('Error fetching city overview', error.stack);
        throw error;
    }
};
