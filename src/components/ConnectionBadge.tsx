import type { ConnectionState } from '../types'

const LABELS: Record<ConnectionState, string> = {
  connected: '정상',
  delayed: '지연',
  error: '오류',
}

const COLORS: Record<ConnectionState, string> = {
  connected: 'bg-emerald-500',
  delayed: 'bg-amber-500',
  error: 'bg-rose-500',
}

interface ConnectionBadgeProps {
  exchange: string
  state: ConnectionState
}

export function ConnectionBadge({ exchange, state }: ConnectionBadgeProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs">
      <span className={`h-2 w-2 rounded-full ${COLORS[state]}`} />
      <span className="text-slate-300">{exchange}</span>
      <span className="font-medium text-slate-100">{LABELS[state]}</span>
    </div>
  )
}
