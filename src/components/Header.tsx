import { ConnectionBadge } from './ConnectionBadge'
import type { ExchangeStatus } from '../types'
import { formatDateTime, formatKrw } from '../utils/formatters'

interface HeaderProps {
  status: ExchangeStatus
  usdtKrwRate: number
  onRefresh: () => void
}

export function Header({ status, usdtKrwRate, onRefresh }: HeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">코인 시세 대시보드</h1>
        <p className="mt-1 text-sm text-slate-400">
          바이낸스 · 업비트 메이저 5코인 실시간 비교
        </p>
        <p className="mt-2 text-xs text-slate-500">
          마지막 갱신: {formatDateTime(status.lastUpdated)}
        </p>
      </div>

      <div className="flex flex-col items-start gap-3 lg:items-end">
        <div className="flex flex-wrap gap-2">
          <ConnectionBadge exchange="업비트" state={status.upbit} />
          <ConnectionBadge exchange="바이낸스" state={status.binance} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-300">
            USDT/KRW:{' '}
            <span className="font-semibold text-white">
              {usdtKrwRate > 0 ? `${formatKrw(usdtKrwRate)}원` : '-'}
            </span>
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            새로고침
          </button>
        </div>
      </div>
    </header>
  )
}
