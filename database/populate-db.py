"""
NYC Taxi Database Population - OPTIMIZED FOR SPEED
==================================================
This version is MUCH faster - uses larger batches and optimized settings.

Expected time: 20-30 minutes total (not hours!)
"""

import psycopg2
from psycopg2.extras import execute_values
import csv
import os
from dotenv import load_dotenv
from datetime import datetime

print("=== NYC TAXI DATABASE POPULATION (OPTIMIZED) ===")

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_FILE = os.path.join(BASE_DIR, "schema.sql")
INDEXES_FILE = os.path.join(BASE_DIR, "indexes.sql")
ZONES_FILE = os.path.join(BASE_DIR, "taxi_zone_lookup.csv")
TRIPS_FILE = os.path.join(BASE_DIR, "cleaned_trips_copy.csv")

# ============================================================================
# FEATURE CALCULATION FUNCTIONS
# ============================================================================

def calculate_tip_percentage(tip_amount: float, fare_amount: float) -> float:
    if fare_amount <= 0:
        return 0.0
    return round((tip_amount / fare_amount) * 100, 2)

def calculate_trip_duration(pickup: datetime, dropoff: datetime) -> float:
    duration = (dropoff - pickup).total_seconds() / 60
    return round(max(0, duration), 2)

def get_time_of_day(pickup: datetime) -> str:
    hour = pickup.hour
    if 6 <= hour < 12:
        return "Morning"
    elif 12 <= hour < 17:
        return "Afternoon"
    elif 17 <= hour < 21:
        return "Evening"
    else:
        return "Night"

def calculate_speed(distance: float, duration_minutes: float) -> float:
    if duration_minutes <= 0:
        return 0.0
    duration_hours = duration_minutes / 60
    speed = distance / duration_hours
    return round(min(speed, 200), 2)

def get_day_type(pickup: datetime) -> str:
    return "Weekend" if pickup.weekday() >= 5 else "Weekday"

# ============================================================================
# MAIN SCRIPT
# ============================================================================

