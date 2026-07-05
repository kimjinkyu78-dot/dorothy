import { useState } from 'react'
import { CoinComparisonTable } from './components/CoinComparisonTable'
import { EstimatedLiquidationMapPanel } from './components/EstimatedLiquidationMapPanel'
import { DcaCalculator } from './components/DcaCalculator'
import { Header } from './components/Header'
import { PeriodTabs } from './components/PeriodTabs'
import { SectionNav } from './components/SectionNav'
import { useCoinPrices } from './hooks/useCoinPrices'
import { useExchangeRate } from './hooks/useExchangeRate'
import type { OhlcPeriod } from './types'

function App() {
  const [period, setPeriod] = useState<OhlcPeriod>('24h')
  const { usdtKrwRate } = useExchangeRate()
  const { marketData, status, ohlcLoading, fetchError, refresh, getBinancePrice } =
    useCoinPrices(period)

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
      <Header status={status} usdtKrwRate={usdtKrwRate} onRefresh={refresh} />

      <SectionNav />

      {fetchError && (
        <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
          {fetchError}
        </div>
      )}

      <section id="prices" className="scroll-mt-20">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">메이저 5코인 시세</h2>
            <p className="text-xs text-slate-500">바이낸스 USDT 기준 · 업비트·김프 참고</p>
          </div>
          <PeriodTabs value={period} onChange={setPeriod} loading={ohlcLoading} />
        </div>

        <CoinComparisonTable
          marketData={marketData}
          usdtKrwRate={usdtKrwRate}
          period={period}
        />
      </section>

      <section id="estimated-liq" className="scroll-mt-20 mt-10">
        <EstimatedLiquidationMapPanel getBinancePrice={getBinancePrice} />
      </section>

      <section id="dca" className="scroll-mt-20 mt-10">
        <DcaCalculator getBinancePrice={getBinancePrice} />
      </section>

      <footer className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
        본 프로그램은 정보 제공 및 계산 목적이며, 투자 판단과 그 결과에 대한 책임은 사용자에게
        있습니다.
      </footer>
    </div>
  )
}

export default App
