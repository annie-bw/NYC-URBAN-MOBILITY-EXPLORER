import math


class ManualOutlierDetector:
    """
    Custom outlier detection using Z-score method.
    Implements statistical calculations without numpy/scipy.
    """

    def __init__(self, threshold=3.0):
        """
        Initialize detector with Z-score threshold.

        Args:
            threshold: Number of standard deviations to consider outlier (default: 3)
        """
        self.threshold = threshold
        self.stats = {}

    def calculate_mean(self, values):
        """
        Calculate arithmetic mean manually.

        Formula: mean = sum(values) / count(values)

        Time Complexity: O(n)
        Space Complexity: O(1)
        """
        if not values:
            return 0.0

        total = 0.0
        count = 0

        for value in values:
            if value is not None and not math.isnan(float(value)):
                total += float(value)
                count += 1

        return total / count if count > 0 else 0.0

    def calculate_std_dev(self, values, mean):
        """
        Calculate standard deviation manually.

        Formula:
            variance = sum((x - mean)**2) / (n - 1)
            std_dev = sqrt(variance)

        Time Complexity: O(n)
        Space Complexity: O(1)
        """
        if not values or len(values) < 2:
            return 0.0

        squared_diffs = 0.0
        count = 0

        for value in values:
            if value is not None and not math.isnan(float(value)):
                diff = float(value) - mean
                squared_diffs += diff * diff
                count += 1

        if count < 2:
            return 0.0

        variance = squared_diffs / (count - 1)
        return math.sqrt(variance)

    def calculate_z_score(self, value, mean, std_dev):
        """
        Calculate Z-score for a single value.

        Formula: z = (x - mean) / std_dev

        Time Complexity: O(1)
        Space Complexity: O(1)
        """
        if std_dev == 0:
            return 0.0

        return (float(value) - mean) / std_dev

    def detect_outliers(self, data_dict, columns):
        """
        Detect outliers across multiple columns.

        Args:
            data_dict: Dictionary where keys are column names, values are lists
            columns: List of column names to check for outliers

        Returns:
            Dictionary mapping row indices to reasons for being outliers

        Algorithm:
            1. For each column:
                a. Calculate mean manually
                b. Calculate std deviation manually
                c. Calculate Z-score for each value
                d. Mark values where |Z-score| > threshold
            2. Return row indices that are outliers in ANY column

        Time Complexity: O(n * m) where n=rows, m=columns
        Space Complexity: O(n)
        """
        outlier_rows = {}
        n_rows = len(next(iter(data_dict.values())))

        # Calculate statistics for each column
        for col in columns:
            if col not in data_dict:
                continue

            values = data_dict[col]

            # Calculate mean manually
            mean = self.calculate_mean(values)

            # Calculate standard deviation manually
            std_dev = self.calculate_std_dev(values, mean)

            # Store statistics
            self.stats[col] = {
                'mean': mean,
                'std_dev': std_dev,
                'threshold': self.threshold
            }

            # Check each value for outliers
            for idx, value in enumerate(values):
                if value is None or math.isnan(float(value)):
                    continue

                z_score = self.calculate_z_score(value, mean, std_dev)

                if abs(z_score) > self.threshold:
                    if idx not in outlier_rows:
                        outlier_rows[idx] = []

                    outlier_rows[idx].append({
                        'column': col,
                        'value': value,
                        'z_score': round(z_score, 2),
                        'mean': round(mean, 2),
                        'std_dev': round(std_dev, 2)
                    })

        return outlier_rows

    def get_statistics_report(self):
        """Generate a statistical summary report."""
        report += "===========MANUAL OUTLIER DETECTION - STATISTICAL SUMMARY==============\n"

        for col, stats in self.stats.items():
            report += f"Column: {col}\n"
            report += f"  Mean: {stats['mean']:.2f}\n"
            report += f"  Std Dev: {stats['std_dev']:.2f}\n"
            report += f"  Threshold: ±{stats['threshold']} standard deviations\n"
            report += f"  Outlier range: < {stats['mean'] - stats['threshold']*stats['std_dev']:.2f} "
            report += f"or > {stats['mean'] + stats['threshold']*stats['std_dev']:.2f}\n\n"

        return report


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


# Pseudo-code and Complexity Analysis
"""
ALGORITHM: Manual Z-Score Outlier Detection

PSEUDO-CODE:
-----------
function detect_outliers(data, columns, threshold):
    outliers = empty_dictionary

    for each column in columns:
        values = data[column]

        // Step 1: Calculate mean
        mean = calculate_mean(values)

        // Step 2: Calculate standard deviation
        std_dev = calculate_std_dev(values, mean)

        // Step 3: Calculate Z-scores and identify outliers
        for i = 0 to length(values):
            z_score = (values[i] - mean) / std_dev

            if |z_score| > threshold:
                outliers[i].append({column, value, z_score})

    return outliers

function calculate_mean(values):
    sum = 0
    count = 0
    for each value in values:
        sum += value
        count += 1
    return sum / count

function calculate_std_dev(values, mean):
    sum_squared_diffs = 0
    count = 0
    for each value in values:
        diff = value - mean
        sum_squared_diffs += diff²
        count += 1
    variance = sum_squared_diffs / (count - 1)
    return sqrt(variance)

TIME COMPLEXITY ANALYSIS:
------------------------
Let n = number of rows, m = number of columns

calculate_mean: O(n)
calculate_std_dev: O(n)
detect_outliers: O(n * m)

Overall: O(n * m)

SPACE COMPLEXITY ANALYSIS:
-------------------------
- Storage for statistics: O(m)
- Storage for outlier indices: O(k) where k = number of outliers
- No additional data structures created

Overall: O(m + k) ≈ O(n) in worst case

JUSTIFICATION:
-------------
This algorithm is appropriate for this dataset because:
1. Z-score method is industry standard for outlier detection
2. We avoid dependencies on numpy/scipy as required
3. We can process 3 million rows efficiently with O(n*m) complexity
4. Memory usage is minimal - we don't duplicate the dataset
5. Results are interpretable (Z-score tells us "how unusual" a value is)
"""
