import { Suspense } from 'react'
import { CloudSummaryCard } from '@/components/CloudSummaryCard'
import { TotalBar } from '@/components/TotalBar'
import { PeriodSelector } from '@/components/PeriodSelector'
import { CostBarChart } from '@/components/CostBarChart'
import { StackedServiceChart } from '@/components/StackedServiceChart'
import { ServiceBreakdownTable } from '@/components/ServiceBreakdownTable'
import { ServicePieChart } from '@/components/ServicePieChart'
import { getBillingSummary } from '@/lib/billing/summary'
import { parseDateRangeFromParams } from '@/lib/format'

// Server Component calls lib directly — no HTTP loopback to own API routes
export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; granularity?: string }>
}) {
  const { period: p, from, to, granularity: g } = await searchParams
  const range = parseDateRangeFromParams({ period: p, from, to, granularity: g })
  const summary = await getBillingSummary(range.start, range.end, range.granularity ?? 'weekly')

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
      <div className="mt-8 mb-8">
        <h2 className="text-sm text-gray-400 mb-3">Consumo total por período</h2>
        {summary.stackedHistory && summary.stackedHistory.length > 0
          ? <StackedServiceChart data={summary.stackedHistory} title={`Consumo Total por ${(range.granularity ?? 'weekly') === 'monthly' ? 'Mes' : 'Semana'}`} />
          : summary.history.length > 0
            ? <CostBarChart data={summary.history} color="#6366F1" />
            : <p className="text-gray-500 text-sm">No hay datos históricos disponibles aún.</p>
        }
      </div>
      <div>
        <h2 className="text-sm text-gray-400 mb-3">Desglose total por servicio</h2>
        {summary.topServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
            <ServicePieChart services={summary.topServices} />
            <ServiceBreakdownTable services={summary.topServices} />
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No hay datos de servicios disponibles aún.</p>
        )}
      </div>
    </div>
  )
}
