import { ClientSecretCredential } from '@azure/identity'
import { CostManagementClient } from '@azure/arm-costmanagement'
import { unstable_cache } from 'next/cache'
import { calcPercentChange } from '@/lib/format'
import { format, startOfMonth, subMonths, parseISO, startOfISOWeek } from 'date-fns'
import type { CloudDetailData, Granularity, MonthlyCost, ServiceCost, StackedPeriod } from '@/lib/types'

function getClient() {
  return new CostManagementClient(
    new ClientSecretCredential(
      process.env.AZURE_TENANT_ID!,
      process.env.AZURE_CLIENT_ID!,
      process.env.AZURE_CLIENT_SECRET!,
    )
  )
}

// Azure date values can be Date objects, YYYYMMDD integers, or YYYY-MM-DD strings.
function parseAzureDate(value: unknown): string {
  if (value instanceof Date) return format(value, 'yyyy-MM-dd')
  const s = String(value ?? '')
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return ''
}

// Find the first matching column index by name candidates.
function colIdx(cols: Array<{ name?: string }> | undefined, candidates: string[]): number {
  for (const name of candidates) {
    const i = (cols ?? []).findIndex((c) => c.name === name)
    if (i !== -1) return i
  }
  return 0
}

type AzureResult = { columns?: Array<{ name?: string }>; rows?: Array<unknown[]> }

// Wrapped with unstable_cache so the result persists in Vercel's shared cache
// between serverless invocations (unlike a module-level Map which resets per invocation).
const queryAzure = unstable_cache(
  async (startDate: string, endDate: string, granularity: 'Monthly' | 'Daily'): Promise<AzureResult> => {
    const client = getClient()
    const scope = `/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}`
    return client.query.usage(scope, {
      type: 'Usage',
      timeframe: 'Custom',
      timePeriod: { from: new Date(startDate), to: new Date(endDate) },
      dataset: {
        granularity,
        aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
        grouping: [{ type: 'Dimension', name: 'ServiceName' }],
      },
    }) as Promise<AzureResult>
  },
  ['azure-usage'],
  { revalidate: 600 }, // 10 minutes
)

export async function getAzureMonthlyCosts(startDate: string, endDate: string, granularity: Granularity = 'weekly'): Promise<CloudDetailData> {
  const priorStart = format(startOfMonth(subMonths(parseISO(startDate), 1)), 'yyyy-MM-dd')
  const priorEnd = startDate
  // Extend to Monday of first week for complete weekly bins (weekly only)
  const weekStart = granularity === 'weekly'
    ? format(startOfISOWeek(parseISO(startDate)), 'yyyy-MM-dd')
    : startDate

  // Sequential to avoid hitting rate limits on the first cold load
  const currentData = await queryAzure(startDate, endDate, 'Monthly')
  const priorData = await queryAzure(priorStart, priorEnd, 'Monthly')
  // Skip daily query for monthly granularity — saves an API call and reduces rate limit risk
  const dailyData = granularity === 'weekly'
    ? await queryAzure(weekStart, endDate, 'Daily').catch(() => null)
    : null

  // Column indices for monthly data
  const costIdx = colIdx(currentData.columns, ['Cost', 'PreTaxCost', 'TotalCost'])
  const nameIdx = colIdx(currentData.columns, ['ServiceName', 'ServiceFamily'])
  const dateIdx = colIdx(currentData.columns, ['BillingMonth', 'UsageDate', 'Date'])

  // Aggregate services
  const serviceMap = new Map<string, number>()
  for (const row of currentData.rows ?? []) {
    const name = String(row[nameIdx] ?? 'Unknown')
    const cost = Number(row[costIdx] ?? 0)
    serviceMap.set(name, (serviceMap.get(name) ?? 0) + cost)
  }
  const currentMonthCost = [...serviceMap.values()].reduce((a, b) => a + b, 0)

  const priorCostIdx = colIdx(priorData.columns, ['Cost', 'PreTaxCost', 'TotalCost'])
  const priorTotal = (priorData.rows ?? []).reduce((sum, row) => sum + Number(row[priorCostIdx] ?? 0), 0)

  const topServices: ServiceCost[] = [...serviceMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, cost]) => ({
      name,
      cost,
      percentOfTotal: currentMonthCost > 0 ? (cost / currentMonthCost) * 100 : 0,
    }))

  // Monthly history array (for history fallback)
  const monthMap = new Map<string, number>()
  for (const row of currentData.rows ?? []) {
    const dateStr = parseAzureDate(row[dateIdx])
    const period = dateStr.slice(0, 7)
    if (!period || period.length < 7) continue
    monthMap.set(period, (monthMap.get(period) ?? 0) + Number(row[costIdx] ?? 0))
  }
  const history: MonthlyCost[] = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cost]) => ({ month, cost }))

  // Stacked history — monthly grouping from currentData, or weekly grouping from dailyData
  let stackedHistory: StackedPeriod[] | undefined

  if (granularity === 'monthly') {
    const monthlyMap = new Map<string, Record<string, number>>()
    for (const row of currentData.rows ?? []) {
      const dateStr = parseAzureDate(row[dateIdx])
      const period = dateStr.slice(0, 7)
      if (!period || period.length < 7) continue
      const svc = String(row[nameIdx] ?? 'Unknown')
      const cost = Number(row[costIdx] ?? 0)
      if (!monthlyMap.has(period)) monthlyMap.set(period, {})
      monthlyMap.get(period)![svc] = (monthlyMap.get(period)![svc] ?? 0) + cost
    }
    const months = [...monthlyMap.entries()].sort(([a], [b]) => a.localeCompare(b))
    if (months.length > 0) {
      stackedHistory = months.map(([period, services]) => ({
        period,
        total: Object.values(services).reduce((a, b) => a + b, 0),
        services,
      }))
    }
  } else if (dailyData) {
    const dCostIdx = colIdx(dailyData.columns, ['Cost', 'PreTaxCost', 'TotalCost'])
    const dNameIdx = colIdx(dailyData.columns, ['ServiceName', 'ServiceFamily'])
    const dDateIdx = colIdx(dailyData.columns, ['UsageDate', 'BillingMonth', 'Date'])

    const weekMap = new Map<string, Record<string, number>>()
    for (const row of dailyData.rows ?? []) {
      const dateStr = parseAzureDate(row[dDateIdx])
      if (!dateStr) continue
      const weekLabel = `Sem ${format(parseISO(dateStr), 'ww')}`
      const svc = String(row[dNameIdx] ?? 'Unknown')
      const cost = Number(row[dCostIdx] ?? 0)
      if (!weekMap.has(weekLabel)) weekMap.set(weekLabel, {})
      weekMap.get(weekLabel)![svc] = (weekMap.get(weekLabel)![svc] ?? 0) + cost
    }

    const weeks = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b))
    if (weeks.length > 0) {
      stackedHistory = weeks.map(([period, services]) => ({
        period,
        total: Object.values(services).reduce((a, b) => a + b, 0),
        services,
      }))
    }
  }

  return {
    provider: 'azure',
    currentMonthCost,
    priorMonthCost: priorTotal,
    percentChange: calcPercentChange(currentMonthCost, priorTotal),
    topServices,
    history,
    stackedHistory,
  }
}
