export function getBucketBounds(
  price: number,
  bucketSize: number,
): { priceLow: number; priceHigh: number } {
  const priceLow = Math.floor(price / bucketSize) * bucketSize
  return { priceLow, priceHigh: priceLow + bucketSize }
}

export function bucketIntensityPercent(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0
  return Math.min(100, (value / maxValue) * 100)
}
