import { Suspense } from 'react'
import { CloudSummaryCard } from '@/components/CloudSummaryCard'
import { TotalBar } from '@/components/TotalBar'
import { PeriodSelector } from '@/components/PeriodSelector'
import { getBillingSummary } from '@/lib/billing/summary'
import type { Period } from '@/lib/types'

// Server Component calls lib directly — no HTTP loopback to own API routes
export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: p } = await searchParams
  const period = (p ?? 'current') as Period
  const summary = await getBillingSummary(period)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Resumen Multi-Cloud</h1>
        <Suspense fallback={<div className="w-36 h-8 rounded bg-white/5 animate-pulse" />}>
          <PeriodSelector />
        </Suspense>
      </div>
      <TotalBar summary={summary} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary.clouds.map((cloud) => (
          <CloudSummaryCard key={cloud.provider} cloud={cloud} />
        ))}
      </div>
    </div>
  )
}
