'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import type { StackedPeriod } from '@/lib/types'

const COLORS = [
  '#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8B5CF6',
  '#06B6D4', '#F97316', '#EC4899', '#84CC16', '#14B8A6',
  '#F59E0B', '#6366F1', '#10B981', '#EF4444', '#3B82F6',
]

function formatK(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
}

interface Props {
  data: StackedPeriod[]
}

export function StackedServiceChart({ data }: Props) {
  if (!data || data.length === 0) return null

  const allServices = [...new Set(data.flatMap((d) => Object.keys(d.services)))]

  const chartData = data.map((d) => ({
    period: d.period,
    total: d.total,
    ...d.services,
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={64} tickFormatter={formatK} />
        <Tooltip
          contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 6, fontSize: 12 }}
          formatter={(value: ValueType | undefined, name: NameType | undefined): [string, string] => [
            `$${Number(value ?? 0).toFixed(2)}`,
            String(name ?? ''),
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value: string) => {
            const total = data.reduce((sum, d) => sum + (d.services[value] ?? 0), 0)
            return `${value} (${formatK(total)})`
          }}
        />
        {allServices.map((svc, i) => (
          <Bar key={svc} dataKey={svc} stackId="a" fill={COLORS[i % COLORS.length]}>
            {i === allServices.length - 1 && (
              <LabelList
                dataKey="total"
                position="top"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => formatK(Number(v ?? 0))}
                style={{ fontSize: 10, fill: '#d1d5db' }}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
