import { useCallback, useEffect, useRef, useState } from 'react'
import { connectBinanceWebSocket, fetchBinanceTickers } from '../api/binance'
import { connectUpbitWebSocket, fetchUpbitTickers } from '../api/upbit'
import { COINS, POLL_INTERVAL_MS } from '../config/coins'
import type {
  CoinMarketData,
  CoinSymbol,
  ConnectionState,
  ExchangeStatus,
  OhlcPeriod,
  OhlcSummary,
  TickerData,
} from '../types'
import { fetchBinanceOhlc } from '../api/binance'
import { fetchUpbitOhlc } from '../api/upbit'

function createEmptyMarketData(): CoinMarketData[] {
  return COINS.map((coin) => ({
    symbol: coin.symbol,
    upbit: null,
    binance: null,
    upbitOhlc: null,
    binanceOhlc: null,
  }))
}

function deriveStatus(
  wsConnected: boolean,
  lastSuccess: number | null,
  hasError: boolean,
): ConnectionState {
  if (hasError && !lastSuccess) return 'error'
  if (!wsConnected && lastSuccess && Date.now() - lastSuccess > POLL_INTERVAL_MS * 2) {
    return 'delayed'
  }
  if (wsConnected || lastSuccess) return 'connected'
  return 'error'
}

export function useCoinPrices(period: OhlcPeriod) {
  const [marketData, setMarketData] = useState<CoinMarketData[]>(createEmptyMarketData)
  const [status, setStatus] = useState<ExchangeStatus>({
    upbit: 'error',
    binance: 'error',
    lastUpdated: null,
  })
  const [ohlcLoading, setOhlcLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const upbitWsConnected = useRef(false)
  const binanceWsConnected = useRef(false)
  const upbitLastSuccess = useRef<number | null>(null)
  const binanceLastSuccess = useRef<number | null>(null)
  const upbitHasError = useRef(false)
  const binanceHasError = useRef(false)

  const updateStatus = useCallback(() => {
    setStatus({
      upbit: deriveStatus(
        upbitWsConnected.current,
        upbitLastSuccess.current,
        upbitHasError.current,
      ),
      binance: deriveStatus(
        binanceWsConnected.current,
        binanceLastSuccess.current,
        binanceHasError.current,
      ),
      lastUpdated: Math.max(
        upbitLastSuccess.current ?? 0,
        binanceLastSuccess.current ?? 0,
      ) || null,
    })
  }, [])

  const applyUpbitTickers = useCallback(
    (tickers: Map<string, TickerData>) => {
      upbitLastSuccess.current = Date.now()
      upbitHasError.current = false
      setMarketData((prev) =>
        prev.map((item) => {
          const coin = COINS.find((c) => c.symbol === item.symbol)!
          const ticker = tickers.get(coin.upbitMarket)
          return ticker ? { ...item, upbit: ticker } : item
        }),
      )
      updateStatus()
    },
    [updateStatus],
  )

  const applyBinanceTickers = useCallback(
    (tickers: Map<string, TickerData>) => {
      binanceLastSuccess.current = Date.now()
      binanceHasError.current = false
      setMarketData((prev) =>
        prev.map((item) => {
          const coin = COINS.find((c) => c.symbol === item.symbol)!
          const ticker = tickers.get(coin.binanceSymbol)
          return ticker ? { ...item, binance: ticker } : item
        }),
      )
      updateStatus()
    },
    [updateStatus],
  )

  const pollTickers = useCallback(async () => {
    try {
      const [upbit, binance] = await Promise.all([
        fetchUpbitTickers(),
        fetchBinanceTickers(),
      ])
      applyUpbitTickers(upbit)
      applyBinanceTickers(binance)
      setFetchError(null)
    } catch {
      upbitHasError.current = true
      binanceHasError.current = true
      setFetchError('시세 갱신 실패 — 잠시 후 재시도합니다.')
      updateStatus()
    }
  }, [applyUpbitTickers, applyBinanceTickers, updateStatus])

  const loadOhlc = useCallback(async () => {
    setOhlcLoading(true)
    try {
      const results = await Promise.all(
        COINS.map(async (coin) => {
          const [upbitOhlc, binanceOhlc] = await Promise.all([
            fetchUpbitOhlc(coin.upbitMarket, period),
            fetchBinanceOhlc(coin.binanceSymbol, period),
          ])
          return {
            symbol: coin.symbol,
            upbitOhlc: upbitOhlc as OhlcSummary,
            binanceOhlc: binanceOhlc as OhlcSummary,
          }
        }),
      )

      setMarketData((prev) =>
        prev.map((item) => {
          const found = results.find((r) => r.symbol === item.symbol)
          return found
            ? {
                ...item,
                upbitOhlc: found.upbitOhlc,
                binanceOhlc: found.binanceOhlc,
              }
            : item
        }),
      )
    } catch {
      setFetchError('과거 시세(OHLC) 조회 실패')
    } finally {
      setOhlcLoading(false)
    }
  }, [period])

  useEffect(() => {
    pollTickers()
    const pollTimer = setInterval(pollTickers, POLL_INTERVAL_MS)

    const disconnectUpbit = connectUpbitWebSocket(
      (market, ticker) => {
        upbitWsConnected.current = true
        upbitLastSuccess.current = Date.now()
        setMarketData((prev) =>
          prev.map((item) => {
            const coin = COINS.find((c) => c.symbol === item.symbol)
            if (coin?.upbitMarket === market) {
              return { ...item, upbit: ticker }
            }
            return item
          }),
        )
        updateStatus()
      },
      (connected) => {
        upbitWsConnected.current = connected
        updateStatus()
      },
    )

    const disconnectBinance = connectBinanceWebSocket(
      (symbol, ticker) => {
        binanceWsConnected.current = true
        binanceLastSuccess.current = Date.now()
        setMarketData((prev) =>
          prev.map((item) => {
            const coin = COINS.find((c) => c.symbol === item.symbol)
            if (coin?.binanceSymbol === symbol) {
              return { ...item, binance: ticker }
            }
            return item
          }),
        )
        updateStatus()
      },
      (connected) => {
        binanceWsConnected.current = connected
        updateStatus()
      },
    )

    return () => {
      clearInterval(pollTimer)
      disconnectUpbit()
      disconnectBinance()
    }
  }, [pollTickers, updateStatus])

  useEffect(() => {
    loadOhlc()
  }, [loadOhlc])

  const getUpbitPrice = useCallback(
    (symbol: CoinSymbol): number | null => {
      const item = marketData.find((d) => d.symbol === symbol)
      return item?.upbit?.price ?? null
    },
    [marketData],
  )

  const getBinancePrice = useCallback(
    (symbol: CoinSymbol): number | null => {
      const item = marketData.find((d) => d.symbol === symbol)
      return item?.binance?.price ?? null
    },
    [marketData],
  )

  return {
    marketData,
    status,
    ohlcLoading,
    fetchError,
    refresh: pollTickers,
    getUpbitPrice,
    getBinancePrice,
  }
}
