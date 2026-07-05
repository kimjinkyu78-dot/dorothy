import type { CoinConfig, CoinSymbol } from '../types'

export const COINS: CoinConfig[] = [
  { symbol: 'BTC', name: '비트코인', upbitMarket: 'KRW-BTC', binanceSymbol: 'BTCUSDT' },
  { symbol: 'ETH', name: '이더리움', upbitMarket: 'KRW-ETH', binanceSymbol: 'ETHUSDT' },
  { symbol: 'SOL', name: '솔라나', upbitMarket: 'KRW-SOL', binanceSymbol: 'SOLUSDT' },
  { symbol: 'XRP', name: '리플', upbitMarket: 'KRW-XRP', binanceSymbol: 'XRPUSDT' },
  { symbol: 'DOGE', name: '도지코인', upbitMarket: 'KRW-DOGE', binanceSymbol: 'DOGEUSDT' },
]

export const UPBIT_MARKETS = COINS.map((c) => c.upbitMarket)
export const BINANCE_SYMBOLS = COINS.map((c) => c.binanceSymbol)

export const POLL_INTERVAL_MS = 8000
export const DEFAULT_FEE_RATE = 0.0005
export const BINANCE_DEFAULT_FEE_RATE = 0.001

/** 가격 구간 버킷 크기 (USDT) */
export const LIQUIDATION_BUCKET_SIZE: Record<CoinSymbol, number> = {
  BTC: 500,
  ETH: 25,
  SOL: 1,
  XRP: 0.005,
  DOGE: 0.0005,
}

/** OI 추정 청산맵: 유지증거금률 */
export const ESTIMATED_MMR = 0.005

/** OI 추정 청산맵: 레버리지별 OI 가중치 (합 ≈ 1) */
export const LEVERAGE_ESTIMATES: { leverage: number; weight: number }[] = [
  { leverage: 5, weight: 0.08 },
  { leverage: 10, weight: 0.18 },
  { leverage: 20, weight: 0.22 },
  { leverage: 25, weight: 0.14 },
  { leverage: 50, weight: 0.18 },
  { leverage: 75, weight: 0.1 },
  { leverage: 100, weight: 0.07 },
  { leverage: 125, weight: 0.03 },
]

/** OI 추정 청산맵: 진입가 분포 (현재가 대비 오프셋) */
export const ENTRY_OFFSET_ESTIMATES: { offset: number; weight: number }[] = [
  { offset: 0, weight: 0.35 },
  { offset: 0.02, weight: 0.25 },
  { offset: 0.05, weight: 0.2 },
  { offset: 0.08, weight: 0.12 },
  { offset: 0.12, weight: 0.08 },
]

export const OI_POLL_INTERVAL_MS = 30_000
