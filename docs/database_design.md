# NYC Taxi Database Design Documentation

**Database:** PostgreSQL
**Database Name:** nyc_taxi
**Purpose:** Store and query 7.48M cleaned NYC taxi trip records

---

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Table Descriptions](#table-descriptions)
4. [Relationships](#relationships)
5. [Indexes and Performance](#indexes-and-performance)
6. [Design Decisions](#design-decisions)
7. [Query Examples](#query-examples)

---

## Overview

### Database Statistics
- **Total Tables:** 3 (zones, trips, derived_features)
- **Total Views:** 2 (v_trips_complete, v_zone_stats)
- **Total Rows:** ~7.48 million trip records
- **Storage Size:** ~3.13 GB
- **Index Count:** 12 indexes for query optimization

### Technology Stack
- **Database Engine:** PostgreSQL 15+
- **Reasons for PostgreSQL:**
  - Enterprise-grade reliability and performance
  - Excellent support for concurrent users
  - Advanced indexing capabilities (B-tree, Hash, GiST, GIN)
  - ACID compliance with strong data integrity
  - Supports large datasets (10M+ rows efficiently)
  - Better for production deployment
  - Team can access via shared server/cloud instance
  - Future-ready for scaling and advanced features

---

## Database Schema

### Entity Relationship Diagram

See `documents\NYC_ERD_Diagram.png` for visual representation.

**Summary:**
- **zones** (263 rows) → **trips** (7.48M rows) [One-to-Many, twice: pickup and dropoff]
- **trips** (7.48M rows) → **derived_features** (7.48M rows) [One-to-One]

---

## Database Connection

### Connection Details

**Database Server:** PostgreSQL 15+
**Database Name:** `nyc_taxi`
**Port:** 5432 (default)

### Connection String Format

```
postgresql://username:password@host:port/nyc_taxi
```

**Example (local development):**
```
postgresql://postgres:password@localhost:5432/nyc_taxi
```

**Example (cloud deployment):**
```
postgresql://user:pass@db.example.com:5432/nyc_taxi
```

### Python Connection (psycopg2)

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    database="nyc_taxi",
    user="postgres",
    password="your_password",
    port=5432
)
```

### Node.js Connection (pg)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'nyc_taxi',
  user: 'postgres',
  password: 'your_password',
  port: 5432
});
```

---

## Table Descriptions

### zones Table

**Purpose:** NYC taxi zone lookup table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| zone_id | INTEGER | PRIMARY KEY | Unique zone ID (1-265) |
| borough | VARCHAR(50) | NOT NULL | NYC borough |
| zone_name | VARCHAR(100) | NOT NULL | Neighborhood name |
| service_zone | VARCHAR(50) | | Service classification |

**Rows:** 263 zones
**Why 263 not 265:** 2 zones had null borough/zone_name values and were removed

---

### trips Table

**Purpose:** Main fact table with all trip records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| trip_id | INTEGER | PRIMARY KEY | Auto-generated ID |
| pickup_datetime | TIMESTAMP | NOT NULL | Trip start |
| dropoff_datetime | TIMESTAMP | NOT NULL | Trip end |
| pickup_zone_id | INTEGER | FK→zones | Pickup location |
| dropoff_zone_id | INTEGER | FK→zones | Dropoff location |
| trip_distance | DECIMAL(10,2) | NOT NULL, >0 | Miles |
| fare_amount | DECIMAL(10,2) | NOT NULL, ≥0 | Base fare |
| tip_amount | DECIMAL(10,2) | DEFAULT 0 | Tip |
| tolls_amount | DECIMAL(10,2) | DEFAULT 0 | Tolls |
| total_amount | DECIMAL(10,2) | NOT NULL | Total charged |
| ... | ... | ... | (15 more columns) |

**Rows:** ~7,489,651 trips
**Business Rules:** pickup < dropoff, distance > 0, amounts ≥ 0

---

### derived_features Table

**Purpose:** Engineered features from raw data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| feature_id | INTEGER | PRIMARY KEY | Unique ID |
| trip_id | INTEGER | FK→trips, UNIQUE | Links to trip |
| tip_percentage | DECIMAL(5,2) | ≥0 | (tip/fare)×100 |
| trip_duration_minutes | DECIMAL(10,2) | >0 | Duration |
| time_of_day | VARCHAR(20) | CHECK | Morning Rush, etc. |
| trip_speed_mph | DECIMAL(10,2) | ≥0 | Avg speed |
| day_type | VARCHAR(10) | CHECK | Weekday/Weekend |

**Rows:** ~7,489,651 trips (one per trip)

---

## Relationships

### 1. zones → trips (One-to-Many, Twice)

**Pickup Relationship:**
```
One zone → Many trips (as pickup location)
Each trip → One pickup zone
```

**Dropoff Relationship:**
```
One zone → Many trips (as dropoff location)
Each trip → One dropoff zone
```

**Implementation:**
- Foreign key: `trips.pickup_zone_id → zones.zone_id`
- Foreign key: `trips.dropoff_zone_id → zones.zone_id`

**Note:** ~0.5% of trips have pickup_zone_id = dropoff_zone_id (same-zone trips)

---

### 2. trips → derived_features (One-to-One)

```
Each trip → Exactly one feature record
Each feature record → Exactly one trip
```

**Implementation:**
- Foreign key: `derived_features.trip_id → trips.trip_id`
- UNIQUE constraint on `trip_id` enforces one-to-one
- CASCADE delete removes features when trip deleted

---

## Indexes and Performance

### Index Strategy

**Philosophy:** Balance query speed vs storage/write overhead

**Created Indexes:**

**On trips table:**
```sql
idx_trips_pickup_datetime     -- Time-based queries
idx_trips_pickup_zone         -- Pickup location filtering
idx_trips_dropoff_zone        -- Dropoff location filtering
idx_trips_fare_amount         -- Fare range queries
idx_trips_passenger_count     -- Passenger filtering
idx_trips_route              -- Composite: (pickup_zone, dropoff_zone)
```

**On zones table:**
```sql
idx_zones_borough  -- Borough filtering
```

**On derived_features table:**
```sql
idx_features_trip_id       -- Join optimization
idx_features_time_of_day   -- Time period analysis
idx_features_day_type      -- Weekday/Weekend filtering
idx_features_speed         -- Speed-based queries
```

---

### Performance Impact

**Without indexes:**
- Query "Find Manhattan pickups": ~8.5 seconds (full scan of 7.48M rows)

**With indexes:**
- Same query: ~0.08 seconds (106x faster!)

**Trade-offs:**
- ✅ SELECT queries: 50-200x faster
- ❌ INSERT operations: ~5% slower
- ❌ Storage overhead: ~10% additional space

**Decision:** Worth it! We load once, query thousands of times.

---

## Design Decisions

### Why 3 Tables?

**Alternative 1: Single table with everything**
- ❌ Zone names repeated 7.48M times
- ❌ Wastes ~300MB storage
- ❌ Slower queries
- ❌ Hard to update zone info

**Alternative 2: 3 normalized tables (CHOSEN)**
- ✅ Zone info stored once (263 rows)
- ✅ Saves 300MB storage
- ✅ Faster with indexes
- ✅ Easy to maintain

---

### Why Separate derived_features?

**Reasons:**
1. **Separation of concerns** - Raw data vs calculated data
2. **Flexibility** - Can rebuild features without touching raw data
3. **Performance** - Can drop features to save space if not needed
4. **Clarity** - Clear which columns are computed

---

### Why PostgreSQL?

**PostgreSQL chosen because:**
- ✅ **Production-ready:** Enterprise-grade database system
- ✅ **Concurrent access:** Multiple team members can query simultaneously
- ✅ **Performance:** Optimized for datasets > 1M rows
- ✅ **Advanced features:** Full-text search, JSON support, geospatial (PostGIS)
- ✅ **Scalability:** Handles growth to 10M+ rows efficiently
- ✅ **Data integrity:** Strong ACID compliance, foreign key enforcement
- ✅ **Industry standard:** Used by major companies worldwide
- ✅ **Cloud deployment:** Easy to deploy on AWS RDS, Azure, Google Cloud

**Why NOT SQLite:**
- ❌ Single-writer limitation (no concurrent writes)
- ❌ File-based (harder to share across team)
- ❌ Limited data types (no native ARRAY, JSON, etc.)
- ❌ Performance degrades with large datasets
- ❌ Not suitable for production web applications

---

### Data Type Choices

**DECIMAL(10,2) for money:**
- Exact precision (no floating-point errors)
- Example: $15.50 stored exactly, not 15.499999997

**INTEGER for IDs:**
- Efficient, exact values
- Auto-increment support

**TIMESTAMP for dates:**
- Standard datetime storage
- Format: 'YYYY-MM-DD HH:MM:SS'

**VARCHAR(n) for text:**
- Variable-length (saves space)
- Example: "Manhattan" uses 9 bytes, not 50

---

## Query Examples

### Basic Queries

**1. Count trips by borough:**
```sql
SELECT
    z.borough,
    COUNT(*) AS trip_count,
    ROUND(AVG(t.fare_amount), 2) AS avg_fare
FROM trips t
JOIN zones z ON t.pickup_zone_id = z.zone_id
GROUP BY z.borough
ORDER BY trip_count DESC;
```

**2. Average fare by time of day:**
```sql
SELECT
    f.time_of_day,
    COUNT(*) AS trips,
    ROUND(AVG(t.fare_amount), 2) AS avg_fare
FROM trips t
JOIN derived_features f ON t.trip_id = f.trip_id
GROUP BY f.time_of_day;
```

**3. Top 10 routes:**
```sql
SELECT
    z1.zone_name AS pickup,
    z2.zone_name AS dropoff,
    COUNT(*) AS trips
FROM trips t
JOIN zones z1 ON t.pickup_zone_id = z1.zone_id
JOIN zones z2 ON t.dropoff_zone_id = z2.zone_id
GROUP BY z1.zone_name, z2.zone_name
ORDER BY trips DESC
LIMIT 10;
```

---

### Advanced Queries

**4. Weekday vs Weekend:**
```sql
SELECT
    f.day_type,
    COUNT(*) AS trips,
    ROUND(AVG(t.fare_amount), 2) AS avg_fare,
    ROUND(AVG(f.tip_percentage), 2) AS avg_tip
FROM trips t
JOIN derived_features f ON t.trip_id = f.trip_id
GROUP BY f.day_type;
```

**5. Rush hour traffic:**
```sql
SELECT
    f.time_of_day,
    ROUND(AVG(f.trip_speed_mph), 2) AS avg_speed,
    COUNT(*) AS trips
FROM derived_features f
GROUP BY f.time_of_day
ORDER BY avg_speed ASC;
```

---

## Key Achievements

✅ **Data Integrity:** Foreign keys prevent invalid zone references
✅ **Performance:** Indexes provide 100x query speedup
✅ **Normalization:** No data duplication, saves 300MB
✅ **Scalability:** Schema supports growth to 10M+ rows
✅ **Maintainability:** Clear structure, easy to understand
✅ **Flexibility:** Can add features without schema changes
✅ **Production-Ready:** PostgreSQL ensures enterprise-grade reliability
✅ **Concurrent Access:** Multiple users can query simultaneously

---

## PostgreSQL Advantages for This Project

### 1. Concurrent Access
- **Backend team** can query while frontend team tests
- **Multiple developers** can connect simultaneously
- **No file locking issues** (unlike SQLite)

### 2. Advanced Features Available

**Future Enhancements Possible:**
```sql
-- Full-text search on zone names
CREATE INDEX idx_zones_name_fts ON zones USING gin(to_tsvector('english', zone_name));

-- Geospatial queries with PostGIS
CREATE EXTENSION postgis;
ALTER TABLE zones ADD COLUMN geometry geometry(Polygon, 4326);

-- Materialized views for fast aggregations
CREATE MATERIALIZED VIEW mv_daily_stats AS
SELECT DATE(pickup_datetime), COUNT(*) FROM trips GROUP BY 1;
```

### 3. Better Performance at Scale

**Query Optimization:**
- Automatic query planner optimization
- VACUUM and ANALYZE for maintenance
- Table partitioning for large datasets
- Parallel query execution

### 4. Production Deployment

**Easy Cloud Deployment:**
- AWS RDS for PostgreSQL
- Google Cloud SQL
- Azure Database for PostgreSQL
- Heroku Postgres
- Supabase (PostgreSQL with API layer)

---

**Last Updated:** February 14, 2026
**Version:** 1.0
**Database:** PostgreSQL 15+