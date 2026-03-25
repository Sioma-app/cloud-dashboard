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
  title?: string
}

function downloadStackedChartAsImage(
  data: StackedPeriod[],
  allServices: string[],
  title: string,
) {
  const MARGIN = { top: 60, right: 32, bottom: 48, left: 72 }
  const CHART_W = 820
  const CHART_H = 340
  const LINE_H = 20
  const COL_GAP = 16
  const LEGEND_PAD = { top: 16, bottom: 20, left: 16 }

  // Filter services with total cost >= $0.50 (rounds to at least $1 in display)
  const activeServices = allServices.filter(
    (svc) => data.reduce((sum, d) => sum + (d.services[svc] ?? 0), 0) >= 0.5
  )

  const WIDTH = CHART_W + MARGIN.left + MARGIN.right
  const COLS = 2
  const colW = (WIDTH - LEGEND_PAD.left * 2 - COL_GAP) / COLS
  const legendRows = Math.ceil(activeServices.length / COLS)
  const LEGEND_H = LEGEND_PAD.top + LINE_H + legendRows * LINE_H + LEGEND_PAD.bottom
  const HEIGHT = MARGIN.top + CHART_H + MARGIN.bottom + LEGEND_H

  const canvas = document.createElement('canvas')
  const dpr = 2
  canvas.width = WIDTH * dpr
  canvas.height = HEIGHT * dpr
  canvas.style.width = `${WIDTH}px`
  canvas.style.height = `${HEIGHT}px`

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Outer border
  ctx.strokeStyle = '#2563eb'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, WIDTH - 2, HEIGHT - 2)

  // Title
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 16px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(title, WIDTH / 2, 36)

  // Chart area origin
  const ox = MARGIN.left
  const oy = MARGIN.top

  const chartData = data.map((d) => ({ period: d.period, total: d.total, services: d.services }))
  const maxTotal = Math.max(...chartData.map((d) => d.total), 1)

  // Y-axis ticks + gridlines
  const tickCount = 5
  const yTickStep = maxTotal / tickCount
  ctx.font = '11px system-ui, sans-serif'
  ctx.textAlign = 'right'

  for (let i = 0; i <= tickCount; i++) {
    const val = yTickStep * i
    const y = oy + CHART_H - (val / maxTotal) * CHART_H
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(ox, y)
    ctx.lineTo(ox + CHART_W, y)
    ctx.stroke()
    ctx.fillStyle = '#6b7280'
    ctx.fillText(formatK(val), ox - 8, y + 4)
  }

  // Axes
  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(ox, oy)
  ctx.lineTo(ox, oy + CHART_H)
  ctx.lineTo(ox + CHART_W, oy + CHART_H)
  ctx.stroke()

  // Bars
  const barGroupGap = 0.25
  const barGroupWidth = CHART_W / chartData.length
  const barWidth = barGroupWidth * (1 - barGroupGap)

  chartData.forEach((d, gi) => {
    const x = ox + gi * barGroupWidth + (barGroupWidth - barWidth) / 2
    let stackY = oy + CHART_H

    const reversed = [...allServices].reverse()
    reversed.forEach((svc, si) => {
      const svcIndex = allServices.length - 1 - si
      const val = d.services[svc] ?? 0
      if (val <= 0) return
      const barH = (val / maxTotal) * CHART_H
      stackY -= barH
      ctx.fillStyle = COLORS[svcIndex % COLORS.length]
      ctx.fillRect(Math.round(x), Math.round(stackY), Math.round(barWidth), Math.round(barH))
    })

    if (d.total > 0) {
      ctx.fillStyle = '#374151'
      ctx.font = 'bold 10px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(formatK(d.total), x + barWidth / 2, stackY - 4)
    }

    ctx.fillStyle = '#6b7280'
    ctx.font = '11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(d.period, x + barWidth / 2, oy + CHART_H + 18)
  })

  // Legend — two columns below chart, only services with cost > 0
  const legendTop = MARGIN.top + CHART_H + MARGIN.bottom
  const separatorY = legendTop - 8

  // Separator line
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(LEGEND_PAD.left, separatorY)
  ctx.lineTo(WIDTH - LEGEND_PAD.left, separatorY)
  ctx.stroke()

  ctx.fillStyle = '#374151'
  ctx.font = 'bold 11px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Servicios', LEGEND_PAD.left, legendTop + LINE_H)

  activeServices.forEach((svc, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const x = LEGEND_PAD.left + col * (colW + COL_GAP)
    const y = legendTop + LINE_H + LEGEND_PAD.top + (row + 1) * LINE_H

    const total = data.reduce((sum, d) => sum + (d.services[svc] ?? 0), 0)
    const colorIdx = allServices.indexOf(svc)

    // Color square
    ctx.fillStyle = COLORS[colorIdx % COLORS.length]
    ctx.fillRect(x, y - 10, 11, 11)

    // Label — truncate to column width
    ctx.fillStyle = '#374151'
    ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = 'left'
    const maxW = colW - 18
    const label = `${svc} (${formatK(total)})`
    let displayLabel = label
    if (ctx.measureText(displayLabel).width > maxW) {
      while (ctx.measureText(displayLabel + '…').width > maxW && displayLabel.length > 4) {
        displayLabel = displayLabel.slice(0, -1)
      }
      displayLabel += '…'
    }
    ctx.fillText(displayLabel, x + 16, y)
  })

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/\s+/g, '_')}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

export function StackedServiceChart({ data, title = 'Consumo por Servicio' }: Props) {
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
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
        <button
          onClick={() => downloadStackedChartAsImage(data, allServices, title)}
          className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-2 py-1 rounded"
          title="Descargar imagen"
        >
          &#8595; Descargar
        </button>
      </div>
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
