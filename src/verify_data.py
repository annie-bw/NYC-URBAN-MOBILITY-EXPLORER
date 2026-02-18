import pandas as pd
import os

print("DATA VERIFICATION")

trip_file = "../data/raw/yellow_tripdata.parquet"
if os.path.exists(trip_file):
    df = pd.read_parquet(trip_file)
    print(f"\n Trip Data Loaded Successfully!")
    print(f"Rows: {len(df):,}")
    print(f"Columns: {len(df.columns)}")
    print(f"\n Column names:")
    for col in df.columns:
        print(f"- {col}")
    print(f"\n First trip pickup: {df['tpep_pickup_datetime'].min()}")
    print(f"Last trip pickup: {df['tpep_pickup_datetime'].max()}")
else:
    print("Trip data not found!")

zone_file = "../data/raw/taxi_zone_lookup.csv"
if os.path.exists(zone_file):
    zones = pd.read_csv(zone_file)
    print(f"\n Zone Lookup Loaded Successfully!")
    print(f"\n Zones: {len(zones)}")
    print(f"\n Sample zones:")
    print(zones.head(3).to_string())
else:
    print("Zone lookup not found!")


