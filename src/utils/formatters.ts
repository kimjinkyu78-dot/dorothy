export function formatKrw(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '-'
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatUsdt(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '-'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatUsdtCompact(value: number): string {
  if (!Number.isFinite(value)) return '-'
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${formatUsdt(value, 2)}`
}

export function formatTimeShort(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '-'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatQuantity(value: number, decimals = 8): string {
  if (!Number.isFinite(value)) return '-'
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

export function calcKimchiPremium(upbitKrw: number, binanceKrw: number): number | null {
  if (!Number.isFinite(upbitKrw) || !Number.isFinite(binanceKrw) || binanceKrw <= 0) {
    return null
  }
  return ((upbitKrw - binanceKrw) / binanceKrw) * 100
}

export function formatDateTime(timestamp: number | null): string {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('ko-KR')
}

export function changeColorClass(value: number): string {
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-rose-400'
  return 'text-slate-400'
}
