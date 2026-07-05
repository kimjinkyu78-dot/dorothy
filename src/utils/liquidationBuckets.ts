import type { CoinSymbol } from '../types'
import { LIQUIDATION_BUCKET_SIZE } from '../config/coins'
import type {
  LiquidationBucket,
  LiquidationEvent,
  LiquidationMapData,
  LiquidationSummary,
  LiquidationWindow,
} from '../types'

const WINDOW_MS: Record<LiquidationWindow, number> = {
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
}

export function getWindowMs(window: LiquidationWindow): number {
  return WINDOW_MS[window]
}

export function getBucketBounds(
  price: number,
  bucketSize: number,
): { priceLow: number; priceHigh: number } {
  const priceLow = Math.floor(price / bucketSize) * bucketSize
  return { priceLow, priceHigh: priceLow + bucketSize }
}

export function parseBinanceLiquidationSide(orderSide: string): 'long' | 'short' {
  // SELL force order = long liquidation, BUY = short liquidation
  return orderSide === 'SELL' ? 'long' : 'short'
}

export function aggregateLiquidationMap(
  events: LiquidationEvent[],
  symbol: CoinSymbol,
  currentPrice: number,
  window: LiquidationWindow,
): LiquidationMapData {
  const now = Date.now()
  const cutoff = now - getWindowMs(window)
  const bucketSize = LIQUIDATION_BUCKET_SIZE[symbol]

  const filtered = events.filter(
    (e) => e.symbol === symbol && e.timestamp >= cutoff,
  )

  const longMap = new Map<string, LiquidationBucket>()
  const shortMap = new Map<string, LiquidationBucket>()

  for (const event of filtered) {
    const targetMap = event.side === 'long' ? longMap : shortMap
    const { priceLow, priceHigh } = getBucketBounds(event.price, bucketSize)
    const key = `${priceLow}-${priceHigh}`

    const midPrice = (priceLow + priceHigh) / 2
    const distancePercent =
      currentPrice > 0 ? ((midPrice - currentPrice) / currentPrice) * 100 : 0

    const existing = targetMap.get(key)
    if (existing) {
      existing.usdtValue += event.usdtValue
      existing.count += 1
    } else {
      targetMap.set(key, {
        priceLow,
        priceHigh,
        usdtValue: event.usdtValue,
        count: 1,
        distancePercent,
      })
    }
  }

  const longBuckets = [...longMap.values()].sort((a, b) => b.usdtValue - a.usdtValue)

  const shortBuckets = [...shortMap.values()].sort((a, b) => b.usdtValue - a.usdtValue)

  const summary = buildSummary(filtered, longBuckets, shortBuckets)
  const recentEvents = [...filtered].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30)

  return { longBuckets, shortBuckets, summary, recentEvents }
}

function buildSummary(
  events: LiquidationEvent[],
  longBuckets: LiquidationBucket[],
  shortBuckets: LiquidationBucket[],
): LiquidationSummary {
  let longTotal = 0
  let shortTotal = 0
  let longCount = 0
  let shortCount = 0

  for (const event of events) {
    if (event.side === 'long') {
      longTotal += event.usdtValue
      longCount += 1
    } else {
      shortTotal += event.usdtValue
      shortCount += 1
    }
  }

  return {
    longTotal,
    shortTotal,
    longCount,
    shortCount,
    largestLongBucket: longBuckets[0] ?? null,
    largestShortBucket: shortBuckets[0] ?? null,
  }
}

export function bucketIntensityPercent(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0
  return Math.min(100, (value / maxValue) * 100)
}
