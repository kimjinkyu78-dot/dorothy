import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAllOiSnapshots } from '../api/binanceOi'
import { OI_POLL_INTERVAL_MS } from '../config/coins'
import type { CoinSymbol, ConnectionState, OiSnapshot } from '../types'
import { buildEstimatedLiquidationMap } from '../utils/estimatedLiquidationMap'

export function useEstimatedLiquidationMap(symbol: CoinSymbol, currentPrice: number) {
  const [oiBySymbol, setOiBySymbol] = useState<Map<CoinSymbol, OiSnapshot>>(new Map())
  const [connectionState, setConnectionState] = useState<ConnectionState>('error')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const snapshots = await fetchAllOiSnapshots()
      setOiBySymbol(snapshots)
      setConnectionState('connected')
      setError(null)
    } catch {
      setConnectionState('error')
      setError('OI 데이터 조회 실패')
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, OI_POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const oiSnapshot = oiBySymbol.get(symbol) ?? null

  const mapData = useMemo(
    () => buildEstimatedLiquidationMap(oiSnapshot, currentPrice),
    [oiSnapshot, currentPrice],
  )

  return { mapData, connectionState, error, refresh }
}
