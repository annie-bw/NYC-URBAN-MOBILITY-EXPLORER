"""
Feature Engineering Module
Calculates 5 derived features from raw trip data.

Features:
1. tip_percentage - Tipping behavior analysis
2. trip_duration_minutes - Trip length in minutes
3. time_of_day - Categorical time period
4. trip_speed_mph - Average speed (traffic analysis)
5. day_type - Weekend vs Weekday classification
"""

from datetime import datetime


class FeatureEngineer:
    """
    Generates derived features from raw taxi trip data
    """

    @staticmethod
    def calculate_tip_percentage(tip_amount, fare_amount):
        """
        Calculate tip as percentage of fare.

        Formula: tip_percentage = (tip_amount / fare_amount) × 100

        Args:
            tip_amount: Dollar amount of tip
            fare_amount: Base fare amount

        Returns:
            Float representing tip percentage, or 0.0 if invalid
        """
        if fare_amount is None or fare_amount <= 0:
            return 0.0

        if tip_amount is None or tip_amount < 0:
            return 0.0

        return round((tip_amount / fare_amount) * 100, 2)

    @staticmethod
    def calculate_trip_duration_minutes(pickup_datetime, dropoff_datetime):
        """
        Calculate trip duration in minutes.

        Formula: duration = (dropoff_time - pickup_time) in minutes

        Args:
            pickup_datetime: Trip start timestamp
            dropoff_datetime: Trip end timestamp

        Returns:
            Float representing duration in minutes, or None if invalid
        """
        if pickup_datetime is None or dropoff_datetime is None:
            return None

        try:
            duration_seconds = (dropoff_datetime -
                                pickup_datetime).total_seconds()

            if duration_seconds <= 0:
                return None

            return round(duration_seconds / 60, 2)

        except Exception:
            return None

    @staticmethod
    def categorize_time_of_day(pickup_datetime):
        """
        Categorize pickup time into time-of-day buckets.

        Categories:
            - Early Morning: 12:00 AM - 4:59 AM
            - Morning Rush:  5:00 AM - 9:59 AM
            - Midday:        10:00 AM - 3:59 PM
            - Evening Rush:  4:00 PM - 7:59 PM
            - Night:         8:00 PM - 11:59 PM

        Args:
            pickup_datetime: Timestamp of trip start

        Returns:
            String representing time category
        """
        if pickup_datetime is None:
            return "Unknown"

        try:
            hour = pickup_datetime.hour

            if 0 <= hour < 5:
                return "Early Morning"
            elif 5 <= hour < 10:
                return "Morning Rush"
            elif 10 <= hour < 16:
                return "Midday"
            elif 16 <= hour < 20:
                return "Evening Rush"
            elif 20 <= hour < 24:
                return "Night"
            else:
                return "Unknown"

        except Exception:
            return "Unknown"

    @staticmethod
    def calculate_trip_speed_mph(trip_distance, trip_duration_minutes):
        """
        Calculate average trip speed in miles per hour.

        Formula: speed = (distance / duration_minutes) × 60

        Args:
            trip_distance: Distance in miles
            trip_duration_minutes: Duration in minutes

        Returns:
            Float representing speed in MPH, or None if invalid
        """
        if trip_distance is None or trip_distance <= 0:
            return None

        if trip_duration_minutes is None or trip_duration_minutes <= 0:
            return None

        try:
            speed = (trip_distance / trip_duration_minutes) * 60
            return round(speed, 2)

        except Exception:
            return None

    @staticmethod
    def categorize_day_type(pickup_datetime):
        """
        Categorize trip by day of week.

        Categories:
            - Weekend: Saturday (5) or Sunday (6)
            - Weekday: Monday (0) through Friday (4)

        Args:
            pickup_datetime: Timestamp of trip start

        Returns:
            String: "Weekend" or "Weekday"
        """
        if pickup_datetime is None:
            return "Unknown"

        try:
            day_of_week = pickup_datetime.weekday()  # 0=Monday, 6=Sunday

            if day_of_week in [5, 6]:  # Saturday or Sunday
                return "Weekend"
            else:
                return "Weekday"

        except Exception:
            return "Unknown"

    @staticmethod
    def engineer_all_features(row):
        """
        Calculate all 5 features for a single trip record.

        Args:
            row: Dictionary-like object with trip data

        Returns:
            Dictionary with all engineered features
        """
        features = {}

        # Feature 1: Tip Percentage
        features['tip_percentage'] = FeatureEngineer.calculate_tip_percentage(
            row.get('tip_amount'),
            row.get('fare_amount')
        )

        # Feature 2: Trip Duration
        features['trip_duration_minutes'] = FeatureEngineer.calculate_trip_duration_minutes(
            row.get('tpep_pickup_datetime'),
            row.get('tpep_dropoff_datetime')
        )

        # Feature 3: Time of Day
        features['time_of_day'] = FeatureEngineer.categorize_time_of_day(
            row.get('tpep_pickup_datetime')
        )

        # Feature 4: Trip Speed
        features['trip_speed_mph'] = FeatureEngineer.calculate_trip_speed_mph(
            row.get('trip_distance'),
            features['trip_duration_minutes']
        )

        # Feature 5: Day Type
        features['day_type'] = FeatureEngineer.categorize_day_type(
            row.get('tpep_pickup_datetime')
        )

        return features
