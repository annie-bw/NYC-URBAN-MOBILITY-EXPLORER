import pandas as pd
import os
import sys
from datetime import datetime
import logging

# Import our custom modules
from manual_algorithm import ManualOutlierDetector, ManualDataValidator
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

        # Initialize custom algorithm
        self.outlier_detector = ManualOutlierDetector(threshold=3.0)
        self.validator = ManualDataValidator()

        self.df = None

    def setup_logging(self):
        """Configure logging to both file and console."""
        log_file = os.path.join(
            self.log_dir, f'cleaning_log_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt')

        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )

        self.logger = logging.getLogger(__name__)
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
            self.logger.info(f"Columns: {len(self.df.columns)}")

            # Log column info
            self.logger.info(f"\n Available columns:")
            for col in self.df.columns:
                null_count = self.df[col].isnull().sum()
                null_pct = (null_count / len(self.df)) * 100
                self.logger.info(
                    f"      - {col}: {null_count:,} nulls ({null_pct:.2f}%)")

            return True

        except Exception as e:
            self.logger.error(f"❌ Failed to load data: {str(e)}")
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
        self.logger.info("Removing rows with null required fields")
        self.logger.info("="*70)

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
                    f"Removed {removed:,} rows with null {field}")

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
        self.logger.info("Filling null values in optional fields")
        self.logger.info("="*70)

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
                        f"Filled {null_count:,} nulls in {field} with 0")

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
        self.logger.info("Validating business rules")
        self.logger.info("="*70)

        initial_count = len(self.df)

        # Valid fare amounts
        self.logger.info("\nValidating fare amounts...")
        before = len(self.df)
        self.df = self.df[self.df.apply(
            lambda row: self.validator.is_valid_fare(row['fare_amount']),
            axis=1
        )]
        removed_fare = before - len(self.df)
        self.stats['removed_invalid_fare'] = removed_fare
        self.logger.info(
            f"Removed {removed_fare:,} rows with invalid fares")

        # Valid trip distances
        self.logger.info("\n Validating trip distances...")
        before = len(self.df)
        self.df = self.df[self.df.apply(
            lambda row: self.validator.is_valid_distance(row['trip_distance']),
            axis=1
        )]
        removed_distance = before - len(self.df)
        self.stats['removed_invalid_distance'] = removed_distance
        self.logger.info(
            f"Removed {removed_distance:,} rows with invalid distances")

        # Valid passenger counts
        if 'passenger_count' in self.df.columns:
            self.logger.info("\n Validating passenger counts...")
            before = len(self.df)
            self.df = self.df[self.df.apply(
                lambda row: self.validator.is_valid_passenger_count(
                    row['passenger_count']),
                axis=1
            )]
            removed_passenger = before - len(self.df)
            self.stats['removed_invalid_passenger'] = removed_passenger
            self.logger.info(
                f"   Removed {removed_passenger:,} rows with invalid passenger counts")

        # Valid datetime ranges
        self.logger.info("\n Validating datetime logic...")
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
            f"   Removed {removed_datetime:,} rows with invalid datetime ranges")

        # Remove trips from obviously wrong years (like 2002)
        self.logger.info("\n Validating year range (must be 2024)...")
        before = len(self.df)
        self.df = self.df[
            (self.df['tpep_pickup_datetime'].dt.year == 2024) &
            (self.df['tpep_dropoff_datetime'].dt.year == 2024)
        ]
        removed_year = before - len(self.df)
        self.logger.info(
            f"Removed {removed_year:,} rows with invalid years")

        total_removed = initial_count - len(self.df)
        self.logger.info(
            f"\n Total removed by business rules: {total_removed:,} rows")
        self.logger.info(f"   Remaining: {len(self.df):,} rows")

    def detect_and_remove_outliers(self):
        """
        Use custom algorithm to detect and remove statistical outliers.
        This is the MANUAL ALGORITHM required by the rubric.
        """
        self.logger.info("Detecting outliers using CUSTOM ALGORITHM")
        self.logger.info("Algorithm: Manual Z-Score Outlier Detection")
        self.logger.info(
            "Method: Statistical analysis with manual calculations")

        initial_count = len(self.df)

        # Prepare data for outlier detection
        columns_to_check = ['fare_amount', 'trip_distance', 'tip_amount']

        data_dict = {
            col: self.df[col].tolist()
            for col in columns_to_check
        }

        # Run custom outlier detection algorithm
        self.logger.info(
            f"\n Running outlier detection on {len(self.df):,} rows...")
        self.logger.info(f"Checking columns: {', '.join(columns_to_check)}")

        outlier_indices = self.outlier_detector.detect_outliers(
            data_dict, columns_to_check)

        self.logger.info(f"Found {len(outlier_indices):,} outlier records")

        # Log statistics
        stats_report = self.outlier_detector.get_statistics_report()
        self.logger.info(stats_report)

        # Remove outliers
        if outlier_indices:
            # Get DataFrame indices (not dictionary keys)
            df_indices_to_remove = self.df.index[list(
                outlier_indices.keys())].tolist()

            # Log sample outliers
            self.logger.info("\n Sample outliers detected:")
            for idx, reasons in list(outlier_indices.items())[:5]:
                self.logger.info(f"\n Row {idx}:")
                for reason in reasons:
                    self.logger.info(f"- {reason['column']}: {reason['value']} "
                                     f"(Z-score: {reason['z_score']}, Mean: {reason['mean']}, "
                                     f"StdDev: {reason['std_dev']})")

            # Remove outliers from DataFrame
            self.df = self.df.drop(df_indices_to_remove)
            self.df = self.df.reset_index(drop=True)

        removed_outliers = initial_count - len(self.df)
        self.stats['removed_outliers'] = removed_outliers

        self.logger.info(f"\n Removed {removed_outliers:,} outlier rows")
        self.logger.info(f"Remaining: {len(self.df):,} rows")

    def remove_duplicates(self):
        """
        Remove duplicate trip records.
        Duplicates defined as same pickup/dropoff time and location.
        """
        self.logger.info("Removing duplicate records")
        self.logger.info("="*70)

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
        self.logger.info("Derived features")
        self.logger.info("="*70)

        feature_engineer = FeatureEngineer()

        # Calculate all features
        self.logger.info("\n Calculating feature 1: tip_percentage...")
        self.df['tip_percentage'] = self.df.apply(
            lambda row: feature_engineer.calculate_tip_percentage(
                row['tip_amount'],
                row['fare_amount']
            ),
            axis=1
        )
        self.logger.info(
            f"Complete (Mean: {self.df['tip_percentage'].mean():.2f}%)")

        self.logger.info(
            "\n Calculating feature 2: trip_duration_minutes...")
        self.df['trip_duration_minutes'] = self.df.apply(
            lambda row: feature_engineer.calculate_trip_duration_minutes(
                row['tpep_pickup_datetime'],
                row['tpep_dropoff_datetime']
            ),
            axis=1
        )
        self.logger.info(
            f"Complete (Mean: {self.df['trip_duration_minutes'].mean():.2f} min)")

        self.logger.info("\n   Calculating feature 3: time_of_day...")
        self.df['time_of_day'] = self.df.apply(
            lambda row: feature_engineer.categorize_time_of_day(
                row['tpep_pickup_datetime']
            ),
            axis=1
        )
        self.logger.info(f"Complete")
        self.logger.info(f"Distribution:")
        for category, count in self.df['time_of_day'].value_counts().items():
            pct = (count / len(self.df)) * 100
            self.logger.info(f"{category}: {count:,} ({pct:.1f}%)")

        self.logger.info("\n Calculating feature 4: trip_speed_mph")
        self.df['trip_speed_mph'] = self.df.apply(
            lambda row: feature_engineer.calculate_trip_speed_mph(
                row['trip_distance'],
                row['trip_duration_minutes']
            ),
            axis=1
        )
        valid_speeds = self.df[self.df['trip_speed_mph'].notna()
                               ]['trip_speed_mph']
        self.logger.info(
            f"Complete (Mean: {valid_speeds.mean():.2f} mph)")

        self.logger.info("\n   Calculating feature 5: day_type...")
        self.df['day_type'] = self.df.apply(
            lambda row: feature_engineer.categorize_day_type(
                row['tpep_pickup_datetime']
            ),
            axis=1
        )
        self.logger.info(f"Complete")
        self.logger.info(f"Distribution:")
        for category, count in self.df['day_type'].value_counts().items():
            pct = (count / len(self.df)) * 100
            self.logger.info(f"{category}: {count:,} ({pct:.1f}%)")

        self.logger.info("\n All 5 features engineered successfully!")

    def export_cleaned_data(self):
        """
        Export cleaned data to CSV for database loading.
        """
        self.logger.info("Exporting cleaned data")
        self.logger.info("="*70)

        output_file = os.path.join(self.output_dir, 'cleaned_trips.csv')

        try:
            self.df.to_csv(output_file, index=False)

            file_size_mb = os.path.getsize(output_file) / (1024 * 1024)

            self.logger.info(f"Data exported successfully!")
            self.logger.info(f"File: {output_file}")
            self.logger.info(f"Size: {file_size_mb:.2f} MB")
            self.logger.info(f"Rows: {len(self.df):,}")
            self.logger.info(f"Columns: {len(self.df.columns)}")

            return output_file

        except Exception as e:
            self.logger.error(f"Export failed: {str(e)}")
            return None

    def generate_cleaning_report(self):
        """
        Generate comprehensive cleaning report.
        """
        self.logger.info("GENERATING CLEANING REPORT")
        self.logger.info("="*70)

        self.stats['final_rows'] = len(self.df)
        self.stats['total_removed'] = self.stats['initial_rows'] - \
            self.stats['final_rows']

        retention_rate = (self.stats['final_rows'] /
                          self.stats['initial_rows']) * 100

        report = f"""

NYC TAXI DATA CLEANING REPORT
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{'='*70}

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

        report += f"\n{'='*70}\n"
        report += "END OF REPORT\n"
        report += f"{'='*70}\n"

        # Save report to file
        report_file = os.path.join(self.output_dir, 'cleaning_report.txt')
        with open(report_file, 'w') as f:
            f.write(report)

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

            # Step 5: Detect and remove outliers (CUSTOM ALGORITHM)
            self.detect_and_remove_outliers()

            # Step 6: Remove duplicates
            self.remove_duplicates()

            # Step 7: Engineer features
            self.engineer_features()

            # Step 8: Export cleaned data
            output_file = self.export_cleaned_data()

            # Step 9: Generate report
            report_file = self.generate_cleaning_report()

            self.logger.info("DATA CLEANING PIPELINE COMPLETED SUCCESSFULLY!")
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
    INPUT_FILE = "../data/raw/yellow_tripdata.parquet"
    OUTPUT_DIR = "../data/processed"
    LOG_DIR = "../data/logs"

    print("\n" + "="*70)
    print("NYC TAXI DATA CLEANING PIPELINE")

    # Initialize and run cleaner
    cleaner = TaxiDataCleaner(
        input_file=INPUT_FILE,
        output_dir=OUTPUT_DIR,
        log_dir=LOG_DIR
    )

    success, output_file, report_file = cleaner.run_pipeline()

    if success:
        print("=====SUCCESS!=========")
        print(f"\nCleaned data:{output_file}")
        print(f"Report:{report_file}")
    else:
        print(" =======PIPELINE FAILED==========")
        print("\nCheck the log files for details.")


if __name__ == "__main__":
    main()
