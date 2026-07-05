import { UPBIT_MARKETS } from '../config/coins'
import type { OhlcPeriod, TickerData } from '../types'

const UPBIT_BASE = 'https://api.upbit.com/v1'

interface UpbitTickerResponse {
  market: string
  trade_price: number
  signed_change_rate: number
  acc_trade_price_24h: number
  timestamp: number
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

export async function fetchUpbitTickers(): Promise<Map<string, TickerData>> {
  const markets = UPBIT_MARKETS.join(',')
  const data = await fetchWithRetry<UpbitTickerResponse[]>(
    `${UPBIT_BASE}/ticker?markets=${markets}`,
  )

  const map = new Map<string, TickerData>()
  for (const item of data) {
    map.set(item.market, {
      price: item.trade_price,
      changeRate24h: item.signed_change_rate * 100,
      volume24h: item.acc_trade_price_24h,
      updatedAt: item.timestamp,
    })
  }
  return map
}

export async function fetchUpbitUsdtRate(): Promise<number> {
  const data = await fetchWithRetry<UpbitTickerResponse[]>(
    `${UPBIT_BASE}/ticker?markets=KRW-USDT`,
  )
  return data[0]?.trade_price ?? 0
}

interface UpbitCandle {
  high_price: number
  low_price: number
  trade_price: number
}

export async function fetchUpbitOhlc(
  market: string,
  period: OhlcPeriod,
): Promise<{ high: number; low: number; close: number }> {
  let url: string

  switch (period) {
    case '24h':
      url = `${UPBIT_BASE}/candles/minutes/60?market=${market}&count=24`
      break
    case '7d':
      url = `${UPBIT_BASE}/candles/days?market=${market}&count=7`
      break
    case '30d':
      url = `${UPBIT_BASE}/candles/days?market=${market}&count=30`
      break
  }

  const candles = await fetchWithRetry<UpbitCandle[]>(url)
  if (candles.length === 0) {
    throw new Error('캔들 데이터 없음')
  }

  const high = Math.max(...candles.map((c) => c.high_price))
  const low = Math.min(...candles.map((c) => c.low_price))
  const close = candles[0].trade_price

  return { high, low, close }
}

export function connectUpbitWebSocket(
  onTicker: (market: string, data: TickerData) => void,
  onStatus: (connected: boolean) => void,
): () => void {
  let ws: WebSocket | null = null
  let closed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const connect = () => {
    if (closed) return

    ws = new WebSocket('wss://api.upbit.com/websocket/v1')
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      onStatus(true)
      const payload = JSON.stringify([
        { ticket: `dashboard-${Date.now()}` },
        { type: 'ticker', codes: UPBIT_MARKETS },
      ])
      ws?.send(payload)
    }

    ws.onmessage = (event) => {
      try {
        const buffer = event.data instanceof ArrayBuffer ? event.data : null
        const text = buffer
          ? new TextDecoder('utf-8').decode(buffer)
          : String(event.data)
        const parsed = JSON.parse(text) as UpbitTickerResponse & { type?: string }

        if (parsed.market && parsed.trade_price != null) {
          onTicker(parsed.market, {
            price: parsed.trade_price,
            changeRate24h: parsed.signed_change_rate * 100,
            volume24h: parsed.acc_trade_price_24h,
            updatedAt: parsed.timestamp ?? Date.now(),
          })
        }
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
