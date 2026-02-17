function computeMean(values) {
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum = sum + values[i];
  }
  return sum / values.length;
}

function computeStdDev(values, mean) {
  let sumSquaredDiff = 0;
  for (let i = 0; i < values.length; i++) {
    const diff = values[i] - mean;
    sumSquaredDiff = sumSquaredDiff + diff * diff;
  }
  const variance = sumSquaredDiff / values.length;
  return Math.sqrt(variance);
}

module.exports = { computeMean, computeStdDev };
