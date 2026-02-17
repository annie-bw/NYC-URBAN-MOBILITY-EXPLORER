# Algorithms Analysis

## 1. Selection Sort — Descending (`selectionSort.js`)

**What it does:** Finds the largest element in the unsorted part and swaps it to the front. Repeats until the whole array is sorted in descending order.

**Helper:** `swap(arr, i, j)` — switches two elements in the array.

**Pseudo-code:**
```
SWAP(arr, i, j):
    temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp

SELECTION_SORT(arr, key):
    for i = 0 to arr.length - 2:
        maxIndex = i
        for j = i + 1 to arr.length - 1:
            if arr[j][key] > arr[maxIndex][key]:
                maxIndex = j
        if maxIndex ≠ i:
            SWAP(arr, i, maxIndex)
    return arr
```

| | Complexity |
|---|---|
| **Time** | **O(n²)** — two nested loops, the inner loop shrinks by 1 each time |
| **Space** | **O(1)** — sorts in-place, only uses a temp variable for swapping |

---

## 2. Compute Mean & Std Dev (`compuStdDev.js`)

**What they do:**
- `computeMean` — sums all values and divides by count.
- `computeStdDev` — computes how spread out the values are from the mean.

**Pseudo-code:**
```
COMPUTE_MEAN(values):
    sum = 0
    for each value: sum += value
    return sum / count

COMPUTE_STD_DEV(values, mean):
    sumSquaredDiff = 0
    for each value: sumSquaredDiff += (value - mean)²
    variance = sumSquaredDiff / count
    return sqrt(variance)
```

| | Complexity |
|---|---|
| **Time** | **O(n)** — single pass through the array each |
| **Space** | **O(1)** — only a few variables, no extra arrays |

---

## 3. Anomaly Detector (`anomalyDetector.js`)

### 3a. `detectSpeedAnomalies(trips)`

**What it does:** Finds trips with unusually high or low speed using the Z-Score method (flag if > 2 std devs from the mean).

**Pseudo-code:**
```
DETECT_SPEED_ANOMALIES(trips):
    speeds = extract all trip speeds              → O(n)
    mean   = COMPUTE_MEAN(speeds)                 → O(n)
    stdDev = COMPUTE_STD_DEV(speeds, mean)        → O(n)

    anomalies = []
    for each trip:                                → O(n)
        zScore = (speed - mean) / stdDev
        if |zScore| > 2 → add to anomalies

    SELECTION_SORT anomalies by |zScore| desc     → O(a²)
    return anomalies
```

Let **n** = total trips, **a** = number of anomalies found (a ≤ n).

| | Complexity |
|---|---|
| **Time** | **O(n + a²)** — linear scan + selection sort on anomalies |
| **Space** | **O(n + a)** — speeds array (n) + anomalies array (a) |

---

### 3b. `detectFareAnomalies(trips)`

**What it does:** Groups trips by pickup zone, then finds fares that are unusually high or low *within each zone*.

**Pseudo-code:**
```
DETECT_FARE_ANOMALIES(trips):
    zoneGroups = group trips by pickup_zone_id    → O(n)

    anomalies = []
    for each zone with >= 10 trips:
        fares  = extract fare values              → O(k)
        mean   = COMPUTE_MEAN(fares)              → O(k)
        stdDev = COMPUTE_STD_DEV(fares, mean)     → O(k)

        for each trip in zone:                    → O(k)
            zScore = (fare - mean) / stdDev
            if |zScore| > 2 → add to anomalies

    SELECTION_SORT anomalies by |zScore| desc     → O(a²)
    return anomalies
```

Let **n** = total trips, **k** = trips in a zone, **a** = total anomalies.

| | Complexity |
|---|---|
| **Time** | **O(n + a²)** — each trip processed once across all zones (Σk = n), plus sorting |
| **Space** | **O(n + a)** — zone groups hold all n trips + anomalies array |

---

### 3c. `detectAnomalies(trips)` — Main Function

Runs both detectors and combines results.

| | Complexity |
|---|---|
| **Time** | **O(n + a²)** — where a = total anomalies from both detectors |
| **Space** | **O(n + a)** |

---

## Summary Table

| Function | Time | Space |
|---|---|---|
| `selectionSort` | O(n²) | O(1) |
| `computeMean` | O(n) | O(1) |
| `computeStdDev` | O(n) | O(1) |
| `detectSpeedAnomalies` | O(n + a²) | O(n + a) |
| `detectFareAnomalies` | O(n + a²) | O(n + a) |
| `detectAnomalies` | O(n + a²) | O(n + a) |

> **n** = number of trips, **a** = number of anomalies detected