try:
    # Connect with optimized settings
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_session(autocommit=False)  # Manual transaction control
    cursor = conn.cursor()
    print("✓ Connected to CockroachDB")

    # -------------------------
    # Step 1: Run schema.sql
    # -------------------------
    print("\n📋 Step 1: Running schema.sql...")

    if not os.path.exists(SCHEMA_FILE):
        print(f"❌ schema.sql not found at: {SCHEMA_FILE}")
        exit(1)

    with open(SCHEMA_FILE, 'r') as f:
        schema_sql = f.read()
        cursor.execute(schema_sql)
        conn.commit()

    print("✓ Tables created")

    # -------------------------
    # Step 2: Load zones
    # -------------------------
    print("\n📥 Step 2: Loading zones...")

    with open(ZONES_FILE, "r") as f:
        cursor.copy_expert("""
            COPY zones(zone_id, borough, zone_name, service_zone)
            FROM STDIN WITH CSV HEADER DELIMITER ',' QUOTE '"'
        """, f)
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM zones;")
    zone_count = cursor.fetchone()[0]
    print(f"✓ Loaded {zone_count} zones")

    # -------------------------
    # Step 3: Load trips FAST with execute_values
    # -------------------------
    print(f"\n📥 Step 3: Loading trips (OPTIMIZED)...")
    print("⏳ Using large batches for speed...")

    # MUCH LARGER BATCH SIZE for speed
    batch_size = 50000  # 5x larger!
    batch_data = []
    total_inserted = 0

    with open(TRIPS_FILE, 'r') as f:
        reader = csv.DictReader(f)

        for row in reader:
            try:
                batch_data.append((
                    row['pickup_datetime'] or None,
                    row['dropoff_datetime'] or None,
                    int(row['pickup_zone_id']) if row.get('pickup_zone_id') and row['pickup_zone_id'].strip() else None,
                    int(row['dropoff_zone_id']) if row.get('dropoff_zone_id') and row['dropoff_zone_id'].strip() else None,
                    int(row['passenger_count']) if row.get('passenger_count') and row['passenger_count'].strip() else 1,
                    float(row['trip_distance']) if row.get('trip_distance') and row['trip_distance'].strip() else 0,
                    float(row['fare_amount']) if row.get('fare_amount') and row['fare_amount'].strip() else 0,
                    float(row['tip_amount']) if row.get('tip_amount') and row['tip_amount'].strip() else 0,
                    float(row['tolls_amount']) if row.get('tolls_amount') and row['tolls_amount'].strip() else 0,
                    float(row['extra']) if row.get('extra') and row['extra'].strip() else 0,
                    float(row['mta_tax']) if row.get('mta_tax') and row['mta_tax'].strip() else 0,
                    float(row['improvement_surcharge']) if row.get('improvement_surcharge') and row['improvement_surcharge'].strip() else 0,
                    float(row['congestion_surcharge']) if row.get('congestion_surcharge') and row['congestion_surcharge'].strip() else 0,
                    float(row['airport_fee']) if row.get('airport_fee') and row['airport_fee'].strip() else 0,
                    float(row['total_amount']) if row.get('total_amount') and row['total_amount'].strip() else 0,
                    int(row['vendor_id']) if row.get('vendor_id') and row['vendor_id'].strip() else None,
                    int(row['ratecode_id']) if row.get('ratecode_id') and row['ratecode_id'].strip() else None,
                    row['store_and_fwd_flag'] if row.get('store_and_fwd_flag') else None,
                    int(row['payment_type']) if row.get('payment_type') and row['payment_type'].strip() else None
                ))
            except Exception as e:
                continue  # Skip bad rows silently

            # Insert batch when full - using execute_values (FASTER!)
            if len(batch_data) >= batch_size:
                execute_values(cursor, """
                    INSERT INTO trips (
                        pickup_datetime, dropoff_datetime, pickup_zone_id, dropoff_zone_id,
                        passenger_count, trip_distance, fare_amount, tip_amount, tolls_amount,
                        extra, mta_tax, improvement_surcharge, congestion_surcharge,
                        airport_fee, total_amount, vendor_id, ratecode_id,
                        store_and_fwd_flag, payment_type
                    ) VALUES %s
                """, batch_data, page_size=5000)

                conn.commit()
                total_inserted += len(batch_data)
                print(f"  ✓ Inserted {total_inserted:,} trips...")
                batch_data = []

        # Insert remaining records
        if batch_data:
            execute_values(cursor, """
                INSERT INTO trips (
                    pickup_datetime, dropoff_datetime, pickup_zone_id, dropoff_zone_id,
                    passenger_count, trip_distance, fare_amount, tip_amount, tolls_amount,
                    extra, mta_tax, improvement_surcharge, congestion_surcharge,
                    airport_fee, total_amount, vendor_id, ratecode_id,
                    store_and_fwd_flag, payment_type
                ) VALUES %s
            """, batch_data, page_size=5000)
            conn.commit()
            total_inserted += len(batch_data)

    cursor.execute("SELECT COUNT(*) FROM trips;")
    trip_count = cursor.fetchone()[0]
    print(f"✓ Total trips loaded: {trip_count:,}")

    # -------------------------
    # Step 4: Populate derived features (OPTIMIZED)
    # -------------------------
    print(f"\n🔄 Step 4: Calculating derived features...")
    print("⏳ Using large batches for speed...")

    batch_size = 50000  # Larger batches
    offset = 0
    processed = 0

    while offset < trip_count:
        # Fetch batch
        cursor.execute("""
            SELECT
                trip_id,
                pickup_datetime,
                dropoff_datetime,
                trip_distance,
                fare_amount,
                tip_amount
            FROM trips
            ORDER BY trip_id
            LIMIT %s OFFSET %s
        """, (batch_size, offset))

        trips = cursor.fetchall()

        if not trips:
            break

        # Calculate features
        derived_data = []
        for trip in trips:
            trip_id, pickup, dropoff, distance, fare, tip = trip

            duration = calculate_trip_duration(pickup, dropoff)

            derived_data.append((
                trip_id,
                calculate_tip_percentage(tip, fare),
                duration,
                get_time_of_day(pickup),
                calculate_speed(distance, duration),
                get_day_type(pickup)
            ))

        # Insert features with execute_values (FASTER!)
        execute_values(cursor, """
            INSERT INTO derived_features (
                trip_id,
                tip_percentage,
                trip_duration_minutes,
                time_of_day,
                trip_speed_mph,
                day_type
            ) VALUES %s
        """, derived_data, page_size=5000)

        conn.commit()

        processed += len(trips)
        progress = (processed / trip_count) * 100
        print(f"  Progress: {progress:.1f}% ({processed:,}/{trip_count:,})")

        offset += batch_size

    cursor.execute("SELECT COUNT(*) FROM derived_features;")
    feature_count = cursor.fetchone()[0]
    print(f"✓ Calculated {feature_count:,} derived features")

    # -------------------------
    # Step 5: Run indexes.sql
    # -------------------------
    print("\n📇 Step 5: Creating indexes...")

    if os.path.exists(INDEXES_FILE):
        with open(INDEXES_FILE, 'r') as f:
            indexes_sql = f.read()
            for statement in indexes_sql.split(';'):
                if statement.strip():
                    cursor.execute(statement)
            conn.commit()
        print("✓ Indexes created from indexes.sql")
    else:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trips_pickup ON trips(pickup_datetime);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trips_dropoff ON trips(dropoff_datetime);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trips_pickup_zone ON trips(pickup_zone_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trips_dropoff_zone ON trips(dropoff_zone_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trips_payment_type ON trips(payment_type);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_derived_trip_id ON derived_features(trip_id);")
        conn.commit()
        print("✓ Indexes created")

    # -------------------------
    # Verification
    # -------------------------
    print("\n" + "=" * 60)
    print("✅ DATABASE POPULATION COMPLETE!")
    print("=" * 60)
    print(f"📊 Zones: {zone_count:,}")
    print(f"📊 Trips: {trip_count:,}")
    print(f"📊 Derived Features: {feature_count:,}")

    # Test a sample query
    print("\n🧪 Testing sample query...")
    cursor.execute("""
        SELECT
            t.trip_id,
            t.fare_amount,
            df.tip_percentage,
            df.trip_duration_minutes,
            df.time_of_day,
            df.trip_speed_mph,
            df.day_type
        FROM trips t
        JOIN derived_features df ON t.trip_id = df.trip_id
        LIMIT 1;
    """)

    sample = cursor.fetchone()
    if sample:
        print("✅ Sample trip:")
        print(f"   Trip ID: {sample[0]}")
        print(f"   Fare: ${sample[1]:.2f}")
        print(f"   Tip: {sample[2]:.1f}%")
        print(f"   Duration: {sample[3]:.1f} min")
        print(f"   Time: {sample[4]}")
        print(f"   Speed: {sample[5]:.1f} mph")
        print(f"   Day: {sample[6]}")

    print("\n" + "=" * 60)
    print("🎉 READY TO USE!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("1. Test the API: python api_hybrid.py")
    print("2. Verify: curl http://localhost:8000/status")
    print("\n✅ You now have 5GB storage with all features!")

except Exception as e:
    conn.rollback()
    print(f"✗ Pipeline failed: {e}")
    import traceback
    traceback.print_exc()

finally:
    cursor.close()
    conn.close()
