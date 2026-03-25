'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Period } from '@/lib/types'

const PRESETS: { value: Period; label: string }[] = [
  { value: 'current', label: 'Este mes' },
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: '12m', label: '12 meses' },
]

export function PeriodSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentPeriod = searchParams.get('period') ?? 'current'
  const currentFrom = searchParams.get('from') ?? ''
  const currentTo = searchParams.get('to') ?? ''
  const isCustom = !!(currentFrom && currentTo)

  function applyPreset(period: Period) {
    router.push(`?period=${period}`)
  }

  function applyCustom(from: string, to: string) {
    if (from && to) router.push(`?from=${from}&to=${to}`)
  }

  return (
    <div className="flex flex-col gap-2 items-end">
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
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Desde</span>
        <input
          type="month"
          defaultValue={currentFrom}
          className="bg-gray-900 border border-white/10 text-white text-sm rounded px-2 py-1"
          onChange={(e) => applyCustom(e.target.value, currentTo || e.target.value)}
        />
        <span className="text-gray-500">Hasta</span>
        <input
          type="month"
          defaultValue={currentTo}
          className="bg-gray-900 border border-white/10 text-white text-sm rounded px-2 py-1"
          onChange={(e) => applyCustom(currentFrom || e.target.value, e.target.value)}
        />
      </div>
    </div>
  )
}
