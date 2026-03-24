import { formatCurrency, formatPercent } from '@/lib/format'
import type { SummaryData } from '@/lib/types'

export function TotalBar({ summary }: { summary: SummaryData }) {
  const isPositive = summary.totalPercentChange >= 0
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-6">
      <div className="text-sm text-gray-400 mb-1">Costo total este mes</div>
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold text-white">
          {formatCurrency(summary.totalCurrentMonth)}
        </span>
        <span className={`text-sm ${isPositive ? 'text-red-400' : 'text-green-400'}`}>
          {formatPercent(summary.totalPercentChange)} vs mes anterior
        </span>
      </div>
    </div>
  )
}
