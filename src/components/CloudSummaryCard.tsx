import Link from 'next/link'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { CloudCostSummary } from '@/lib/types'

const CLOUD_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  gcp: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Google Cloud' },
  aws: { color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Amazon AWS' },
  azure: { color: 'text-sky-400', bg: 'bg-sky-400/10', label: 'Microsoft Azure' },
}

export function CloudSummaryCard({ cloud }: { cloud: CloudCostSummary }) {
  const config = CLOUD_CONFIG[cloud.provider]
  const isPositive = cloud.percentChange >= 0
  return (
    <Link href={`/${cloud.provider}`} className="block">
      <div className={`rounded-xl border border-white/10 p-5 ${config.bg} hover:border-white/20 transition-colors`}>
        <div className={`text-sm font-medium mb-3 ${config.color}`}>{config.label}</div>
        <div className="text-2xl font-bold text-white">{formatCurrency(cloud.currentMonthCost)}</div>
        <div className={`text-sm mt-1 ${isPositive ? 'text-red-400' : 'text-green-400'}`}>
          {formatPercent(cloud.percentChange)} vs mes anterior
        </div>
      </div>
    </Link>
  )
}
