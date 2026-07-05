import { describe, expect, it } from 'vitest'
import { calcPositionProfitRate, calculateDca } from '../utils/dcaCalculations'

describe('calculateDca', () => {
  it('롱 포지션: 증거금으로 물타기 후 평균 진입가를 계산한다', () => {
    const result = calculateDca({
      existingQuantity: 0.1,
      existingAveragePrice: 95_000,
      additionalAmount: 500,
      buyPrice: 88_000,
      feeRate: 0.001,
      currentPrice: 90_000,
      positionSide: 'long',
      leverage: 10,
    })

    expect(result.additionalQuantity).toBeCloseTo(0.056761, 3)
    expect(result.totalQuantity).toBeCloseTo(0.156761, 3)
    expect(result.totalNotional).toBeCloseTo(14_495, 0)
    expect(result.totalMargin).toBeCloseTo(1449.5, 0)
    expect(result.newAveragePrice).toBeCloseTo(92465, 0)
    expect(result.unrealizedPnl).toBeCloseTo(-386, 0)
    expect(result.liquidationPrice).toBeLessThan(result.newAveragePrice)
  })

  it('숏 포지션: 가격 상승 시 미실현 손실을 계산한다', () => {
    const result = calculateDca({
      existingQuantity: 0.1,
      existingAveragePrice: 90_000,
      additionalQuantity: 0.05,
      buyPrice: 92_000,
      feeRate: 0,
      currentPrice: 95_000,
      positionSide: 'short',
      leverage: 10,
    })

    expect(result.newAveragePrice).toBeCloseTo(90666.67, 1)
    expect(result.unrealizedPnl).toBeLessThan(0)
    expect(result.liquidationPrice).toBeGreaterThan(result.newAveragePrice)
  })

  it('추가 포지션 수량 입력 모드를 지원한다', () => {
    const result = calculateDca({
      existingQuantity: 1,
      existingAveragePrice: 1000,
      additionalQuantity: 2,
      buyPrice: 800,
      feeRate: 0,
      currentPrice: 900,
      positionSide: 'long',
      leverage: 5,
    })

    expect(result.totalQuantity).toBe(3)
    expect(result.totalNotional).toBe(2600)
    expect(result.totalMargin).toBe(520)
    expect(result.newAveragePrice).toBeCloseTo(866.67, 1)
  })

  it('유효하지 않은 입력에 에러를 던진다', () => {
    expect(() =>
      calculateDca({
        existingQuantity: -1,
        existingAveragePrice: 1000,
        additionalAmount: 1000,
        buyPrice: 1000,
        feeRate: 0.001,
        currentPrice: 1000,
        positionSide: 'long',
        leverage: 10,
      }),
    ).toThrow()
  })
})

describe('calcPositionProfitRate', () => {
  it('롱 포지션 ROE를 레버리지로 배수한다', () => {
    const result = calcPositionProfitRate('long', 100, 105, 10)
    expect(result?.priceRate).toBeCloseTo(5, 1)
    expect(result?.roe).toBeCloseTo(50, 1)
  })

  it('숏 포지션은 가격 하락 시 수익으로 계산한다', () => {
    const result = calcPositionProfitRate('short', 100, 95, 10)
    expect(result?.priceRate).toBeCloseTo(5, 1)
    expect(result?.roe).toBeCloseTo(50, 1)
  })
})
