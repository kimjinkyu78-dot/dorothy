import { describe, expect, it } from 'vitest'
import {
  buildEstimatedLiquidationMap,
  calcLongLiquidationPrice,
  calcShortLiquidationPrice,
} from '../utils/estimatedLiquidationMap'
import type { OiSnapshot } from '../types'

const sampleOi: OiSnapshot = {
  symbol: 'BTC',
  openInterest: 100_000,
  markPrice: 90_000,
  oiUsdt: 9_000_000_000,
  longRatio: 0.55,
  shortRatio: 0.45,
  longOiUsdt: 4_950_000_000,
  shortOiUsdt: 4_050_000_000,
  updatedAt: Date.now(),
}

describe('estimatedLiquidationMap', () => {
  it('롱 청산가는 진입가보다 낮다', () => {
    const liq = calcLongLiquidationPrice(90_000, 10)
    expect(liq).toBeLessThan(90_000)
    expect(liq).toBeCloseTo(81_450, 0)
  })

  it('숏 청산가는 진입가보다 높다', () => {
    const liq = calcShortLiquidationPrice(90_000, 10)
    expect(liq).toBeGreaterThan(90_000)
    expect(liq).toBeCloseTo(98_550, 0)
  })

  it('OI 스냅샷으로 롱/숏 청산 구간을 생성한다', () => {
    const map = buildEstimatedLiquidationMap(sampleOi, 90_000)

    expect(map.longBuckets.length).toBeGreaterThan(0)
    expect(map.shortBuckets.length).toBeGreaterThan(0)
    expect(map.summary.longTotal).toBeGreaterThan(0)
    expect(map.summary.shortTotal).toBeGreaterThan(0)
    expect(map.summary.nearestLongCluster).not.toBeNull()
    expect(map.summary.nearestShortCluster).not.toBeNull()
  })

  it('OI 없으면 빈 맵을 반환한다', () => {
    const map = buildEstimatedLiquidationMap(null, 90_000)
    expect(map.longBuckets).toHaveLength(0)
    expect(map.shortBuckets).toHaveLength(0)
  })
})
