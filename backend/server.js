import express from 'express';
import dotenv from 'dotenv';
import { createIndexes } from './db.js';
import analyticsRoute from './analytics/analyticsRoute.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize db indexes
createIndexes();

app.use('/api/analytics', analyticsRoute);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
