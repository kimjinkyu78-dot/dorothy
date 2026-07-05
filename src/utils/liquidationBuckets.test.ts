import { describe, expect, it } from 'vitest'
import {
  aggregateLiquidationMap,
  getBucketBounds,
  parseBinanceLiquidationSide,
} from '../utils/liquidationBuckets'
import type { LiquidationEvent } from '../types'

function makeEvent(
  overrides: Partial<LiquidationEvent> & Pick<LiquidationEvent, 'side' | 'price' | 'usdtValue'>,
): LiquidationEvent {
  return {
    id: `${overrides.price}-${overrides.side}-${Math.random()}`,
    symbol: 'BTC',
    quantity: 1,
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('liquidationBuckets', () => {
  it('바이낸스 SELL은 롱 청산으로 파싱한다', () => {
    expect(parseBinanceLiquidationSide('SELL')).toBe('long')
    expect(parseBinanceLiquidationSide('BUY')).toBe('short')
  })

  it('가격 구간 버킷 경계를 계산한다', () => {
    expect(getBucketBounds(90123, 500)).toEqual({ priceLow: 90000, priceHigh: 90500 })
  })

  it('청산 이벤트를 가격 구간별로 집계한다', () => {
    const now = Date.now()
    const events: LiquidationEvent[] = [
      makeEvent({ side: 'long', price: 89000, usdtValue: 100_000, timestamp: now }),
      makeEvent({ side: 'long', price: 89200, usdtValue: 50_000, timestamp: now }),
      makeEvent({ side: 'short', price: 91000, usdtValue: 80_000, timestamp: now }),
    ]

    const map = aggregateLiquidationMap(events, 'BTC', 90000, '24h')

    expect(map.summary.longTotal).toBe(150_000)
    expect(map.summary.shortTotal).toBe(80_000)
    expect(map.longBuckets.length).toBeGreaterThan(0)
    expect(map.shortBuckets.length).toBeGreaterThan(0)
  })
})
