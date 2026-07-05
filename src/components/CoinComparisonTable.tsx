import { COINS } from '../config/coins'
import type { CoinMarketData, OhlcPeriod } from '../types'
import {
  calcKimchiPremium,
  changeColorClass,
  formatKrw,
  formatPercent,
  formatUsdt,
} from '../utils/formatters'

interface CoinComparisonTableProps {
  marketData: CoinMarketData[]
  usdtKrwRate: number
  period: OhlcPeriod
}

function OhlcCell({
  ohlc,
  formatter,
}: {
  ohlc: { high: number; low: number; close: number } | null
  formatter: (v: number) => string
}) {
  if (!ohlc) return <span className="text-slate-500">-</span>

  return (
    <div className="space-y-0.5 text-xs leading-tight">
      <div>
        <span className="text-slate-500">고 </span>
        <span className="text-slate-200">{formatter(ohlc.high)}</span>
      </div>
      <div>
        <span className="text-slate-500">저 </span>
        <span className="text-slate-200">{formatter(ohlc.low)}</span>
      </div>
      <div>
        <span className="text-slate-500">종 </span>
        <span className="text-slate-200">{formatter(ohlc.close)}</span>
      </div>
    </div>
  )
}

export function CoinComparisonTable({
  marketData,
  usdtKrwRate,
  period,
}: CoinComparisonTableProps) {
  const periodLabel = period === '24h' ? '24h' : period === '7d' ? '7d' : '30d'

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/90 text-xs text-slate-400">
            <th className="sticky left-0 z-10 bg-slate-900/95 px-3 py-2.5 text-left backdrop-blur">
              코인
            </th>
            <th className="px-3 py-2.5 text-right text-amber-400" colSpan={4}>
              바이낸스 (기준)
            </th>
            <th className="px-3 py-2.5 text-right">김프</th>
            <th className="px-3 py-2.5 text-right text-slate-500" colSpan={3}>
              업비트 (참고)
            </th>
          </tr>
          <tr className="border-b border-slate-800 bg-slate-900/70 text-[11px] text-slate-500">
            <th className="sticky left-0 z-10 bg-slate-900/95 px-3 py-1.5 text-left backdrop-blur" />
            <th className="px-3 py-1.5 text-right text-amber-300/90">USDT</th>
            <th className="px-3 py-1.5 text-right">KRW환산</th>
            <th className="px-3 py-1.5 text-right">24h</th>
            <th className="px-3 py-1.5 text-right">{periodLabel} OHLC</th>
            <th className="px-3 py-1.5 text-right">%</th>
            <th className="px-3 py-1.5 text-right">KRW</th>
            <th className="px-3 py-1.5 text-right">24h</th>
            <th className="px-3 py-1.5 text-right">{periodLabel} OHLC</th>
          </tr>
        </thead>
        <tbody>
          {marketData.map((item) => {
            const coin = COINS.find((c) => c.symbol === item.symbol)!
            const binanceKrw =
              item.binance && usdtKrwRate > 0 ? item.binance.price * usdtKrwRate : null
            const premium =
              item.upbit && binanceKrw
                ? calcKimchiPremium(item.upbit.price, binanceKrw)
                : null

            return (
              <tr
                key={item.symbol}
                className="border-b border-slate-800/80 last:border-0 hover:bg-slate-900/40"
              >
                <td className="sticky left-0 z-10 bg-slate-950/95 px-3 py-3 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-900/40 text-xs font-bold text-amber-200">
                      {item.symbol.slice(0, 3)}
                    </span>
                    <div>
                      <p className="font-semibold text-white">{coin.name}</p>
                      <p className="text-xs text-slate-500">{item.symbol}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-base font-bold text-amber-100">
                  {item.binance ? `$${formatUsdt(item.binance.price)}` : '-'}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-white">
                  {binanceKrw != null ? `${formatKrw(binanceKrw)}원` : '-'}
                </td>
                <td
                  className={`px-3 py-3 text-right font-semibold ${item.binance ? changeColorClass(item.binance.changeRate24h) : 'text-slate-500'}`}
                >
                  {item.binance ? formatPercent(item.binance.changeRate24h) : '-'}
                </td>
                <td className="px-3 py-3 text-right">
                  <OhlcCell
                    ohlc={item.binanceOhlc}
                    formatter={(v) => `$${formatUsdt(v)}`}
                  />
                </td>
                <td
                  className={`px-3 py-3 text-right font-bold ${premium != null ? changeColorClass(premium) : 'text-slate-500'}`}
                >
                  {premium != null ? formatPercent(premium) : '-'}
                </td>
                <td className="px-3 py-3 text-right text-slate-400">
                  {item.upbit ? `${formatKrw(item.upbit.price)}원` : '-'}
                </td>
                <td
                  className={`px-3 py-3 text-right text-slate-400 ${item.upbit ? changeColorClass(item.upbit.changeRate24h) : ''}`}
                >
                  {item.upbit ? formatPercent(item.upbit.changeRate24h) : '-'}
                </td>
                <td className="px-3 py-3 text-right opacity-80">
                  <OhlcCell ohlc={item.upbitOhlc} formatter={formatKrw} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
