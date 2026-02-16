export function mergeSort(arr, key) {
    if (arr.length <= 1) return arr;

    const mid = Math.floor(arr.length / 2);

    const left = [];
    for (let i = 0; i < mid; i++) {
        left[left.length] = arr[i];
    }

    const right = [];
    for (let i = mid; i < arr.length; i++) {
        right[right.length] = arr[i];
    }

    const sortedLeft = mergeSort(left, key);
    const sortedRight = mergeSort(right, key);

    return merge(sortedLeft, sortedRight, key);
}

export function merge(left, right, key) {
    const result = [];
    let i = 0;
    let j = 0;

    while (i < left.length && j < right.length) {
        if (left[i][key] <= right[j][key]) {
            result[result.length] = left[i];
            i++;
        } else {
            result[result.length] = right[j];
            j++;
        }
    }

    while (i < left.length) {
        result[result.length] = left[i];
        i++;
    }

    while (j < right.length) {
        result[result.length] = right[j];
        j++;
    }

    return result;
}