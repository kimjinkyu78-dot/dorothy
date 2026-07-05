import { useState } from 'react'
import { COINS } from '../config/coins'
import { ConnectionBadge } from './ConnectionBadge'
import type { CoinSymbol, EstimatedLiquidationSummary, LiquidationBucket, OiSnapshot } from '../types'
import { useEstimatedLiquidationMap } from '../hooks/useEstimatedLiquidationMap'
import { filterBucketsBySide } from '../utils/estimatedLiquidationMap'
import { bucketIntensityPercent } from '../utils/liquidationBuckets'
import {
  formatDateTime,
  formatPercent,
  formatUsdt,
  formatUsdtCompact,
} from '../utils/formatters'

interface EstimatedLiquidationMapPanelProps {
  getBinancePrice: (symbol: CoinSymbol) => number | null
}

export function EstimatedLiquidationMapPanel({
  getBinancePrice,
}: EstimatedLiquidationMapPanelProps) {
  const [symbol, setSymbol] = useState<CoinSymbol>('BTC')
  const currentPrice = getBinancePrice(symbol) ?? 0
  const { mapData, connectionState, error, refresh } = useEstimatedLiquidationMap(
    symbol,
    currentPrice,
  )

  const longBuckets = filterBucketsBySide(mapData.longBuckets, 'long', currentPrice)
  const shortBuckets = filterBucketsBySide(mapData.shortBuckets, 'short', currentPrice)

  const maxBucketValue = Math.max(
    longBuckets[0]?.usdtValue ?? 0,
    shortBuckets[0]?.usdtValue ?? 0,
  )

  const oi = mapData.oiSnapshot

  return (
    <section className="rounded-2xl border border-violet-900/50 bg-slate-900/70 p-5">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">추정 청산맵 (OI 기반)</h2>
          <p className="mt-1 text-sm text-slate-400">
            미결제약정(OI) · 롱/숏 비율 · 레버리지 분포 모델로 청산 밀집 구간 추정
          </p>
          <p className="mt-2 text-xs text-slate-500">
            현재가:{' '}
            <span className="font-semibold text-violet-300">
              {currentPrice > 0 ? `$${formatUsdt(currentPrice)}` : '시세 로딩 중...'}
            </span>
            {oi && (
              <>
                {' · '}
                OI {formatUsdtCompact(oi.oiUsdt)} · 롱 {(oi.longRatio * 100).toFixed(1)}% / 숏{' '}
                {(oi.shortRatio * 100).toFixed(1)}%
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectionBadge exchange="OI API" state={connectionState} />
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm text-white hover:bg-violet-600"
          >
            OI 새로고침
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="mb-4">
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
      </div>

      {oi && <OiMetaCards oi={oi} />}

      <SummaryCards summary={mapData.summary} />

      <div className="grid gap-6 lg:grid-cols-2">
        <BucketTable
          title="롱 청산 추정 (현재가 아래)"
          subtitle="가격 하락 시 터질 가능성 있는 롱 포지션 구간"
          buckets={longBuckets.slice(0, 10)}
          maxValue={maxBucketValue}
          accentClass="bg-rose-500"
          emptyMessage="아래 구간 추정 데이터 없음"
        />
        <BucketTable
          title="숏 청산 추정 (현재가 위)"
          subtitle="가격 상승 시 터질 가능성 있는 숏 포지션 구간"
          buckets={shortBuckets.slice(0, 10)}
          maxValue={maxBucketValue}
          accentClass="bg-emerald-500"
          emptyMessage="위 구간 추정 데이터 없음"
        />
      </div>

      <LeverageLegend />

      <p className="mt-4 text-xs text-slate-500">
        OI·탑트레이더 롱/숏 포지션 비율과 레버리지/진입가 분포를 가정한 추정치입니다. CoinGlass 등
        상용 청산맵과 모델 차이로 수치가 다를 수 있으며, 30초마다 갱신됩니다.
        {oi && ` 마지막 OI 갱신: ${formatDateTime(oi.updatedAt)}`}
      </p>
    </section>
  )
}

function OiMetaCards({ oi }: { oi: OiSnapshot }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetaCard label="총 OI (USDT)" value={formatUsdtCompact(oi.oiUsdt)} />
      <MetaCard
        label="롱 OI 추정"
        value={formatUsdtCompact(oi.longOiUsdt)}
        sub={`${(oi.longRatio * 100).toFixed(1)}%`}
      />
      <MetaCard
        label="숏 OI 추정"
        value={formatUsdtCompact(oi.shortOiUsdt)}
        sub={`${(oi.shortRatio * 100).toFixed(1)}%`}
      />
      <MetaCard
        label="마크 가격"
        value={`$${formatUsdt(oi.markPrice)}`}
        sub={formatDateTime(oi.updatedAt)}
      />
    </div>
  )
}

function MetaCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-violet-900/30 bg-slate-950/60 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-violet-200">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function SummaryCards({ summary }: { summary: EstimatedLiquidationSummary }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        label="롱 청산 추정 합계 (아래)"
        value={formatUsdtCompact(summary.longTotal)}
        valueClass="text-rose-400"
      />
      <SummaryCard
        label="숏 청산 추정 합계 (위)"
        value={formatUsdtCompact(summary.shortTotal)}
        valueClass="text-emerald-400"
      />
      <SummaryCard
        label="가장 가까운 롱 청산 벽"
        value={
          summary.nearestLongCluster
            ? formatUsdtCompact(summary.nearestLongCluster.usdtValue)
            : '-'
        }
        sub={
          summary.nearestLongCluster
            ? formatPriceRange(summary.nearestLongCluster)
            : '-'
        }
      />
      <SummaryCard
        label="가장 가까운 숏 청산 벽"
        value={
          summary.nearestShortCluster
            ? formatUsdtCompact(summary.nearestShortCluster.usdtValue)
            : '-'
        }
        sub={
          summary.nearestShortCluster
            ? formatPriceRange(summary.nearestShortCluster)
            : '-'
        }
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub = '',
  valueClass = 'text-white',
}: {
  label: string
  value: string
  sub?: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function BucketTable({
  title,
  subtitle,
  buckets,
  maxValue,
  accentClass,
  emptyMessage,
}: {
  title: string
  subtitle: string
  buckets: LiquidationBucket[]
  maxValue: number
  accentClass: string
  emptyMessage: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mb-3 text-xs text-slate-500">{subtitle}</p>

      {buckets.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-slate-400">
              <tr>
                <th className="pb-2 text-left">가격 구간 (USDT)</th>
                <th className="pb-2 text-right">추정 OI</th>
                <th className="pb-2 text-right">현재가 대비</th>
                <th className="pb-2 text-left">밀도</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => {
                const intensity = bucketIntensityPercent(bucket.usdtValue, maxValue)
                return (
                  <tr key={`${bucket.priceLow}-${bucket.priceHigh}`} className="border-t border-slate-800">
                    <td className="py-2 font-medium text-slate-200">
                      {formatPriceRange(bucket)}
                    </td>
                    <td className="py-2 text-right font-semibold text-white">
                      {formatUsdtCompact(bucket.usdtValue)}
                    </td>
                    <td className="py-2 text-right text-slate-400">
                      {formatPercent(bucket.distancePercent)}
                    </td>
                    <td className="py-2">
                      <div className="h-2 w-full min-w-16 rounded-full bg-slate-800">
                        <div
                          className={`h-2 rounded-full ${accentClass}`}
                          style={{ width: `${intensity}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LeverageLegend() {
  return (
    <div className="mt-6 rounded-xl border border-violet-900/30 bg-slate-950/40 p-4">
      <h3 className="mb-2 text-sm font-semibold text-violet-200">추정 모델 가정</h3>
      <ul className="grid gap-1 text-xs text-slate-400 sm:grid-cols-2">
        <li>· OI를 탑트레이더 롱/숏 포지션 비율로 분배</li>
        <li>· 레버리지: 5x~125x (10x·20x·50x 비중 높음)</li>
        <li>· 진입가: 현재가 ±0~12% 구간 분포 가정</li>
        <li>· 유지증거금률: 0.5% · 격리 마진 기준 간이 계산</li>
      </ul>
    </div>
  )
}

function formatPriceRange(bucket: LiquidationBucket): string {
  return `$${formatUsdt(bucket.priceLow)} ~ $${formatUsdt(bucket.priceHigh)}`
}
