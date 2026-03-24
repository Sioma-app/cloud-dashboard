'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Period } from '@/lib/types'

const OPTIONS: { value: Period; label: string }[] = [
  { value: 'current', label: 'Mes actual' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: '12m', label: 'Últimos 12 meses' },
]

export function PeriodSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('period') ?? 'current'
  return (
    <select
      value={current}
      onChange={(e) => router.push(`?period=${e.target.value}`)}
      className="bg-gray-900 border border-white/10 text-white text-sm rounded px-3 py-1.5"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
