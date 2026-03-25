import { ClientSecretCredential } from '@azure/identity'
import { CostManagementClient } from '@azure/arm-costmanagement'
import { calcPercentChange } from '@/lib/format'
import { format, startOfMonth, subMonths, parseISO } from 'date-fns'
import type { CloudDetailData, ServiceCost } from '@/lib/types'

function getClient() {
  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID!,
    process.env.AZURE_CLIENT_ID!,
    process.env.AZURE_CLIENT_SECRET!,
  )
  return new CostManagementClient(credential)
}

async function fetchCosts(startDate: string, endDate: string) {
  const client = getClient()
  const scope = `/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}`
  return client.query.usage(scope, {
    type: 'Usage',
    timeframe: 'Custom',
    timePeriod: { from: new Date(startDate), to: new Date(endDate) },
    dataset: {
      granularity: 'Monthly',
      aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
      grouping: [{ type: 'Dimension', name: 'ServiceName' }],
    },
  })
}

export async function getAzureMonthlyCosts(startDate: string, endDate: string): Promise<CloudDetailData> {
  const priorStart = format(startOfMonth(subMonths(parseISO(startDate), 1)), 'yyyy-MM-dd')
  const priorEnd = startDate

  const [currentData, priorData] = await Promise.all([
    fetchCosts(startDate, endDate),
    fetchCosts(priorStart, priorEnd),
  ])

  const costIdx = currentData.columns?.findIndex((c) => c.name === 'Cost') ?? 0
  const nameIdx = currentData.columns?.findIndex((c) => c.name === 'ServiceName') ?? 3

  const serviceMap = new Map<string, number>()
  for (const row of currentData.rows ?? []) {
    const name = String(row[nameIdx])
    const cost = Number(row[costIdx])
    serviceMap.set(name, (serviceMap.get(name) ?? 0) + cost)
  }

  const currentMonthCost = [...serviceMap.values()].reduce((a, b) => a + b, 0)
  const priorCostIdx = priorData.columns?.findIndex((c) => c.name === 'Cost') ?? 0
  const priorTotal = (priorData.rows ?? []).reduce((sum, row) => sum + Number(row[priorCostIdx]), 0)

  const topServices: ServiceCost[] = [...serviceMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, cost]) => ({
      name,
      cost,
      percentOfTotal: currentMonthCost > 0 ? (cost / currentMonthCost) * 100 : 0,
    }))

  return {
    provider: 'azure',
    currentMonthCost,
    priorMonthCost: priorTotal,
    percentChange: calcPercentChange(currentMonthCost, priorTotal),
    topServices,
    history: [],
  }
}
