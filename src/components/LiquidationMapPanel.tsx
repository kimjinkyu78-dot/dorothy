import { useMemo, useState } from 'react'
import { COINS, LIQUIDATION_WINDOWS } from '../config/coins'
import { ConnectionBadge } from './ConnectionBadge'
import type {
  CoinSymbol,
  LiquidationBucket,
  LiquidationEvent,
  LiquidationSummary,
  LiquidationWindow,
} from '../types'
import { useLiquidationMap } from '../hooks/useLiquidationMap'
import {
  formatPercent,
  formatQuantity,
  formatTimeShort,
  formatUsdt,
  formatUsdtCompact,
} from '../utils/formatters'

interface LiquidationMapPanelProps {
  getBinancePrice: (symbol: CoinSymbol) => number | null
}

type TableView = 'feed' | 'range'

export function LiquidationMapPanel({ getBinancePrice }: LiquidationMapPanelProps) {
  const [symbol, setSymbol] = useState<CoinSymbol>('BTC')
  const [window, setWindow] = useState<LiquidationWindow>('4h')
  const [tableView, setTableView] = useState<TableView>('feed')

  const currentPrice = getBinancePrice(symbol) ?? 0
  const { mapData, connectionState, initialLoaded, totalEvents } = useLiquidationMap(
    symbol,
    currentPrice,
    window,
  )

  const longRanges = useMemo(
    () =>
      mapData.longBuckets
        .filter((b) => currentPrice === 0 || b.priceHigh <= currentPrice)
        .slice(0, 15),
    [mapData.longBuckets, currentPrice],
  )

  const shortRanges = useMemo(
    () =>
      mapData.shortBuckets
        .filter((b) => currentPrice === 0 || b.priceLow >= currentPrice)
        .slice(0, 15),
    [mapData.shortBuckets, currentPrice],
  )

  const rangeRows = useMemo(
    () => [
      ...longRanges.map((b) => ({ side: 'long' as const, bucket: b })),
      ...shortRanges.map((b) => ({ side: 'short' as const, bucket: b })),
    ].sort((a, b) => b.bucket.usdtValue - a.bucket.usdtValue),
    [longRanges, shortRanges],
  )

  const { summary } = mapData

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">실시간 청산</h2>
          <p className="mt-1 text-sm text-slate-400">
            바이낸스 USDT-M 선물 · 실제 청산 체결 WebSocket
          </p>
          <p className="mt-2 text-xs text-slate-500">
            현재가:{' '}
            <span className="font-semibold text-amber-300">
              {currentPrice > 0 ? `$${formatUsdt(currentPrice)}` : '시세 로딩 중...'}
            </span>
            {' · '}
            누적 {totalEvents.toLocaleString('ko-KR')}건
          </p>
        </div>
        <ConnectionBadge exchange="청산 WS" state={connectionState} />
      </header>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value as CoinSymbol)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          {COINS.map((c) => (
            <option key={c.symbol} value={c.symbol}>
              {c.name} ({c.symbol})
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-2">
          {LIQUIDATION_WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindow(w)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                window === w
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {w === '1h' ? '1시간' : w === '4h' ? '4시간' : '24시간'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTableView('feed')}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tableView === 'feed'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            청산 내역
          </button>
          <button
            type="button"
            onClick={() => setTableView('range')}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tableView === 'range'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            구간별 집계
          </button>
        </div>
      </div>

      <SummaryTable summary={summary} window={window} />

      {!initialLoaded && (
        <p className="mb-4 text-sm text-slate-500">최근 청산 이력 불러오는 중...</p>
      )}

      {tableView === 'feed' ? (
        <FeedTable events={mapData.recentEvents} currentPrice={currentPrice} />
      ) : (
        <RangeTable rows={rangeRows} currentPrice={currentPrice} />
      )}

      <p className="mt-4 text-xs text-slate-500">
        실제 발생한 청산 체결 기준입니다. 추정 청산맵(OI)과 용도·수치가 다릅니다.
      </p>
    </section>
  )
}

function SummaryTable({
  summary,
  window,
}: {
  summary: LiquidationSummary
  window: LiquidationWindow
}) {
  const windowLabel = window === '1h' ? '1시간' : window === '4h' ? '4시간' : '24시간'
  const total = summary.longTotal + summary.shortTotal
  const totalCount = summary.longCount + summary.shortCount

  return (
    <div className="mb-5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900/80 text-xs text-slate-400">
          <tr>
            <th className="px-4 py-2 text-left">구분 ({windowLabel})</th>
            <th className="px-4 py-2 text-right">롱 청산</th>
            <th className="px-4 py-2 text-right">숏 청산</th>
            <th className="px-4 py-2 text-right">합계</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-slate-800">
            <td className="px-4 py-2 text-slate-400">청산 금액 (USDT)</td>
            <td className="px-4 py-2 text-right font-semibold text-rose-400">
              {formatUsdtCompact(summary.longTotal)}
            </td>
            <td className="px-4 py-2 text-right font-semibold text-emerald-400">
              {formatUsdtCompact(summary.shortTotal)}
            </td>
            <td className="px-4 py-2 text-right font-bold text-white">
              {formatUsdtCompact(total)}
            </td>
          </tr>
          <tr className="border-t border-slate-800">
            <td className="px-4 py-2 text-slate-400">청산 건수</td>
            <td className="px-4 py-2 text-right text-slate-200">
              {summary.longCount.toLocaleString('ko-KR')}건
            </td>
            <td className="px-4 py-2 text-right text-slate-200">
              {summary.shortCount.toLocaleString('ko-KR')}건
            </td>
            <td className="px-4 py-2 text-right font-medium text-slate-200">
              {totalCount.toLocaleString('ko-KR')}건
            </td>
          </tr>
          <tr className="border-t border-slate-800">
            <td className="px-4 py-2 text-slate-400">최대 구간</td>
            <td className="px-4 py-2 text-right text-xs text-slate-300">
              {summary.largestLongBucket
                ? `${formatUsdtCompact(summary.largestLongBucket.usdtValue)} · ${formatPriceRange(summary.largestLongBucket)}`
                : '-'}
            </td>
            <td className="px-4 py-2 text-right text-xs text-slate-300">
              {summary.largestShortBucket
                ? `${formatUsdtCompact(summary.largestShortBucket.usdtValue)} · ${formatPriceRange(summary.largestShortBucket)}`
                : '-'}
            </td>
            <td className="px-4 py-2 text-right text-slate-500">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function FeedTable({
  events,
  currentPrice,
}: {
  events: LiquidationEvent[]
  currentPrice: number
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900/80 text-xs text-slate-400">
          <tr>
            <th className="px-4 py-2 text-left">시간</th>
            <th className="px-4 py-2 text-left">방향</th>
            <th className="px-4 py-2 text-right">청산가 (USDT)</th>
            <th className="px-4 py-2 text-right">수량</th>
            <th className="px-4 py-2 text-right">금액 (USDT)</th>
            <th className="px-4 py-2 text-right">현재가 대비</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                아직 수집된 청산이 없습니다. WebSocket 연결 후 실시간으로 표시됩니다.
              </td>
            </tr>
          ) : (
            events.map((event) => {
              const distance =
                currentPrice > 0
                  ? ((event.price - currentPrice) / currentPrice) * 100
                  : null

              return (
                <tr key={event.id} className="border-t border-slate-800 hover:bg-slate-900/50">
                  <td className="px-4 py-2 text-slate-400">{formatTimeShort(event.timestamp)}</td>
                  <td
                    className={`px-4 py-2 font-medium ${event.side === 'long' ? 'text-rose-400' : 'text-emerald-400'}`}
                  >
                    {event.side === 'long' ? '롱' : '숏'}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-200">${formatUsdt(event.price)}</td>
                  <td className="px-4 py-2 text-right text-slate-300">
                    {formatQuantity(event.quantity, 6)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-white">
                    {formatUsdtCompact(event.usdtValue)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-400">
                    {distance != null ? formatPercent(distance) : '-'}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

function RangeTable({
  rows,
  currentPrice,
}: {
  rows: { side: 'long' | 'short'; bucket: LiquidationBucket }[]
  currentPrice: number
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900/80 text-xs text-slate-400">
          <tr>
            <th className="px-4 py-2 text-left">방향</th>
            <th className="px-4 py-2 text-left">가격 구간 (USDT)</th>
            <th className="px-4 py-2 text-right">청산 금액</th>
            <th className="px-4 py-2 text-right">건수</th>
            <th className="px-4 py-2 text-right">현재가 대비</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                선택한 기간에 해당하는 구간 데이터가 없습니다.
              </td>
            </tr>
          ) : (
            rows.map(({ side, bucket }) => (
              <tr
                key={`${side}-${bucket.priceLow}-${bucket.priceHigh}`}
                className="border-t border-slate-800 hover:bg-slate-900/50"
              >
                <td
                  className={`px-4 py-2 font-medium ${side === 'long' ? 'text-rose-400' : 'text-emerald-400'}`}
                >
                  {side === 'long' ? '롱' : '숏'}
                </td>
                <td className="px-4 py-2 text-slate-200">{formatPriceRange(bucket)}</td>
                <td className="px-4 py-2 text-right font-semibold text-white">
                  {formatUsdtCompact(bucket.usdtValue)}
                </td>
                <td className="px-4 py-2 text-right text-slate-300">{bucket.count}</td>
                <td className="px-4 py-2 text-right text-slate-400">
                  {formatPercent(bucket.distancePercent)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {currentPrice > 0 && rows.length > 0 && (
        <p className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
          기준 현재가 ${formatUsdt(currentPrice)} · 금액 내림차순 정렬
        </p>
      )}
    </div>
  )
}

function formatPriceRange(bucket: LiquidationBucket): string {
  return `$${formatUsdt(bucket.priceLow)} ~ $${formatUsdt(bucket.priceHigh)}`
}
