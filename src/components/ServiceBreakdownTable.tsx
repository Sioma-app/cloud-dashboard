import { formatCurrency } from '@/lib/format'
import type { ServiceCost } from '@/lib/types'

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
        {services.map((s) => (
          <tr key={s.name} className="border-b border-white/5">
            <td className="py-2 text-white">{s.name}</td>
            <td className="py-2 text-right text-white">{formatCurrency(s.cost)}</td>
            <td className="py-2 text-right text-gray-400">{s.percentOfTotal.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
