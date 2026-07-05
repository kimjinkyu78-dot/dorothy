import { useCallback, useEffect, useState } from 'react'
import { fetchBinanceTickers } from '../api/binance'
import { fetchUpbitTickers, fetchUpbitUsdtRate } from '../api/upbit'
import { POLL_INTERVAL_MS } from '../config/coins'

export function useExchangeRate() {
  const [usdtKrwRate, setUsdtKrwRate] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const rate = await fetchUpbitUsdtRate()
      if (rate > 0) {
        setUsdtKrwRate(rate)
        setError(null)
      }
    } catch {
      setError('USDT/KRW 환율 조회 실패')
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  return { usdtKrwRate, error, refresh }
}

export function useInitialTickers() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      await Promise.all([fetchUpbitTickers(), fetchBinanceTickers()])
      setLoading(false)
      return true
    } catch {
      setError('초기 시세 로드 실패')
      setLoading(false)
      return false
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { loading, error, reload: load }
}
