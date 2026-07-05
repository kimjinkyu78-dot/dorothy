import { COINS } from '../config/coins'
import type { LiquidationEvent } from '../types'
import { parseBinanceLiquidationSide } from '../utils/liquidationBuckets'

const FUTURES_WS = 'wss://fstream.binance.com/ws/!forceOrder@arr'
const BAPI_LIQUIDATION =
  'https://www.binance.com/bapi/futures/v1/public/future/liquidation/order'

const SYMBOL_TO_COIN = new Map(COINS.map((c) => [c.binanceSymbol, c.symbol]))

interface BinanceForceOrderMessage {
  e?: string
  o?: {
    s: string
    S: string
    q: string
    p: string
    ap: string
    z: string
    T: number
  }
}

interface BapiLiquidationRow {
  symbol: string
  side: string
  price: string
  origQty?: string
  qty?: string
  amount?: string
  time: number
}

interface BapiResponse {
  data?: BapiLiquidationRow[]
}

function toLiquidationEvent(
  binanceSymbol: string,
  side: string,
  price: number,
  quantity: number,
  timestamp: number,
): LiquidationEvent | null {
  const symbol = SYMBOL_TO_COIN.get(binanceSymbol)
  if (!symbol || price <= 0 || quantity <= 0) return null

  return {
    id: `${binanceSymbol}-${timestamp}-${price}-${quantity}`,
    symbol,
    side: parseBinanceLiquidationSide(side),
    price,
    quantity,
    usdtValue: price * quantity,
    timestamp,
  }
}

export function parseForceOrderMessage(raw: string): LiquidationEvent | null {
  try {
    const message = JSON.parse(raw) as BinanceForceOrderMessage
    const order = message.o
    if (!order?.s || !SYMBOL_TO_COIN.has(order.s)) return null

    const price = Number(order.ap || order.p)
    const quantity = Number(order.z || order.q)
    const timestamp = order.T || Date.now()

    return toLiquidationEvent(order.s, order.S, price, quantity, timestamp)
  } catch {
    return null
  }
}

export async function fetchRecentLiquidations(
  binanceSymbol: string,
  pageSize = 100,
): Promise<LiquidationEvent[]> {
  const url = `${BAPI_LIQUIDATION}?symbol=${binanceSymbol}&pageSize=${pageSize}`
  const response = await fetch(url)
  if (!response.ok) return []

  const json = (await response.json()) as BapiResponse
  if (!json.data?.length) return []

  return json.data
    .map((row) => {
      const price = Number(row.price)
      const quantity = Number(row.origQty ?? row.qty ?? row.amount ?? 0)
      return toLiquidationEvent(row.symbol, row.side, price, quantity, row.time)
    })
    .filter((e): e is LiquidationEvent => e != null)
}

export async function fetchAllRecentLiquidations(): Promise<LiquidationEvent[]> {
  const results = await Promise.all(
    COINS.map((coin) => fetchRecentLiquidations(coin.binanceSymbol, 100)),
  )
  return results.flat()
}

export function connectLiquidationWebSocket(
  onEvent: (event: LiquidationEvent) => void,
  onStatus: (connected: boolean) => void,
): () => void {
  let ws: WebSocket | null = null
  let closed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const connect = () => {
    if (closed) return

    ws = new WebSocket(FUTURES_WS)

    ws.onopen = () => onStatus(true)

    ws.onmessage = (event) => {
      const parsed = parseForceOrderMessage(String(event.data))
      if (parsed) onEvent(parsed)
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
