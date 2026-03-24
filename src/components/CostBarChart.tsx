'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import type { MonthlyCost } from '@/lib/types'

function tooltipFormatter(v: ValueType | undefined, _name: NameType | undefined): [string, string] {
  return [`$${Number(v ?? 0).toFixed(2)}`, 'Costo']
}

export function CostBarChart({ data, color }: { data: MonthlyCost[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          width={60}
          tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
        />
        <Tooltip
          contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 6 }}
          formatter={tooltipFormatter}
        />
        <Bar dataKey="cost" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
