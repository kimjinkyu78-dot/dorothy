import { useMemo, useState } from 'react'
import { BINANCE_DEFAULT_FEE_RATE, COINS } from '../config/coins'
import type { CoinSymbol, PositionSide } from '../types'
import { calcPositionProfitRate, calculateDca } from '../utils/dcaCalculations'
import {
  changeColorClass,
  formatPercent,
  formatQuantity,
  formatUsdt,
} from '../utils/formatters'

type InputMode = 'margin' | 'quantity'

interface DcaCalculatorProps {
  getBinancePrice: (symbol: CoinSymbol) => number | null
}

export function DcaCalculator({ getBinancePrice }: DcaCalculatorProps) {
  const [symbol, setSymbol] = useState<CoinSymbol>('BTC')
  const [positionSide, setPositionSide] = useState<PositionSide>('long')
  const [leverage, setLeverage] = useState('10')
  const [existingQuantity, setExistingQuantity] = useState('0.1')
  const [existingAveragePrice, setExistingAveragePrice] = useState('95000')
  const [inputMode, setInputMode] = useState<InputMode>('margin')
  const [additionalMargin, setAdditionalMargin] = useState('500')
  const [additionalQuantity, setAdditionalQuantity] = useState('0.05')
  const [entryPrice, setEntryPrice] = useState('88000')
  const [currentPrice, setCurrentPrice] = useState('90000')

  const leverageNum = Number(leverage)

  const positionProfit = useMemo(() => {
    const avg = Number(existingAveragePrice)
    const current = Number(currentPrice)
    return calcPositionProfitRate(positionSide, avg, current, leverageNum)
  }, [positionSide, existingAveragePrice, currentPrice, leverageNum])

  const result = useMemo(() => {
    try {
      const qty = Number(existingQuantity)
      const avg = Number(existingAveragePrice)
      const price = Number(entryPrice)
      const current = Number(currentPrice)
      const lev = Number(leverage)

      if (
        [qty, avg, price, current, lev].some((v) => !Number.isFinite(v) || v < 0) ||
        lev < 1
      ) {
        return null
      }

      return calculateDca({
        existingQuantity: qty,
        existingAveragePrice: avg,
        buyPrice: price,
        feeRate: BINANCE_DEFAULT_FEE_RATE,
        currentPrice: current,
        positionSide,
        leverage: lev,
        ...(inputMode === 'margin'
          ? { additionalAmount: Number(additionalMargin) }
          : { additionalQuantity: Number(additionalQuantity) }),
      })
    } catch {
      return null
    }
  }, [
    existingQuantity,
    existingAveragePrice,
    inputMode,
    additionalMargin,
    additionalQuantity,
    entryPrice,
    currentPrice,
    positionSide,
    leverage,
  ])

  const fillFromBinance = () => {
    const price = getBinancePrice(symbol)
    if (price) {
      const formatted = price.toFixed(2)
      setEntryPrice(formatted)
      setCurrentPrice(formatted)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <header className="mb-5">
        <h2 className="text-xl font-bold text-white">선물 물타기 계산기</h2>
        <p className="mt-1 text-sm text-slate-400">
          바이낸스 USDT-M 선물 기준 · 롱/숏 · 레버리지 반영
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPositionSide('long')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            positionSide === 'long'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          롱 (Long)
        </button>
        <button
          type="button"
          onClick={() => setPositionSide('short')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            positionSide === 'short'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          숏 (Short)
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-400">코인 선택</span>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value as CoinSymbol)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          >
            {COINS.map((coin) => (
              <option key={coin.symbol} value={coin.symbol}>
                {coin.name} ({coin.symbol})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-400">레버리지 (배)</span>
          <input
            type="number"
            min="1"
            max="125"
            step="1"
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-400">수익률 (가격 변동)</span>
          <div
            className={`rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-medium ${
              positionProfit ? changeColorClass(positionProfit.priceRate) : 'text-slate-500'
            }`}
          >
            {positionProfit ? formatPercent(positionProfit.priceRate) : '-'}
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-400">ROE (증거금 대비)</span>
          <div
            className={`rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-medium ${
              positionProfit ? changeColorClass(positionProfit.roe) : 'text-slate-500'
            }`}
          >
            {positionProfit ? formatPercent(positionProfit.roe) : '-'}
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-400">기존 포지션 수량</span>
          <input
            type="number"
            step="any"
            value={existingQuantity}
            onChange={(e) => setExistingQuantity(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-400">기존 평균 진입가 (USDT)</span>
          <input
            type="number"
            step="0.01"
            value={existingAveragePrice}
            onChange={(e) => setExistingAveragePrice(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>

        <div className="md:col-span-2">
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInputMode('margin')}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                inputMode === 'margin'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              추가 증거금
            </button>
            <button
              type="button"
              onClick={() => setInputMode('quantity')}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                inputMode === 'quantity'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              추가 포지션 수량
            </button>
          </div>

          {inputMode === 'margin' ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-400">추가 증거금 (USDT)</span>
              <input
                type="number"
                step="0.01"
                value={additionalMargin}
                onChange={(e) => setAdditionalMargin(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-400">추가 포지션 수량</span>
              <input
                type="number"
                step="any"
                value={additionalQuantity}
                onChange={(e) => setAdditionalQuantity(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-400">물타기 진입가 (USDT)</span>
          <input
            type="number"
            step="0.01"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-400">현재가 (USDT)</span>
          <input
            type="number"
            step="0.01"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={fillFromBinance}
        className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
      >
        현재 바이낸스 시세로 채우기
      </button>

      {result && (
        <div className="mt-6">
          <p className="mb-3 text-xs text-slate-500">
            {positionSide === 'long' ? '롱' : '숏'} · {leverage}배 · 유지증거금률 0.5% 가정
          </p>
          <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <ResultItem
              label="추가 포지션 수량"
              value={formatQuantity(result.additionalQuantity)}
            />
            <ResultItem
              label="추가 증거금"
              value={`$${formatUsdt(result.additionalMargin)}`}
            />
            <ResultItem
              label="새 평균 진입가"
              value={`$${formatUsdt(result.newAveragePrice)}`}
            />
            <ResultItem label="총 포지션 수량" value={formatQuantity(result.totalQuantity)} />
            <ResultItem label="총 증거금" value={`$${formatUsdt(result.totalMargin)}`} />
            <ResultItem
              label="예상 청산가"
              value={`$${formatUsdt(result.liquidationPrice)}`}
              valueClass="text-rose-300"
            />
            <ResultItem
              label="미실현 손익"
              value={`$${formatUsdt(result.unrealizedPnl)} (${formatPercent(result.priceChangeRate)})`}
              valueClass={changeColorClass(result.unrealizedPnl)}
            />
            <ResultItem
              label="ROE"
              value={formatPercent(result.roe)}
              valueClass={changeColorClass(result.roe)}
            />
          </div>
        </div>
      )}
    </section>
  )
}

function ResultItem({
  label,
  value,
  valueClass = 'text-white',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  )
}
