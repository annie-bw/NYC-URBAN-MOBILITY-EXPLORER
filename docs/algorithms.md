# Algorithms Analysis

## 1. Selection Sort (Descending)

This algorithm sorts a list of items by finding the biggest one and moving it to the front.

- **Time complexity:** Slow. It takes more time as the list gets bigger because it has 2-level nestation. (O(n²))
- **Space complexity:** Very efficient. It doesn't need extra memory to do the work. (O(1))

---

## 2. Average and Spread (Mean & Std Dev)

- **Mean:** Adds up all the numbers and divides by how many there are to find the average.
- **Standard Deviation:** Calculates how much the numbers vary or "spread out" from that average.

- **Time complexity:** Fast. It just needs to look at each number once. (O(n))
- **Space complexity:** Very efficient. It only remembers a few numbers at a time. (O(1))

---

## 3. Anomaly Detector

This tool finds stranges or unusual trips by checking if their speed or fare is much higher or lower than the average.

### 3a. Speed Anomalies

It looks at the speed of all trips and flags ones that are way off from the normal speed.

- **Time complexity:** Fast for checking, but slows down a bit when as number of unusual trips increasess. (O(n + a²))
- **Space complexity:** Uses a bit of memory to keep track of the speeds and the anomalies it finds. (O(n + a))

### 3b. Fare Anomalies

It groups trips by where they started and checks for unusual prices within those specific areas.

- **Time complexity:** Similar to speed checking, it's fast but depends on how many anomalies are found. (O(n + a²))
- **Space complexity:** Needs memory to group the trips and store the results. (O(n + a))

---

## Summary

| Function          | Speed  | Memory Usage |
| ----------------- | ------ | ------------ |
| `selectionSort`   | Slow   | Very Low     |
| `computeMean`     | Fast   | Very Low     |
| `computeStdDev`   | Fast   | Very Low     |
| `detectAnomalies` | Fast\* | Moderate     |

_\*Can be slower if a lot of anomalies are found._
