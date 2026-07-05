import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  connectLiquidationWebSocket,
  fetchAllRecentLiquidations,
} from '../api/binanceLiquidations'
import type { CoinSymbol, ConnectionState, LiquidationEvent, LiquidationWindow } from '../types'
import { aggregateLiquidationMap, getWindowMs } from '../utils/liquidationBuckets'

const MAX_RETENTION_MS = getWindowMs('24h')

export function useLiquidationMap(
  symbol: CoinSymbol,
  currentPrice: number,
  window: LiquidationWindow,
) {
  const eventsRef = useRef<LiquidationEvent[]>([])
  const [eventVersion, setEventVersion] = useState(0)
  const [connectionState, setConnectionState] = useState<ConnectionState>('error')
  const [initialLoaded, setInitialLoaded] = useState(false)

  const addEvent = useCallback((event: LiquidationEvent) => {
    eventsRef.current = [event, ...eventsRef.current].slice(0, 5000)
    setEventVersion((v) => v + 1)
  }, [])

  const mergeEvents = useCallback((incoming: LiquidationEvent[]) => {
    const map = new Map<string, LiquidationEvent>()
    for (const event of [...incoming, ...eventsRef.current]) {
      map.set(event.id, event)
    }
    eventsRef.current = [...map.values()].sort((a, b) => b.timestamp - a.timestamp)
    setEventVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    fetchAllRecentLiquidations()
      .then((events) => {
        if (events.length > 0) mergeEvents(events)
      })
      .finally(() => setInitialLoaded(true))
  }, [mergeEvents])

  useEffect(() => {
    const disconnect = connectLiquidationWebSocket(addEvent, (connected) => {
      setConnectionState(connected ? 'connected' : 'delayed')
    })
    return disconnect
  }, [addEvent])

  useEffect(() => {
    const timer = setInterval(() => {
      const cutoff = Date.now() - MAX_RETENTION_MS
      const before = eventsRef.current.length
      eventsRef.current = eventsRef.current.filter((e) => e.timestamp >= cutoff)
      if (eventsRef.current.length !== before) {
        setEventVersion((v) => v + 1)
      }
    }, 60_000)
    return () => clearInterval(timer)
  }, [])

  const mapData = useMemo(() => {
    void eventVersion
    return aggregateLiquidationMap(eventsRef.current, symbol, currentPrice, window)
  }, [eventVersion, symbol, currentPrice, window])

  const totalEvents = useMemo(() => {
    void eventVersion
    return eventsRef.current.filter((e) => e.symbol === symbol).length
  }, [eventVersion, symbol])

  return {
    mapData,
    connectionState,
    initialLoaded,
    totalEvents,
  }
}
