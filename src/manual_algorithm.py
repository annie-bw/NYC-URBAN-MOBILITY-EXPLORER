import math


class ManualDataValidator:
    """
    Custom data validation logic without built-in validation libraries.
    """

    @staticmethod
    def is_valid_fare(fare_amount):
        """
        Validate fare amount.
        Rules: Must be positive, typically between $2.50 and $500
        """
        if fare_amount is None or math.isnan(float(fare_amount)):
            return False

        fare = float(fare_amount)

        # Negative fares are invalid
        if fare < 0:
            return False

        # Suspiciously low (less than minimum fare)
        if fare < 0.01:
            return False

        # Suspiciously high (likely error)
        if fare > 500:
            return False

        return True

    @staticmethod
    def is_valid_distance(trip_distance):
        """
        Validate trip distance.
        Rules: Must be positive, NYC trips rarely exceed 100 miles
        """
        if trip_distance is None or math.isnan(float(trip_distance)):
            return False

        distance = float(trip_distance)

        # Zero or negative distance
        if distance <= 0:
            return False

        # Impossibly long for NYC
        if distance > 100:
            return False

        return True

    @staticmethod
    def is_valid_passenger_count(passenger_count):
        """
        Validate passenger count.
        Rules: NYC taxis seat max 6 passengers, minimum 1
        """
        if passenger_count is None or math.isnan(float(passenger_count)):
            return False

        count = int(passenger_count)

        if count < 1 or count > 6:
            return False

        return True

    @staticmethod
    def is_valid_datetime_range(pickup_time, dropoff_time):
        """
        Validate datetime logic.
        Rules: Dropoff must be after pickup, trip duration reasonable
        """
        if pickup_time is None or dropoff_time is None:
            return False

        # Dropoff must be after pickup
        if dropoff_time <= pickup_time:
            return False

        # Calculate duration in seconds
        duration_seconds = (dropoff_time - pickup_time).total_seconds()

        # Trip too short (less than 10 seconds - likely error)
        if duration_seconds < 10:
            return False

        # Trip too long (more than 24 hours - likely error)
        if duration_seconds > 86400:
            return False

        return True
