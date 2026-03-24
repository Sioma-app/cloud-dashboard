import { Suspense } from 'react'
import { CostBarChart } from '@/components/CostBarChart'
import { ServiceBreakdownTable } from '@/components/ServiceBreakdownTable'
import { PeriodSelector } from '@/components/PeriodSelector'
import { formatCurrency, formatPercent } from '@/lib/format'
import { getGcpMonthlyCosts } from '@/lib/gcp/client'
import type { Period } from '@/lib/types'

export default async function GcpPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: p } = await searchParams
  const period = (p ?? 'current') as Period
  const data = await getGcpMonthlyCosts(period)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold">Google Cloud</h1>
          <div className="text-3xl font-bold mt-1">{formatCurrency(data.currentMonthCost)}</div>
          <div className={`text-sm ${data.percentChange >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            {formatPercent(data.percentChange)} vs mes anterior
          </div>
        </div>
        <Suspense fallback={<div className="w-36 h-8 rounded bg-white/5 animate-pulse" />}>
          <PeriodSelector />
        </Suspense>
      </div>
      <div className="mb-8">
        <h2 className="text-sm text-gray-400 mb-3">Historial de costos</h2>
        {data.history.length > 0
          ? <CostBarChart data={data.history} color="#4285F4" />
          : <p className="text-gray-500 text-sm">No hay datos históricos disponibles aún.</p>
        }
      </div>
      <div>
        <h2 className="text-sm text-gray-400 mb-3">Desglose por servicio</h2>
        {data.topServices.length > 0
          ? <ServiceBreakdownTable services={data.topServices} />
          : <p className="text-gray-500 text-sm">No hay datos de servicios disponibles aún.</p>
        }
      </div>
    </div>
  )
}
