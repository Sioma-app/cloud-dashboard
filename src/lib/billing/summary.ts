import { getGcpMonthlyCosts } from '@/lib/gcp/client'
import { getAwsMonthlyCosts } from '@/lib/aws/client'
import { getAzureMonthlyCosts } from '@/lib/azure/client'
import { calcPercentChange } from '@/lib/format'
import type { CloudDetailData, CloudProvider, Granularity, MonthlyCost, ServiceCost, StackedPeriod, SummaryData } from '@/lib/types'

const EMPTY: CloudDetailData = {
  provider: 'gcp',
  currentMonthCost: 0,
  priorMonthCost: 0,
  percentChange: 0,
  topServices: [],
  history: [],
}

// Merge topServices from multiple providers.
// Each service keeps its original name and always carries a provider tag.
// Services from different providers are never merged — each is a separate entry.
function mergeTopServices(
  providers: Array<{ label: string; provider: CloudProvider; services: ServiceCost[] }>
): ServiceCost[] {
  const result: ServiceCost[] = []
  for (const { provider, services } of providers) {
    for (const s of services) {
      result.push({ name: s.name, cost: s.cost, percentOfTotal: 0, provider })
    }
  }
  const totalCost = result.reduce((sum, s) => sum + s.cost, 0)
  result.forEach((s) => { s.percentOfTotal = totalCost > 0 ? (s.cost / totalCost) * 100 : 0 })
  return result.sort((a, b) => b.cost - a.cost)
}

// Merge history arrays by month, summing costs.
function mergeHistory(arrays: MonthlyCost[][]): MonthlyCost[] {
  const map = new Map<string, number>()
  for (const arr of arrays) {
    for (const entry of arr) {
      map.set(entry.month, (map.get(entry.month) ?? 0) + entry.cost)
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, cost]) => ({ month, cost }))
}

// Convert a plain history array to StackedPeriod entries using a single service key.
function historyToStacked(history: MonthlyCost[], serviceKey: string): StackedPeriod[] {
  return history.map((h) => ({
    period: h.month,
    total: h.cost,
    services: { [serviceKey]: h.cost },
  }))
}

// Merge stackedHistory entries from multiple providers into one unified array.
// Service keys are always prefixed with provider label (e.g. "GCP: Cloud SQL")
// so each service is visually identifiable by provider in the chart.
function mergeStackedHistory(
  providers: Array<{ label: string; stacked?: StackedPeriod[]; history: MonthlyCost[] }>
): StackedPeriod[] | undefined {
  const hasAnyStacked = providers.some(
    (p) => p.stacked && p.stacked.length > 0
  )
  if (!hasAnyStacked) return undefined

  // Normalise each provider to StackedPeriod[] with prefixed service keys
  const perProvider = providers.map((p) => {
    let periods: StackedPeriod[]
    if (p.stacked && p.stacked.length > 0) {
      periods = p.stacked
    } else if (p.history.length > 0) {
      periods = historyToStacked(p.history, p.label)
    } else {
      return [] as StackedPeriod[]
    }
    // Prefix every service key with the provider label
    return periods.map((d) => ({
      period: d.period,
      total: d.total,
      services: Object.fromEntries(
        Object.entries(d.services).map(([svc, cost]) => [`${p.label}: ${svc}`, cost])
      ),
    }))
  })

  // Collect all period labels
  const allPeriods = [
    ...new Set(perProvider.flatMap((arr) => arr.map((d) => d.period))),
  ].sort()

  return allPeriods.map((period) => {
    const merged: Record<string, number> = {}
    let total = 0
    for (const arr of perProvider) {
      const found = arr.find((d) => d.period === period)
      if (!found) continue
      for (const [svc, cost] of Object.entries(found.services)) {
        merged[svc] = (merged[svc] ?? 0) + cost
      }
      total += found.total
    }
    return { period, total, services: merged }
  })
}

export async function getBillingSummary(startDate: string, endDate: string, granularity: Granularity = 'weekly'): Promise<SummaryData> {
  const [gcpResult, awsResult, azureResult] = await Promise.allSettled([
    getGcpMonthlyCosts(startDate, endDate, granularity),
    getAwsMonthlyCosts(startDate, endDate, granularity),
    getAzureMonthlyCosts(startDate, endDate, granularity),
  ])

  if (gcpResult.status === 'rejected') console.error('[GCP summary]', gcpResult.reason)
  if (awsResult.status === 'rejected') console.error('[AWS summary]', awsResult.reason)
  if (azureResult.status === 'rejected') console.error('[Azure summary]', azureResult.reason)

  const gcp = gcpResult.status === 'fulfilled' ? gcpResult.value : { ...EMPTY, provider: 'gcp' as const }
  const aws = awsResult.status === 'fulfilled' ? awsResult.value : { ...EMPTY, provider: 'aws' as const }
  const azure = azureResult.status === 'fulfilled' ? azureResult.value : { ...EMPTY, provider: 'azure' as const }

  const totalCurrentMonth = gcp.currentMonthCost + aws.currentMonthCost + azure.currentMonthCost
  const totalPriorMonth = gcp.priorMonthCost + aws.priorMonthCost + azure.priorMonthCost

  const topServices = mergeTopServices([
    { label: 'GCP', provider: 'gcp', services: gcp.topServices },
    { label: 'AWS', provider: 'aws', services: aws.topServices },
    { label: 'Azure', provider: 'azure', services: azure.topServices },
  ])

  const history = mergeHistory([gcp.history, aws.history, azure.history])

  const stackedHistory = mergeStackedHistory([
    { label: 'GCP', stacked: gcp.stackedHistory, history: gcp.history },
    { label: 'AWS', stacked: aws.stackedHistory, history: aws.history },
    { label: 'Azure', stacked: azure.stackedHistory, history: azure.history },
  ])

  return {
    totalCurrentMonth,
    totalPriorMonth,
    totalPercentChange: calcPercentChange(totalCurrentMonth, totalPriorMonth),
    clouds: [
      { provider: 'gcp', currentMonthCost: gcp.currentMonthCost, priorMonthCost: gcp.priorMonthCost, percentChange: gcp.percentChange, currency: 'USD' },
      { provider: 'aws', currentMonthCost: aws.currentMonthCost, priorMonthCost: aws.priorMonthCost, percentChange: aws.percentChange, currency: 'USD' },
      { provider: 'azure', currentMonthCost: azure.currentMonthCost, priorMonthCost: azure.priorMonthCost, percentChange: azure.percentChange, currency: 'USD' },
    ],
    topServices,
    history,
    stackedHistory,
  }
}
