export type CoinSymbol = 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'DOGE'

export type OhlcPeriod = '24h' | '7d' | '30d'

export type ConnectionState = 'connected' | 'delayed' | 'error'

export type PositionSide = 'long' | 'short'

export interface CoinConfig {
  symbol: CoinSymbol
  name: string
  upbitMarket: string
  binanceSymbol: string
}

export interface TickerData {
  price: number
  changeRate24h: number
  volume24h?: number
  updatedAt: number
}

export interface OhlcSummary {
  high: number
  low: number
  close: number
}

export interface CoinMarketData {
  symbol: CoinSymbol
  upbit: TickerData | null
  binance: TickerData | null
  upbitOhlc: OhlcSummary | null
  binanceOhlc: OhlcSummary | null
}

export interface ExchangeStatus {
  upbit: ConnectionState
  binance: ConnectionState
  lastUpdated: number | null
}

export type LiquidationWindow = '1h' | '4h' | '24h'

export type LiquidationSide = 'long' | 'short'

export interface LiquidationEvent {
  id: string
  symbol: CoinSymbol
  side: LiquidationSide
  price: number
  quantity: number
  usdtValue: number
  timestamp: number
}

export interface LiquidationBucket {
  priceLow: number
  priceHigh: number
  usdtValue: number
  count: number
  distancePercent: number
}

export interface LiquidationSummary {
  longTotal: number
  shortTotal: number
  longCount: number
  shortCount: number
  largestLongBucket: LiquidationBucket | null
  largestShortBucket: LiquidationBucket | null
}

export interface LiquidationMapData {
  longBuckets: LiquidationBucket[]
  shortBuckets: LiquidationBucket[]
  summary: LiquidationSummary
  recentEvents: LiquidationEvent[]
}

export interface OiSnapshot {
  symbol: CoinSymbol
  openInterest: number
  markPrice: number
  oiUsdt: number
  longRatio: number
  shortRatio: number
  longOiUsdt: number
  shortOiUsdt: number
  updatedAt: number
}

export interface EstimatedLiquidationSummary {
  longTotal: number
  shortTotal: number
  largestLongBucket: LiquidationBucket | null
  largestShortBucket: LiquidationBucket | null
  nearestLongCluster: LiquidationBucket | null
  nearestShortCluster: LiquidationBucket | null
}

export interface EstimatedLiquidationMapData {
  longBuckets: LiquidationBucket[]
  shortBuckets: LiquidationBucket[]
  summary: EstimatedLiquidationSummary
  oiSnapshot: OiSnapshot | null
}

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
