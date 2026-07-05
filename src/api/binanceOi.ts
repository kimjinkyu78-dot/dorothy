import { COINS } from '../config/coins'
import type { CoinSymbol, OiSnapshot } from '../types'

const FAPI = 'https://fapi.binance.com'

interface OpenInterestResponse {
  symbol: string
  openInterest: string
  time: number
}

interface PremiumIndexResponse {
  symbol: string
  markPrice: string
  indexPrice: string
  lastFundingRate: string
  time: number
}

interface LongShortRatioRow {
  symbol: string
  longShortRatio: string
  longAccount: string
  shortAccount: string
  timestamp: number
}

async function fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return (await response.json()) as T
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
    }
  }

  throw lastError
}

export async function fetchOpenInterest(binanceSymbol: string): Promise<OpenInterestResponse> {
  return fetchWithRetry<OpenInterestResponse>(
    `${FAPI}/fapi/v1/openInterest?symbol=${binanceSymbol}`,
  )
}

export async function fetchPremiumIndex(binanceSymbol: string): Promise<PremiumIndexResponse> {
  return fetchWithRetry<PremiumIndexResponse>(
    `${FAPI}/fapi/v1/premiumIndex?symbol=${binanceSymbol}`,
  )
}

export async function fetchLongShortPositionRatio(
  binanceSymbol: string,
): Promise<LongShortRatioRow | null> {
  const rows = await fetchWithRetry<LongShortRatioRow[]>(
    `${FAPI}/futures/data/topLongShortPositionRatio?symbol=${binanceSymbol}&period=5m&limit=1`,
  )
  return rows[0] ?? null
}

export async function fetchOiSnapshot(symbol: CoinSymbol): Promise<OiSnapshot> {
  const coin = COINS.find((c) => c.symbol === symbol)!
  const [oi, premium, ratio] = await Promise.all([
    fetchOpenInterest(coin.binanceSymbol),
    fetchPremiumIndex(coin.binanceSymbol),
    fetchLongShortPositionRatio(coin.binanceSymbol),
  ])

  const openInterest = Number(oi.openInterest)
  const markPrice = Number(premium.markPrice)
  const oiUsdt = openInterest * markPrice

  const longRatio = ratio ? Number(ratio.longAccount) : 0.5
  const shortRatio = ratio ? Number(ratio.shortAccount) : 0.5
  const totalRatio = longRatio + shortRatio || 1

  return {
    symbol,
    openInterest,
    markPrice,
    oiUsdt,
    longRatio: longRatio / totalRatio,
    shortRatio: shortRatio / totalRatio,
    longOiUsdt: oiUsdt * (longRatio / totalRatio),
    shortOiUsdt: oiUsdt * (shortRatio / totalRatio),
    updatedAt: Date.now(),
  }
}

export async function fetchAllOiSnapshots(): Promise<Map<CoinSymbol, OiSnapshot>> {
  const snapshots = await Promise.all(COINS.map((coin) => fetchOiSnapshot(coin.symbol)))
  return new Map(snapshots.map((s) => [s.symbol, s]))
}
