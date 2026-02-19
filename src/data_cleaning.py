"""
NYC Taxi Data Cleaning Pipeline
Process:
1. Load raw parquet data
2. Validate and remove invalid records
3. Detect and remove outliers
4. Engineer 5 new features
5. Export cleaned data to CSV
"""

import pandas as pd
import os
import sys
from datetime import datetime
import logging
import numpy as np

# Import our custom modules
from manual_algorithm import ManualDataValidator
from feature_engineering import FeatureEngineer


class TaxiDataCleaner:
    """
    Main data cleaning pipeline for NYC taxi trip data.
    Handles validation, outlier detection, and feature engineering.
    """

    def __init__(self, input_file, output_dir="../data/processed", log_dir="../data/logs"):
        """
        Initialize the data cleaning pipeline.

        Args:
            input_file: Path to raw parquet file
            output_dir: Directory for cleaned output
            log_dir: Directory for log files
        """
        self.input_file = input_file
        self.output_dir = output_dir
        self.log_dir = log_dir

        # Create directories if they don't exist
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(log_dir, exist_ok=True)

        # Setup logging
        self.setup_logging()

        # Initialize statistics tracking
        self.stats = {
            'initial_rows': 0,
            'final_rows': 0,
            'removed_null_required': 0,
            'removed_invalid_fare': 0,
            'removed_invalid_distance': 0,
            'removed_invalid_passenger': 0,
            'removed_invalid_datetime': 0,
            'removed_outliers': 0,
            'removed_duplicates': 0,
            'total_removed': 0
        }

        self.validator = ManualDataValidator()

        self.df = None

    def setup_logging(self):
        """Configure logging to both file and console."""
        log_file = os.path.join(
            self.log_dir, f'cleaning_log_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt')

        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.stream = open(
            sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler(sys.stdout)
            ]
        )

        self.logger = logging.getLogger(__name__)
        self.logger.info("="*70)
        self.logger.info("NYC TAXI DATA CLEANING PIPELINE STARTED")
        self.logger.info("="*70)

    def load_data(self):
        """
        Load raw parquet data into memory.

        Returns:
            Boolean indicating success
        """
        try:
            self.logger.info(f"Loading data from: {self.input_file}")
            self.df = pd.read_parquet(self.input_file)

            self.stats['initial_rows'] = len(self.df)

            self.logger.info(f"Data loaded successfully!")
            self.logger.info(
                f"   Initial rows: {self.stats['initial_rows']:,}")
            self.logger.info(f"   Columns: {len(self.df.columns)}")

            # Log column info
            self.logger.info(f"\n   Available columns:")
            for col in self.df.columns:
                null_count = self.df[col].isnull().sum()
                null_pct = (null_count / len(self.df)) * 100
                self.logger.info(
                    f"      - {col}: {null_count:,} nulls ({null_pct:.2f}%)")

            return True

        except Exception as e:
            self.logger.error(f"Failed to load data: {str(e)}")
            return False

    def remove_null_required_fields(self):
        """
        Remove rows with null values in required fields.

        Required fields:
        - tpep_pickup_datetime (trip must have start time)
        - tpep_dropoff_datetime (trip must have end time)
        - trip_distance (trip must have distance)
        - fare_amount (trip must have fare)
        - PULocationID (must know pickup location)
        - DOLocationID (must know dropoff location)
        """
        self.logger.info("\n" + "="*10)
        self.logger.info("STEP 1: Removing rows with null required fields")

        initial_count = len(self.df)

        required_fields = [
            'tpep_pickup_datetime',
            'tpep_dropoff_datetime',
            'trip_distance',
            'fare_amount',
            'PULocationID',
            'DOLocationID'
        ]

        for field in required_fields:
            before = len(self.df)
            self.df = self.df[self.df[field].notna()]
            removed = before - len(self.df)

            if removed > 0:
                self.logger.info(
                    f"   Removed {removed:,} rows with null {field}")

        total_removed = initial_count - len(self.df)
        self.stats['removed_null_required'] = total_removed

        self.logger.info(f"\n Total removed: {total_removed:,} rows")
        self.logger.info(f"Remaining: {len(self.df):,} rows")

    def fill_optional_nulls(self):
        """
        Fill null values in optional fields with appropriate defaults.

        Optional fields default to 0:
        - tip_amount
        - tolls_amount
        - extra
        - mta_tax
        - improvement_surcharge
        - congestion_surcharge
        - Airport_fee
        """
        self.logger.info("STEP 2: Filling null values in optional fields")
        self.logger.info("===================")

        optional_fields = [
            'tip_amount',
            'tolls_amount',
            'extra',
            'mta_tax',
            'improvement_surcharge',
            'congestion_surcharge',
            'Airport_fee'
        ]

        for field in optional_fields:
            if field in self.df.columns:
                null_count = self.df[field].isnull().sum()
                if null_count > 0:
                    self.df[field] = self.df[field].fillna(0)
                    self.logger.info(
                        f"   Filled {null_count:,} nulls in {field} with 0")

        # Fill passenger_count with 1 (most common value)
        if 'passenger_count' in self.df.columns:
            null_count = self.df['passenger_count'].isnull().sum()
            if null_count > 0:
                self.df['passenger_count'] = self.df['passenger_count'].fillna(
                    1)
                self.logger.info(
                    f"Filled {null_count:,} nulls in passenger_count with 1")

        self.logger.info(f"\n Optional fields processed")

    def validate_business_rules(self):
        """
        Apply business logic validation rules.
        Remove records that violate NYC taxi data constraints.
        """
        self.logger.info("\n" + "="*70)
        self.logger.info("STEP 3: Validating business rules")
        self.logger.info("="*70)

        initial_count = len(self.df)

        # Rule 1: Valid fare amounts
        self.logger.info("\n Validating fare amounts...")
        before = len(self.df)
        self.df = self.df[self.df.apply(
            lambda row: self.validator.is_valid_fare(row['fare_amount']),
            axis=1
        )]
        removed_fare = before - len(self.df)
        self.stats['removed_invalid_fare'] = removed_fare
        self.logger.info(
            f"Removed {removed_fare:,} rows with invalid fares")

        # Rule 2: Valid trip distances
        self.logger.info("\n Validating trip distances")
        before = len(self.df)
        self.df = self.df[self.df.apply(
            lambda row: self.validator.is_valid_distance(row['trip_distance']),
            axis=1
        )]
        removed_distance = before - len(self.df)
        self.stats['removed_invalid_distance'] = removed_distance
        self.logger.info(
            f"Removed {removed_distance:,} rows with invalid distances")

        # Rule 3: Valid passenger counts
        if 'passenger_count' in self.df.columns:
            self.logger.info("\n Validating passenger counts")
            before = len(self.df)
            self.df = self.df[self.df.apply(
                lambda row: self.validator.is_valid_passenger_count(
                    row['passenger_count']),
                axis=1
            )]
            removed_passenger = before - len(self.df)
            self.stats['removed_invalid_passenger'] = removed_passenger
            self.logger.info(
                f"Removed {removed_passenger:,} rows with invalid passenger counts")

        # Rule 4: Valid datetime ranges
        self.logger.info("\n Validating datetime logic")
        before = len(self.df)
        self.df = self.df[self.df.apply(
            lambda row: self.validator.is_valid_datetime_range(
                row['tpep_pickup_datetime'],
                row['tpep_dropoff_datetime']
            ),
            axis=1
        )]
        removed_datetime = before - len(self.df)
        self.stats['removed_invalid_datetime'] = removed_datetime
        self.logger.info(
            f"Removed {removed_datetime:,} rows with invalid datetime ranges")

        # Rule 5: Remove trips from obviously wrong years (like 2002)
        self.logger.info("\n   Validating year range (must be 2019)...")
        before = len(self.df)
        self.df = self.df[
            (self.df['tpep_pickup_datetime'].dt.year == 2019) &
            (self.df['tpep_dropoff_datetime'].dt.year == 2019)
        ]
        removed_year = before - len(self.df)
        self.logger.info(
            f"Removed {removed_year:,} rows with invalid years")

        total_removed = initial_count - len(self.df)
        self.logger.info(
            f"\n Total removed by business rules: {total_removed:,} rows")
        self.logger.info(f"   Remaining: {len(self.df):,} rows")

    def remove_obvious_errors(self):
        """
        Remove only obviously broken records using business rules.
        Rules:
        1. Speed > 200 mph (physically impossible for NYC taxi)
        2. Zero distance AND zero duration (clearly broken record)
        3. Duration > 24 hours (likely system error)
        4. Extremely high fares > $1000 (likely data error)
        5. Negative surcharges/fees (system error)
        """
        self.logger.info("STEP 4: Removing obvious data errors")
        self.logger.info("="*20)

        initial_count = len(self.df)

        # Calculate duration and speed for validation
        duration_seconds = (self.df['tpep_dropoff_datetime'] -
                            self.df['tpep_pickup_datetime']).dt.total_seconds()
        duration_hours = duration_seconds / 3600

        # Avoid division by zero for speed calculation
        self.df['temp_speed'] = 0.0
        mask = duration_hours > 0
        self.df.loc[mask, 'temp_speed'] = (self.df.loc[mask, 'trip_distance'] /
                                           duration_hours[mask])

        # Speed > 200 mph (physically impossible)
        before = len(self.df)
        self.df = self.df[self.df['temp_speed'] <= 200]
        removed = before - len(self.df)
        if removed > 0:
            self.logger.info(
                f"   Removed {removed:,} rows with speed > 200 mph")

        # Recalculate duration after filtering
        duration_seconds = (self.df['tpep_dropoff_datetime'] -
                            self.df['tpep_pickup_datetime']).dt.total_seconds()

        # Zero distance AND zero duration (clearly broken)
        before = len(self.df)
        self.df = self.df[~((self.df['trip_distance'] == 0)
                            & (duration_seconds == 0))]
        removed = before - len(self.df)
        if removed > 0:
            self.logger.info(
                f"   Removed {removed:,} rows with zero distance AND zero duration")

        # Recalculate duration again
        duration_seconds = (self.df['tpep_dropoff_datetime'] -
                            self.df['tpep_pickup_datetime']).dt.total_seconds()

        # Duration > 24 hours
        before = len(self.df)
        self.df = self.df[duration_seconds <= 86400]  # 24 hours in seconds
        removed = before - len(self.df)
        if removed > 0:
            self.logger.info(
                f"   Removed {removed:,} rows with duration > 24 hours")

        # Extremely high fares
        before = len(self.df)
        self.df = self.df[self.df['fare_amount'] <= 1000]
        removed = before - len(self.df)
        if removed > 0:
            self.logger.info(f"   Removed {removed:,} rows with fare > $1000")

        # Negative extra charges
        if 'extra' in self.df.columns:
            before = len(self.df)
            self.df = self.df[self.df['extra'] >= 0]
            removed = before - len(self.df)
            if removed > 0:
                self.logger.info(
                    f"   Removed {removed:,} rows with negative extra charges")

        # Clean up temporary column
        self.df = self.df.drop('temp_speed', axis=1)

        total_removed = initial_count - len(self.df)
        self.stats['removed_outliers'] = total_removed

        self.logger.info(
            f"\n Total removed by business rules: {total_removed:,} rows")
        self.logger.info(f"   Remaining: {len(self.df):,} rows")
        self.logger.info(
            f"   Retention rate: {(len(self.df)/initial_count)*100:.2f}%")

    def remove_duplicates(self):
        """
        Remove duplicate trip records.
        Duplicates defined as same pickup/dropoff time and location.
        """
        self.logger.info("STEP 5: Removing duplicate records")
        self.logger.info("="*25)

        initial_count = len(self.df)

        duplicate_columns = [
            'tpep_pickup_datetime',
            'tpep_dropoff_datetime',
            'PULocationID',
            'DOLocationID',
            'fare_amount'
        ]

        self.df = self.df.drop_duplicates(
            subset=duplicate_columns, keep='first')

        removed_duplicates = initial_count - len(self.df)
        self.stats['removed_duplicates'] = removed_duplicates

        self.logger.info(f"Removed {removed_duplicates:,} duplicate rows")
        self.logger.info(f"Remaining: {len(self.df):,} rows")

    def engineer_features(self):
        """
        Calculate 5 derived features using custom feature engineering.

        Features:
        1. tip_percentage
        2. trip_duration_minutes
        3. time_of_day
        4. trip_speed_mph
        5. day_type
        """
        self.logger.info("STEP 6: Engineering derived features")
        self.logger.info("="*20)

        # Calculate all features
        self.logger.info("\n Calculating feature 1: tip_percentage...")
        self.df['tip_percentage'] = (
            self.df['tip_amount'] /
            self.df['fare_amount'].replace(0, float('nan')) * 100
        ).fillna(0)
        self.logger.info(
            f"Complete (Mean: {self.df['tip_percentage'].mean():.2f}%)")

        self.logger.info(
            "\n   Calculating feature 2: trip_duration_minutes...")
        self.df['trip_duration_minutes'] = (
            (self.df['tpep_dropoff_datetime'] -
             self.df['tpep_pickup_datetime'])
            .dt.total_seconds() / 60
        )
        self.logger.info(
            f"Complete (Mean: {self.df['trip_duration_minutes'].mean():.2f} min)")

        self.logger.info("\n   Calculating feature 3: time_of_day...")
        hour = self.df['tpep_pickup_datetime'].dt.hour
        self.df['time_of_day'] = np.select(
            [hour.between(6, 11), hour.between(12, 16), hour.between(17, 20)],
            ['Morning', 'Afternoon', 'Evening'],
            default='Night'
        )
        self.logger.info(f"Complete")
        self.logger.info(f"Distribution:")
        for category, count in self.df['time_of_day'].value_counts().items():
            pct = (count / len(self.df)) * 100
            self.logger.info(f"{category}: {count:,} ({pct:.1f}%)")

        self.logger.info("\n Calculating feature 4: trip_speed_mph...")
        self.df['trip_speed_mph'] = (
            self.df['trip_distance'] / (self.df['trip_duration_minutes'] / 60)
        ).replace([float('inf'), -float('inf')], float('nan')).fillna(0)
        valid_speeds = self.df[self.df['trip_speed_mph'].notna()
                               ]['trip_speed_mph']
        self.logger.info(
            f"Complete (Mean: {valid_speeds.mean():.2f} mph)")

        self.logger.info("\n   Calculating feature 5: day_type...")
        dow = self.df['tpep_pickup_datetime'].dt.dayofweek
        self.df['day_type'] = dow.apply(
            lambda x: 'Weekend' if x >= 5 else 'Weekday')
        self.logger.info(f"Complete")
        self.logger.info(f"Distribution:")
        for category, count in self.df['day_type'].value_counts().items():
            pct = (count / len(self.df)) * 100
            self.logger.info(f"         {category}: {count:,} ({pct:.1f}%)")

        self.logger.info("\n All 5 features engineered successfully!")

    def export_cleaned_data(self):
        """
        Export cleaned data to CSV for database loading.
        """
        self.logger.info("STEP 7: Exporting cleaned data")
        self.logger.info("="*25)

        output_file = os.path.join(self.output_dir, 'cleaned_trips.csv')

        try:
            self.df.to_csv(output_file, index=False)

            file_size_mb = os.path.getsize(output_file) / (1024 * 1024)

            self.logger.info(f" Data exported successfully!")
            self.logger.info(f" File: {output_file}")
            self.logger.info(f" Size: {file_size_mb:.2f} MB")
            self.logger.info(f" Rows: {len(self.df):,}")
            self.logger.info(f" Columns: {len(self.df.columns)}")

            return output_file

        except Exception as e:
            self.logger.error(f"Export failed: {str(e)}")
            return None

    def generate_cleaning_report(self):
        """
        Generate comprehensive cleaning report.
        """
        self.logger.info("GENERATING CLEANING REPORT")
        self.logger.info("="*30)

        self.stats['final_rows'] = len(self.df)
        self.stats['total_removed'] = self.stats['initial_rows'] - \
            self.stats['final_rows']

        retention_rate = (self.stats['final_rows'] /
                          self.stats['initial_rows']) * 100

        report = f"""
NYC TAXI DATA CLEANING REPORT
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{'='*30}

SUMMARY
-------
Initial Records:        {self.stats['initial_rows']:>12,}
Final Records:          {self.stats['final_rows']:>12,}
Total Removed:          {self.stats['total_removed']:>12,}
Retention Rate:         {retention_rate:>11.2f}%

REMOVAL BREAKDOWN
-----------------
Null Required Fields:   {self.stats['removed_null_required']:>12,}
Invalid Fares:          {self.stats['removed_invalid_fare']:>12,}
Invalid Distances:      {self.stats['removed_invalid_distance']:>12,}
Invalid Passengers:     {self.stats['removed_invalid_passenger']:>12,}
Invalid Datetimes:      {self.stats['removed_invalid_datetime']:>12,}
Statistical Outliers:   {self.stats['removed_outliers']:>12,}
Duplicates:             {self.stats['removed_duplicates']:>12,}

ENGINEERED FEATURES
-------------------
1. tip_percentage
2. trip_duration_minutes
3. time_of_day
4. trip_speed_mph
5. day_type

DATA QUALITY METRICS
--------------------
"""

        # Add feature statistics
        for feature in ['tip_percentage', 'trip_duration_minutes', 'trip_speed_mph']:
            if feature in self.df.columns:
                report += f"\n{feature}:"
                report += f"\n  Mean:   {self.df[feature].mean():>10.2f}"
                report += f"\n  Median: {self.df[feature].median():>10.2f}"
                report += f"\n  Min:    {self.df[feature].min():>10.2f}"
                report += f"\n  Max:    {self.df[feature].max():>10.2f}\n"

        report += "END OF REPORT\n"
        report += f"{'='*20}\n"

        # Save report to file
        report_file = os.path.join(self.output_dir, 'cleaning_report.txt')
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)
        except Exception as e:
            self.logger.error(f"Failed to save report: {str(e)}")
            return None

        self.logger.info(report)
        self.logger.info(f"Report saved to: {report_file}")

        return report_file

    def run_pipeline(self):
        """
        Execute complete data cleaning pipeline.

        Returns:
            Tuple of (success, output_file, report_file)
        """
        try:
            # Step 1: Load data
            if not self.load_data():
                return False, None, None

            # Step 2: Remove nulls in required fields
            self.remove_null_required_fields()

            # Step 3: Fill nulls in optional fields
            self.fill_optional_nulls()

            # Step 4: Validate business rules
            self.validate_business_rules()

            # Step 5: Remove obvious errors using business rules
            self.remove_obvious_errors()

            # Step 6: Remove duplicates
            self.remove_duplicates()

            # Step 7: Engineer features
            self.engineer_features()

            # Step 8: Export cleaned data
            output_file = self.export_cleaned_data()

            # Step 9: Generate report
            report_file = self.generate_cleaning_report()

            self.logger.info("\n" + "="*70)
            self.logger.info(
                "DATA CLEANING PIPELINE COMPLETED SUCCESSFULLY!")
            self.logger.info("="*70)

            return True, output_file, report_file

        except Exception as e:
            self.logger.error(f"\n Pipeline failed: {str(e)}")
            import traceback
            self.logger.error(traceback.format_exc())
            return False, None, None


