'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, startOfMonth, subMonths } from 'date-fns'
import type { Period } from '@/lib/types'

const PRESETS: { value: Period; label: string }[] = [
  { value: 'current', label: 'Este mes' },
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: '12m', label: '12 meses' },
]

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function getPresetRange(period: Period): { from: string; to: string } {
  const now = new Date()
  const to = format(now, 'yyyy-MM')
  if (period === 'current') {
    return { from: format(startOfMonth(now), 'yyyy-MM'), to }
  }
  const months = period === '3m' ? 3 : period === '6m' ? 6 : 12
  return { from: format(startOfMonth(subMonths(now, months - 1)), 'yyyy-MM'), to }
}

function displayMonth(yyyyMM: string): string {
  if (!yyyyMM) return ''
  const [year, month] = yyyyMM.split('-')
  return `${MONTHS_ES[Number(month) - 1]} ${year}`
}

export function PeriodSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentPeriod = (searchParams.get('period') ?? 'current') as Period
  const currentFrom = searchParams.get('from') ?? ''
  const currentTo = searchParams.get('to') ?? ''
  const isCustom = !!(currentFrom && currentTo)

  // Always have a visible date range
  const activeRange = isCustom
    ? { from: currentFrom, to: currentTo }
    : getPresetRange(currentPeriod)

  const currentGranularity = searchParams.get('granularity') ?? 'weekly'

  function applyPreset(period: Period) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', period)
    params.delete('from')
    params.delete('to')
    router.push(`?${params.toString()}`)
  }

  function applyCustom(from: string, to: string) {
    if (from && to) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('from', from)
      params.set('to', to)
      params.delete('period')
      router.push(`?${params.toString()}`)
    }
  }

  function applyGranularity(g: 'weekly' | 'monthly') {
    const params = new URLSearchParams(searchParams.toString())
    params.set('granularity', g)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {/* Preset buttons */}
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => applyPreset(p.value)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              !isCustom && currentPeriod === p.value
                ? 'bg-white/15 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Granularity toggle */}
      <div className="flex gap-1">
        {(['weekly', 'monthly'] as const).map((g) => (
          <button
            key={g}
            onClick={() => applyGranularity(g)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              currentGranularity === g
                ? 'bg-white/15 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {g === 'weekly' ? 'Semanal' : 'Mensual'}
          </button>
        ))}
      </div>

      {/* Date range row */}
      <div className="flex items-center gap-2 text-sm">
        {/* Current range display */}
        <span className="text-gray-500 text-xs">
          {displayMonth(activeRange.from)}
          {activeRange.from !== activeRange.to && (
            <> <span className="text-gray-600">→</span> {displayMonth(activeRange.to)}</>
          )}
        </span>

        {/* Separator */}
        <span className="text-gray-700 text-xs">|</span>

        {/* Custom range inputs */}
        <span className="text-gray-500 text-xs">Personalizar:</span>
        <input
          type="month"
          value={activeRange.from}
          className="bg-white/5 border-0 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-white/20"
          onChange={(e) => applyCustom(e.target.value, activeRange.to)}
        />
        <span className="text-gray-600 text-xs">→</span>
        <input
          type="month"
          value={activeRange.to}
          className="bg-white/5 border-0 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-white/20"
          onChange={(e) => applyCustom(activeRange.from, e.target.value)}
        />
      </div>
    </div>
  )
}
