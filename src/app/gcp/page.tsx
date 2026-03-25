import { Suspense } from 'react'
import { CostBarChart } from '@/components/CostBarChart'
import { ServiceBreakdownTable } from '@/components/ServiceBreakdownTable'
import { PeriodSelector } from '@/components/PeriodSelector'
import { formatCurrency, formatPercent, parseDateRangeFromParams } from '@/lib/format'
import { getGcpMonthlyCosts } from '@/lib/gcp/client'

export default async function GcpPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}) {
  const { period: p, from, to } = await searchParams
  const range = parseDateRangeFromParams({ period: p, from, to })
  let data
  try {
    data = await getGcpMonthlyCosts(range.start, range.end)
  } catch (e) {
    console.error('[GCP page]', e)
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="text-lg mb-2">No se pudieron cargar los datos de GCP.</p>
        <p className="text-sm">Error: {e instanceof Error ? e.message : 'Unknown error'}</p>
      </div>
    )
  }

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
