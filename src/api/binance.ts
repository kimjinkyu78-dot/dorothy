import { BINANCE_SYMBOLS } from '../config/coins'
import type { OhlcPeriod, TickerData } from '../types'

const BINANCE_BASE = 'https://api.binance.com/api/v3'

interface BinanceTickerResponse {
  symbol: string
  lastPrice: string
  priceChangePercent: string
  quoteVolume: string
  closeTime: number
}

async function fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return (await response.json()) as T
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }

  throw lastError
}

export async function fetchBinanceTickers(): Promise<Map<string, TickerData>> {
  const symbols = JSON.stringify(BINANCE_SYMBOLS)
  const data = await fetchWithRetry<BinanceTickerResponse[]>(
    `${BINANCE_BASE}/ticker/24hr?symbols=${encodeURIComponent(symbols)}`,
  )

  const map = new Map<string, TickerData>()
  for (const item of data) {
    map.set(item.symbol, {
      price: Number(item.lastPrice),
      changeRate24h: Number(item.priceChangePercent),
      volume24h: Number(item.quoteVolume),
      updatedAt: item.closeTime,
    })
  }
  return map
}

function periodToKlineParams(period: OhlcPeriod): { interval: string; limit: number } {
  switch (period) {
    case '24h':
      return { interval: '1h', limit: 24 }
    case '7d':
      return { interval: '1d', limit: 7 }
    case '30d':
      return { interval: '1d', limit: 30 }
  }
}

export async function fetchBinanceOhlc(
  symbol: string,
  period: OhlcPeriod,
): Promise<{ high: number; low: number; close: number }> {
  const { interval, limit } = periodToKlineParams(period)
  const url = `${BINANCE_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  const klines = await fetchWithRetry<(string | number)[][]>(url)

  if (klines.length === 0) {
    throw new Error('캔들 데이터 없음')
  }

  const highs = klines.map((k) => Number(k[2]))
  const lows = klines.map((k) => Number(k[3]))
  const close = Number(klines[klines.length - 1][4])

  return {
    high: Math.max(...highs),
    low: Math.min(...lows),
    close,
  }
}

export function connectBinanceWebSocket(
  onTicker: (symbol: string, data: TickerData) => void,
  onStatus: (connected: boolean) => void,
): () => void {
  let ws: WebSocket | null = null
  let closed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const streams = BINANCE_SYMBOLS.map((s) => `${s.toLowerCase()}@ticker`).join('/')
  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`

  const connect = () => {
    if (closed) return

    ws = new WebSocket(url)

    ws.onopen = () => onStatus(true)

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as {
          data?: {
            s: string
            c: string
            P: string
            q: string
            E: number
          }
        }
        const ticker = message.data
        if (!ticker) return

        onTicker(ticker.s, {
          price: Number(ticker.c),
          changeRate24h: Number(ticker.P),
          volume24h: Number(ticker.q),
          updatedAt: ticker.E,
        })
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => onStatus(false)

    ws.onclose = () => {
      onStatus(false)
      if (!closed) {
        reconnectTimer = setTimeout(connect, 3000)
      }
    }
  }

  connect()

  return () => {
    closed = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    ws?.close()
  }
}
