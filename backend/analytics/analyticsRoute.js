import express from 'express';
import { getTopRoutes, getHeatmapData, getCityOverview } from './queries.js';

const router = express.Router();

router.get('/top-routes', async (req, res) => {
    try {
        const topRoutes = await getTopRoutes();
        res.json(topRoutes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch top routes' });
    }
});

router.get('/heatmap', async (req, res) => {
    try {
        const dbData = await getHeatmapData();
        
        const zonesMap = {};

        // transform sql query results to formated zone-hour data
        dbData.forEach(row => {
            const { borough, hour, trip_count, passenger_count } = row;
            
            if (!zonesMap[borough]) {
                zonesMap[borough] = {
                    name: borough,
                    hours: {}
                };

                // Initialize all 24 hours
                for (let h = 0; h < 24; h++) {
                    zonesMap[borough].hours[h] = { trips: 0, passengers: 0, activityScore: 0 };
                }
            }

            const activityScore = trip_count + passenger_count;

            zonesMap[borough].hours[hour] = {
                trips: trip_count,
                passengers: passenger_count,
                activityScore: activityScore
            };
        });

        const result = Object.values(zonesMap);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch heatmap data' });
    }
});

router.get("/results", async (req, res) => {
    try {
        const overview = await getCityOverview();
        res.json(overview);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

export default router;