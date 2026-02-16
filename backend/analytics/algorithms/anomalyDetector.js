import { selectionSort } from './selectionSort.js';
import { computeMean, computeStdDev } from './compuStdDev.js';

function detectSpeedAnomalies(trips) {
    // Extract speed values
    const speeds = [];
    for (let i = 0; i < trips.length; i++) {
        speeds[speeds.length] = trips[i].trip_speed_mph;
    }

    // Compute mean and standard deviation from scratch
    const mean = computeMean(speeds);
    const stdDev = computeStdDev(speeds, mean);

    // Flag trips that deviate more than 2 standard deviations
    const anomalies = [];
    for (let i = 0; i < trips.length; i++) {
        const trip = trips[i];
        const speed = trip.trip_speed_mph;
        const zScore = (speed - mean) / stdDev;

        if (zScore > 2) {
            anomalies[anomalies.length] = {
                trip_id: trip.trip_id,
                pickup_zone_name: trip.pickup_zone_name,
                trip_distance: trip.trip_distance,
                trip_speed_mph: speed,
                trip_duration_minutes: trip.trip_duration_minutes,
                zScore: parseFloat(zScore.toFixed(2)),
                anomalyType: 'speed_too_fast',
                reason: `Speed ${speed.toFixed(1)} mph is ${zScore.toFixed(1)}σ above the mean of ${mean.toFixed(1)} mph`
            };
        } else if (zScore < -2) {
            anomalies[anomalies.length] = {
                trip_id: trip.trip_id,
                pickup_zone_name: trip.pickup_zone_name,
                trip_distance: trip.trip_distance,
                trip_speed_mph: speed,
                trip_duration_minutes: trip.trip_duration_minutes,
                zScore: parseFloat(zScore.toFixed(2)),
                anomalyType: 'speed_too_slow',
                reason: `Speed ${speed.toFixed(1)} mph is ${Math.abs(zScore).toFixed(1)}σ below the mean of ${mean.toFixed(1)} mph`
            };
        }
    }

    // Sort anomalies by |zScore| descending
    for (let i = 0; i < anomalies.length; i++) {
        anomalies[i]._sortKey = Math.abs(anomalies[i].zScore);
    }
    const sorted = selectionSort(anomalies, '_sortKey');
    // Clean up the temporary sort key
    for (let i = 0; i < sorted.length; i++) {
        delete sorted[i]._sortKey;
    }

    return {
        anomalies: sorted,
        thresholds: {
            mean: parseFloat(mean.toFixed(2)),
            stdDev: parseFloat(stdDev.toFixed(2)),
            lowerBound: parseFloat((mean - 2 * stdDev).toFixed(2)),
            upperBound: parseFloat((mean + 2 * stdDev).toFixed(2))
        }
    };
}


function detectFareAnomalies(trips) {
    // Group trips by pickup_zone_id
    const zoneGroups = {};
    for (let i = 0; i < trips.length; i++) {
        const trip = trips[i];
        const zoneId = trip.pickup_zone_id;

        if (!zoneGroups[zoneId]) {
            zoneGroups[zoneId] = [];
        }
        zoneGroups[zoneId][zoneGroups[zoneId].length] = trip;
    }

    const anomalies = [];
    const zoneThresholds = {};

    // Process each zone independently
    const zoneIds = Object.keys(zoneGroups);
    for (let z = 0; z < zoneIds.length; z++) {
        const zoneId = zoneIds[z];
        const zoneTrips = zoneGroups[zoneId];

        // Need at least 10 trips in a zone for meaningful statistics
        if (zoneTrips.length < 10) continue;

        // Extract fare values for this zone
        const fares = [];
        for (let i = 0; i < zoneTrips.length; i++) {
            fares[fares.length] = zoneTrips[i].fare_amount;
        }

        // Compute per-zone mean and std dev
        const mean = computeMean(fares);
        const stdDev = computeStdDev(fares, mean);

        // Store zone thresholds
        const zoneName = zoneTrips[0].pickup_zone_name;
        zoneThresholds[zoneName] = {
            tripCount: zoneTrips.length,
            mean: parseFloat(mean.toFixed(2)),
            stdDev: parseFloat(stdDev.toFixed(2)),
            lowerBound: parseFloat((mean - 2 * stdDev).toFixed(2)),
            upperBound: parseFloat((mean + 2 * stdDev).toFixed(2))
        };

        // Skip zones with near-zero std dev
        if (stdDev < 0.01) continue;

        // Flag anomalies
        for (let i = 0; i < zoneTrips.length; i++) {
            const trip = zoneTrips[i];
            const fare = trip.fare_amount;
            const zScore = (fare - mean) / stdDev;

            if (zScore > 2) {
                anomalies[anomalies.length] = {
                    trip_id: trip.trip_id,
                    pickup_zone_name: trip.pickup_zone_name,
                    fare_amount: fare,
                    trip_distance: trip.trip_distance,
                    zScore: parseFloat(zScore.toFixed(2)),
                    anomalyType: 'fare_too_high',
                    reason: `Fare $${fare.toFixed(2)} in "${trip.pickup_zone_name}" is ${zScore.toFixed(1)}σ above zone mean of $${mean.toFixed(2)}`
                };
            } else if (zScore < -2) {
                anomalies[anomalies.length] = {
                    trip_id: trip.trip_id,
                    pickup_zone_name: trip.pickup_zone_name,
                    fare_amount: fare,
                    trip_distance: trip.trip_distance,
                    zScore: parseFloat(zScore.toFixed(2)),
                    anomalyType: 'fare_too_low',
                    reason: `Fare $${fare.toFixed(2)} in "${trip.pickup_zone_name}" is ${Math.abs(zScore).toFixed(1)}σ below zone mean of $${mean.toFixed(2)}`
                };
            }
        }
    }

    // Sort anomalies by |zScore| descending
    for (let i = 0; i < anomalies.length; i++) {
        anomalies[i]._sortKey = Math.abs(anomalies[i].zScore);
    }
    const sorted = selectionSort(anomalies, '_sortKey');
    for (let i = 0; i < sorted.length; i++) {
        delete sorted[i]._sortKey;
    }

    return { anomalies: sorted, zoneThresholds };
}


export function detectAnomalies(trips) {
    const speedResult = detectSpeedAnomalies(trips);
    const fareResult = detectFareAnomalies(trips);

    // Count anomalies by type
    let speedTooFast = 0;
    let speedTooSlow = 0;
    for (let i = 0; i < speedResult.anomalies.length; i++) {
        if (speedResult.anomalies[i].anomalyType === 'speed_too_fast') speedTooFast++;
        else speedTooSlow++;
    }

    let fareTooHigh = 0;
    let fareTooLow = 0;
    for (let i = 0; i < fareResult.anomalies.length; i++) {
        if (fareResult.anomalies[i].anomalyType === 'fare_too_high') fareTooHigh++;
        else fareTooLow++;
    }

    return {
        summary: {
            totalTripsAnalyzed: trips.length,
            totalAnomalies: speedResult.anomalies.length + fareResult.anomalies.length,
            speedTooFast,
            speedTooSlow,
            fareTooHigh,
            fareTooLow
        },
        speedAnomalies: speedResult.anomalies,
        fareAnomalies: fareResult.anomalies,
        thresholds: {
            speed: speedResult.thresholds,
            fareByZone: fareResult.zoneThresholds
        }
    };
}
