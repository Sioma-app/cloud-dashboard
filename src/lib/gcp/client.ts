import { CloudBillingClient } from '@google-cloud/billing'
import { calcPercentChange, getDateRange } from '@/lib/format'
import type { CloudDetailData, Period } from '@/lib/types'

function getCredentials() {
  const key = process.env.GCP_SERVICE_ACCOUNT_KEY
  if (!key) throw new Error('GCP_SERVICE_ACCOUNT_KEY not set')
  return JSON.parse(Buffer.from(key, 'base64').toString('utf8'))
}

async function fetchGcpCosts(_startDate: string, _endDate: string) {
  const credentials = getCredentials()
  // @google-cloud/billing provides account metadata only, not per-service costs.
  // Full cost data requires enabling BigQuery billing export in GCP Console:
  //   Billing → Billing export → BigQuery export → Enable
  // Until then, this returns empty data.
  const _client = new CloudBillingClient({ credentials })
  return {
    total: 0,
    services: [] as Array<{ name: string; cost: number }>,
  }
}

export async function getGcpMonthlyCosts(period: Period): Promise<CloudDetailData> {
  const currentRange = getDateRange('current')
  const now = new Date()
  const priorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const priorEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)

  const [current, prior] = await Promise.all([
    fetchGcpCosts(currentRange.start, currentRange.end),
    fetchGcpCosts(priorStart, priorEnd),
  ])

  return {
    provider: 'gcp',
    currentMonthCost: current.total,
    priorMonthCost: prior.total,
    percentChange: calcPercentChange(current.total, prior.total),
    topServices: current.services.map((s) => ({
      name: s.name,
      cost: s.cost,
      percentOfTotal: current.total > 0 ? (s.cost / current.total) * 100 : 0,
    })),
    history: [],
  }
}
