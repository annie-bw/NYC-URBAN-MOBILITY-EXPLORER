// Helper function that swaps two elements in an array
export function swap(arr, i, j) {
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}

// Selection in descending order by a given key
export function selectionSort(arr, key) {
    for (let i = 0; i < arr.length - 1; i++) {
        let maxIndex = i;

        // Find the element with the highest key value in the remaining unsorted part
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[j][key] > arr[maxIndex][key]) {
                maxIndex = j;
            }
        }

        // Swap the found maximum with the current position
        if (maxIndex !== i) {
            swap(arr, i, maxIndex);
        }
    }

    return arr;
}
