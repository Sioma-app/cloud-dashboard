'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import type { MonthlyCost } from '@/lib/types'

function tooltipFormatter(v: ValueType | undefined, _name: NameType | undefined): [string, string] {
  return [`$${Number(v ?? 0).toFixed(2)}`, 'Costo']
}

function formatK(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
}

function downloadCostBarChartAsImage(
  data: MonthlyCost[],
  color: string,
  title: string,
) {
  const MARGIN = { top: 60, right: 32, bottom: 48, left: 72 }
  const CHART_W = 560
  const CHART_H = 220
  const WIDTH = CHART_W + MARGIN.left + MARGIN.right
  const HEIGHT = CHART_H + MARGIN.top + MARGIN.bottom

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

  const ox = MARGIN.left
  const oy = MARGIN.top

  const maxCost = Math.max(...data.map((d) => d.cost), 1)
  const tickCount = 5
  const yTickStep = maxCost / tickCount

  // Grid lines and Y labels
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.fillStyle = '#6b7280'
  ctx.font = '11px system-ui, sans-serif'
  ctx.textAlign = 'right'

  for (let i = 0; i <= tickCount; i++) {
    const val = yTickStep * i
    const y = oy + CHART_H - (val / maxCost) * CHART_H
    ctx.beginPath()
    ctx.moveTo(ox, y)
    ctx.lineTo(ox + CHART_W, y)
    ctx.stroke()
    ctx.fillText(formatK(val), ox - 8, y + 4)
  }

  // Y-axis line
  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(ox, oy)
  ctx.lineTo(ox, oy + CHART_H)
  ctx.stroke()

  // X-axis line
  ctx.beginPath()
  ctx.moveTo(ox, oy + CHART_H)
  ctx.lineTo(ox + CHART_W, oy + CHART_H)
  ctx.stroke()

  // Bars
  const barGroupGap = 0.3
  const barGroupWidth = CHART_W / data.length
  const barWidth = barGroupWidth * (1 - barGroupGap)

  data.forEach((d, i) => {
    const x = ox + i * barGroupWidth + (barGroupWidth - barWidth) / 2
    const barH = (d.cost / maxCost) * CHART_H
    const y = oy + CHART_H - barH

    // Draw bar with rounded top corners
    const r = Math.min(3, barH / 2)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(Math.round(x) + r, Math.round(y))
    ctx.lineTo(Math.round(x + barWidth) - r, Math.round(y))
    ctx.quadraticCurveTo(Math.round(x + barWidth), Math.round(y), Math.round(x + barWidth), Math.round(y) + r)
    ctx.lineTo(Math.round(x + barWidth), Math.round(y + barH))
    ctx.lineTo(Math.round(x), Math.round(y + barH))
    ctx.lineTo(Math.round(x), Math.round(y) + r)
    ctx.quadraticCurveTo(Math.round(x), Math.round(y), Math.round(x) + r, Math.round(y))
    ctx.closePath()
    ctx.fill()

    // X-axis label
    ctx.fillStyle = '#6b7280'
    ctx.font = '11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(d.month, x + barWidth / 2, oy + CHART_H + 18)
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

export function CostBarChart({
  data,
  color,
  title = 'Costo Mensual',
}: {
  data: MonthlyCost[]
  color: string
  title?: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
        <button
          onClick={() => downloadCostBarChartAsImage(data, color, title)}
          className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-2 py-1 rounded"
          title="Descargar imagen"
        >
          &#8595; Descargar
        </button>
      </div>
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
    </div>
  )
}
