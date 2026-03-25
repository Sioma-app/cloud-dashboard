'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { ServiceCost } from '@/lib/types'

const COLORS = [
  '#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8B5CF6',
  '#06B6D4', '#F97316', '#EC4899', '#84CC16', '#14B8A6',
  '#F59E0B', '#6366F1', '#10B981', '#EF4444', '#3B82F6',
]

function formatK(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { color: string } }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div style={{ background: '#111', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: item.payload.color, fontWeight: 600 }}>{item.name}</div>
      <div style={{ color: '#fff', marginTop: 2 }}>{formatK(item.value)}</div>
    </div>
  )
}

interface Props {
  services: ServiceCost[]
}

export function ServicePieChart({ services }: Props) {
  // Only show services with meaningful cost (>= $0.50)
  const data = services
    .filter((s) => s.cost >= 0.5)
    .slice(0, 12)
    .map((s, i) => ({ name: s.name, value: s.cost, color: COLORS[i % COLORS.length] }))

  if (data.length === 0) return null

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={COLORS[i % COLORS.length]} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Mini legend below pie */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1 px-2">
        {data.slice(0, 8).map((d, i) => (
          <div key={d.name} className="flex items-center gap-1 text-xs text-gray-400">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'inline-block', flexShrink: 0 }} />
            {d.name.length > 18 ? d.name.slice(0, 18) + '…' : d.name}
          </div>
        ))}
        {data.length > 8 && <span className="text-xs text-gray-600">+{data.length - 8} más</span>}
      </div>
    </div>
  )
}
