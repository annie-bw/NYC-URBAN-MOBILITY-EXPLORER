import express from 'express';
import { getTopRoutes } from './queries.js';

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

export default router;