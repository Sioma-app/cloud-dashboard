'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts'
import type { StackedPeriod } from '@/lib/types'

interface TooltipPayloadItem {
  name?: string
  value?: number
  color?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

const COLORS = [
  '#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8B5CF6',
  '#06B6D4', '#F97316', '#EC4899', '#84CC16', '#14B8A6',
  '#F59E0B', '#6366F1', '#10B981', '#EF4444', '#3B82F6',
]

function formatK(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
}

// Custom tooltip: only show the segment being hovered, not all services
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  // Show only services with cost > 0, sorted descending
  const items = payload
    .filter((p) => (p.value ?? 0) > 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 8)  // max 8 lines in tooltip

  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0)

  return (
    <div style={{ background: '#111', border: '1px solid #333', borderRadius: 6, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: '#9ca3af', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {items.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color, marginBottom: 2 }}>
          <span style={{ color: '#d1d5db' }}>{p.name}</span>
          <span style={{ fontWeight: 600 }}>${Number(p.value ?? 0).toFixed(2)}</span>
        </div>
      ))}
      {payload.filter((p) => (p.value ?? 0) > 0).length > 8 && (
        <div style={{ color: '#6b7280', marginTop: 4, fontSize: 11 }}>
          + {payload.filter((p) => (p.value ?? 0) > 0).length - 8} más...
        </div>
      )}
      <div style={{ borderTop: '1px solid #333', marginTop: 6, paddingTop: 6, color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
        <span>Total</span>
        <span style={{ fontWeight: 600 }}>{formatK(total)}</span>
      </div>
    </div>
  )
}

interface Props {
  data: StackedPeriod[]
}

export function StackedServiceChart({ data }: Props) {
  if (!data || data.length === 0) return null

  // Sort services by total cost descending so most expensive = bottom of stack
  const allServices = [...new Set(data.flatMap((d) => Object.keys(d.services)))]
    .sort((a, b) => {
      const totalA = data.reduce((sum, d) => sum + (d.services[a] ?? 0), 0)
      const totalB = data.reduce((sum, d) => sum + (d.services[b] ?? 0), 0)
      return totalB - totalA
    })

  const chartData = data.map((d) => ({
    period: d.period,
    total: d.total,
    ...d.services,
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 24, right: 16, left: 0, bottom: 0 }} barCategoryGap="25%">
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={64} tickFormatter={formatK} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          {allServices.map((svc, i) => (
            <Bar key={svc} dataKey={svc} stackId="a" fill={COLORS[i % COLORS.length]}>
              {i === allServices.length - 1 && (
                <LabelList
                  dataKey="total"
                  position="top"
                  formatter={(v: unknown) => formatK(Number(v ?? 0))}
                  style={{ fontSize: 10, fill: '#d1d5db' }}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      {/* Compact legend: top 10 services only */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 px-2">
        {allServices.slice(0, 10).map((svc, i) => {
          const total = data.reduce((sum, d) => sum + (d.services[svc] ?? 0), 0)
          return (
            <div key={svc} className="flex items-center gap-1 text-xs text-gray-400">
              <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], display: 'inline-block', flexShrink: 0 }} />
              {svc} ({formatK(total)})
            </div>
          )
        })}
        {allServices.length > 10 && (
          <span className="text-xs text-gray-600">+{allServices.length - 10} más</span>
        )}
      </div>
    </div>
  )
}
