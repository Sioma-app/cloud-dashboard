import { formatCurrency } from '@/lib/format'
import type { CloudProvider, ServiceCost } from '@/lib/types'

const PROVIDER_BADGE: Record<CloudProvider, { label: string; bg: string; text: string }> = {
  gcp:   { label: 'GCP',   bg: '#1a3a6b', text: '#7ab3f5' },
  aws:   { label: 'AWS',   bg: '#4a2800', text: '#ffb347' },
  azure: { label: 'Azure', bg: '#002a5c', text: '#5fa8f5' },
}

export function ServiceBreakdownTable({ services }: { services: ServiceCost[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-400 border-b border-white/10">
          <th className="py-2 font-medium">Servicio</th>
          <th className="py-2 font-medium text-right">Costo</th>
          <th className="py-2 font-medium text-right">% del total</th>
        </tr>
      </thead>
      <tbody>
        {services.map((s, i) => {
          const badge = s.provider ? PROVIDER_BADGE[s.provider] : null
          return (
            <tr key={`${s.provider ?? ''}-${s.name}-${i}`} className="border-b border-white/5">
              <td className="py-2 text-white flex items-center gap-2">
                {badge && (
                  <span
                    style={{
                      background: badge.bg,
                      color: badge.text,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 5px',
                      borderRadius: 4,
                      letterSpacing: '0.03em',
                      flexShrink: 0,
                    }}
                  >
                    {badge.label}
                  </span>
                )}
                {s.name}
              </td>
              <td className="py-2 text-right text-white">{formatCurrency(s.cost)}</td>
              <td className="py-2 text-right text-gray-400">{s.percentOfTotal.toFixed(1)}%</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
