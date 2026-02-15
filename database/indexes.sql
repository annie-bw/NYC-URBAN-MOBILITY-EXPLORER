CREATE INDEX idx_trips_pickup ON trips(pickup_datetime);
CREATE INDEX idx_trips_dropoff ON trips(dropoff_datetime);
CREATE INDEX idx_trips_pickup_zone ON trips(pickup_zone_id);
CREATE INDEX idx_trips_dropoff_zone ON trips(dropoff_zone_id);
CREATE INDEX idx_trips_payment_type ON trips(payment_type);
