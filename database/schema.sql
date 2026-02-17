-- Drop existing tables (safe to rerun)
DROP TABLE IF EXISTS derived_features;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS zones;

-- Create tables
CREATE TABLE zones (
    zone_id INTEGER PRIMARY KEY,
    borough TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    service_zone TEXT DEFAULT 'Unknown'
);

CREATE TABLE trips (
    trip_id SERIAL PRIMARY KEY,
    pickup_datetime TIMESTAMP,
    dropoff_datetime TIMESTAMP,
    pickup_zone_id INTEGER REFERENCES zones(zone_id),
    dropoff_zone_id INTEGER REFERENCES zones(zone_id),
    passenger_count INTEGER DEFAULT 1,
    trip_distance REAL,
    fare_amount REAL,
    tip_amount REAL DEFAULT 0,
    tolls_amount REAL DEFAULT 0,
    extra REAL DEFAULT 0,
    mta_tax REAL DEFAULT 0,
    improvement_surcharge REAL DEFAULT 0,
    congestion_surcharge REAL DEFAULT 0,
    airport_fee REAL DEFAULT 0,
    total_amount REAL,
    vendor_id INTEGER,
    ratecode_id INTEGER,
    store_and_fwd_flag TEXT,
    payment_type INTEGER
);

CREATE TABLE derived_features (
    feature_id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES trips(trip_id),
    tip_percentage REAL DEFAULT 0,
    trip_duration_minutes REAL DEFAULT 0,
    time_of_day TEXT DEFAULT 'Unknown',
    trip_speed_mph REAL DEFAULT 0,
    day_type TEXT DEFAULT 'Unknown'
);
