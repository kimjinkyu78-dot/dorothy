import {
  ENTRY_OFFSET_ESTIMATES,
  ESTIMATED_MMR,
  LEVERAGE_ESTIMATES,
  LIQUIDATION_BUCKET_SIZE,
} from '../config/coins'
import type {
  EstimatedLiquidationMapData,
  EstimatedLiquidationSummary,
  LiquidationBucket,
  OiSnapshot,
} from '../types'
import { getBucketBounds } from './liquidationBuckets'

export function calcLongLiquidationPrice(
  entryPrice: number,
  leverage: number,
  mmr = ESTIMATED_MMR,
): number {
  return entryPrice * (1 - 1 / leverage + mmr)
}

export function calcShortLiquidationPrice(
  entryPrice: number,
  leverage: number,
  mmr = ESTIMATED_MMR,
): number {
  return entryPrice * (1 + 1 / leverage - mmr)
}

function addToBucket(
  map: Map<string, LiquidationBucket>,
  price: number,
  usdtValue: number,
  bucketSize: number,
  currentPrice: number,
): void {
  if (usdtValue <= 0 || price <= 0) return

  const { priceLow, priceHigh } = getBucketBounds(price, bucketSize)
  const key = `${priceLow}-${priceHigh}`
  const midPrice = (priceLow + priceHigh) / 2
  const distancePercent =
    currentPrice > 0 ? ((midPrice - currentPrice) / currentPrice) * 100 : 0

  const existing = map.get(key)
  if (existing) {
    existing.usdtValue += usdtValue
    existing.count += 1
  } else {
    map.set(key, {
      priceLow,
      priceHigh,
      usdtValue,
      count: 1,
      distancePercent,
    })
  }
}

export function buildEstimatedLiquidationMap(
  oiSnapshot: OiSnapshot | null,
  currentPrice: number,
): EstimatedLiquidationMapData {
  if (!oiSnapshot || currentPrice <= 0) {
    return emptyMap()
  }

  const bucketSize = LIQUIDATION_BUCKET_SIZE[oiSnapshot.symbol]
  const markPrice = oiSnapshot.markPrice || currentPrice
  const longMap = new Map<string, LiquidationBucket>()
  const shortMap = new Map<string, LiquidationBucket>()

  for (const entry of ENTRY_OFFSET_ESTIMATES) {
    for (const lev of LEVERAGE_ESTIMATES) {
      const sliceWeight = entry.weight * lev.weight

      const longEntry = markPrice * (1 - entry.offset)
      const longLiq = calcLongLiquidationPrice(longEntry, lev.leverage)
      const longSlice = oiSnapshot.longOiUsdt * sliceWeight
      addToBucket(longMap, longLiq, longSlice, bucketSize, currentPrice)

      const shortEntry = markPrice * (1 + entry.offset)
      const shortLiq = calcShortLiquidationPrice(shortEntry, lev.leverage)
      const shortSlice = oiSnapshot.shortOiUsdt * sliceWeight
      addToBucket(shortMap, shortLiq, shortSlice, bucketSize, currentPrice)
    }
  }

  const longBuckets = [...longMap.values()].sort((a, b) => b.usdtValue - a.usdtValue)
  const shortBuckets = [...shortMap.values()].sort((a, b) => b.usdtValue - a.usdtValue)

  return {
    longBuckets,
    shortBuckets,
    summary: buildEstimatedSummary(longBuckets, shortBuckets, currentPrice),
    oiSnapshot,
  }
}

function buildEstimatedSummary(
  longBuckets: LiquidationBucket[],
  shortBuckets: LiquidationBucket[],
  currentPrice: number,
): EstimatedLiquidationSummary {
  const longBelow = longBuckets.filter((b) => b.priceHigh <= currentPrice)
  const shortAbove = shortBuckets.filter((b) => b.priceLow >= currentPrice)

  let longTotal = 0
  let shortTotal = 0
  for (const bucket of longBelow) longTotal += bucket.usdtValue
  for (const bucket of shortAbove) shortTotal += bucket.usdtValue

  const nearestLongCluster =
    [...longBelow].sort((a, b) => b.priceHigh - a.priceHigh)[0] ?? null

  const nearestShortCluster =
    [...shortAbove].sort((a, b) => a.priceLow - b.priceLow)[0] ?? null

  return {
    longTotal,
    shortTotal,
    largestLongBucket: longBelow[0] ?? null,
    largestShortBucket: shortAbove[0] ?? null,
    nearestLongCluster,
    nearestShortCluster,
  }
}

function emptyMap(): EstimatedLiquidationMapData {
  return {
    longBuckets: [],
    shortBuckets: [],
    summary: {
      longTotal: 0,
      shortTotal: 0,
      largestLongBucket: null,
      largestShortBucket: null,
      nearestLongCluster: null,
      nearestShortCluster: null,
    },
    oiSnapshot: null,
  }
}

export function filterBucketsBySide(
  buckets: LiquidationBucket[],
  side: 'long' | 'short',
  currentPrice: number,
): LiquidationBucket[] {
  if (side === 'long') {
    return buckets.filter((b) => b.priceHigh <= currentPrice)
  }
  return buckets.filter((b) => b.priceLow >= currentPrice)
}
