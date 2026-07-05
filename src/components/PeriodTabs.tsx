import type { OhlcPeriod } from '../types'

const PERIODS: { value: OhlcPeriod; label: string }[] = [
  { value: '24h', label: '24시간' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
]

interface PeriodTabsProps {
  value: OhlcPeriod
  onChange: (period: OhlcPeriod) => void
  loading?: boolean
}

export function PeriodTabs({ value, onChange, loading }: PeriodTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-400">과거 구간</span>
      {PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          onClick={() => onChange(period.value)}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            value === period.value
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {period.label}
        </button>
      ))}
      {loading && <span className="text-xs text-slate-500">로딩 중...</span>}
    </div>
  )
}
