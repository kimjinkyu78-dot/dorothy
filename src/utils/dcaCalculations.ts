export type PositionSide = 'long' | 'short'

export interface DcaInput {
  existingQuantity: number
  existingAveragePrice: number
  additionalAmount?: number
  additionalQuantity?: number
  buyPrice: number
  feeRate: number
  currentPrice: number
  positionSide: PositionSide
  leverage: number
  maintenanceMarginRate?: number
}

export interface DcaResult {
  additionalQuantity: number
  additionalMargin: number
  newAveragePrice: number
  totalQuantity: number
  totalNotional: number
  totalMargin: number
  breakEvenPrice: number
  liquidationPrice: number
  unrealizedPnl: number
  priceChangeRate: number
  roe: number
}

export function calcPositionProfitRate(
  side: PositionSide,
  averagePrice: number,
  currentPrice: number,
  leverage: number,
): { priceRate: number; roe: number } | null {
  if (
    !Number.isFinite(averagePrice) ||
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(leverage) ||
    averagePrice <= 0 ||
    leverage < 1
  ) {
    return null
  }

  const priceRate =
    side === 'long'
      ? ((currentPrice - averagePrice) / averagePrice) * 100
      : ((averagePrice - currentPrice) / averagePrice) * 100

  return { priceRate, roe: priceRate * leverage }
}

function calcLiquidationPrice(
  side: PositionSide,
  averagePrice: number,
  leverage: number,
  maintenanceMarginRate: number,
): number {
  if (side === 'long') {
    return averagePrice * (1 + maintenanceMarginRate - 1 / leverage)
  }
  return averagePrice * (1 + 1 / leverage - maintenanceMarginRate)
}

function calcBreakEvenPrice(
  side: PositionSide,
  averagePrice: number,
  feeRate: number,
): number {
  if (side === 'long') {
    return averagePrice * ((1 + feeRate) / (1 - feeRate))
  }
  return averagePrice * ((1 - feeRate) / (1 + feeRate))
}

export function calculateDca(input: DcaInput): DcaResult {
  const {
    existingQuantity,
    existingAveragePrice,
    buyPrice,
    feeRate,
    currentPrice,
    positionSide,
    leverage,
    maintenanceMarginRate = 0.005,
  } = input

  if (
    existingQuantity < 0 ||
    existingAveragePrice < 0 ||
    buyPrice <= 0 ||
    currentPrice <= 0 ||
    leverage < 1
  ) {
    throw new Error('유효하지 않은 입력값입니다.')
  }

  let additionalQuantity: number
  let additionalMargin: number

  if (input.additionalQuantity != null && input.additionalQuantity > 0) {
    additionalQuantity = input.additionalQuantity * (1 - feeRate)
    additionalMargin = (additionalQuantity * buyPrice) / leverage
  } else if (input.additionalAmount != null && input.additionalAmount > 0) {
    additionalMargin = input.additionalAmount
    const notional = additionalMargin * leverage
    additionalQuantity = (notional / buyPrice) * (1 - feeRate)
  } else {
    additionalQuantity = 0
    additionalMargin = 0
  }

  const existingNotional = existingQuantity * existingAveragePrice
  const additionalNotional = additionalQuantity * buyPrice
  const totalQuantity = existingQuantity + additionalQuantity
  const totalNotional = existingNotional + additionalNotional
  const totalMargin = totalNotional / leverage

  const newAveragePrice = totalQuantity > 0 ? totalNotional / totalQuantity : 0

  const priceDiff =
    positionSide === 'long'
      ? currentPrice - newAveragePrice
      : newAveragePrice - currentPrice

  const unrealizedPnl = totalQuantity * priceDiff
  const priceChangeRate =
    newAveragePrice > 0 ? (priceDiff / newAveragePrice) * 100 : 0
  const roe = totalMargin > 0 ? (unrealizedPnl / totalMargin) * 100 : 0

  return {
    additionalQuantity,
    additionalMargin,
    newAveragePrice,
    totalQuantity,
    totalNotional,
    totalMargin,
    breakEvenPrice: calcBreakEvenPrice(positionSide, newAveragePrice, feeRate),
    liquidationPrice: calcLiquidationPrice(
      positionSide,
      newAveragePrice,
      leverage,
      maintenanceMarginRate,
    ),
    unrealizedPnl,
    priceChangeRate,
    roe,
  }
}