def main():
    """Main execution function."""

    # Configuration
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    INPUT_FILE = os.path.join(BASE_DIR, "data", "raw",
                              "yellow_tripdata.parquet")
    OUTPUT_DIR = os.path.join(BASE_DIR, "data", "processed")
    LOG_DIR = os.path.join(BASE_DIR, "data", "logs")

    print("\n" + "="*70)
    print("NYC TAXI DATA CLEANING PIPELINE")
    print("Author: BONESHA (Data Engineer + Database Architect)")
    print("="*70 + "\n")

    # Initialize and run cleaner
    cleaner = TaxiDataCleaner(
        input_file=INPUT_FILE,
        output_dir=OUTPUT_DIR,
        log_dir=LOG_DIR
    )

    success, output_file, report_file = cleaner.run_pipeline()

    if success:
        print("\n" + "="*70)
        print("✅ SUCCESS!")
        print("="*70)
        print(f"\nCleaned data:  {output_file}")
        print(f"Report:        {report_file}")
        print(f"\nNext step: Load this data into PostgreSQL database")
        print("="*70 + "\n")
    else:
        print("❌ PIPELINE FAILED")
        print("="*40)
        print("\nCheck the log files for details.")
        print("="*40 + "\n")


if __name__ == "__main__":
    main()
