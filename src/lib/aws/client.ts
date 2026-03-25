import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type GetCostAndUsageCommandInput,
} from '@aws-sdk/client-cost-explorer'
import { calcPercentChange } from '@/lib/format'
import { format, startOfMonth, subMonths, parseISO } from 'date-fns'
import type { CloudDetailData, MonthlyCost, ServiceCost } from '@/lib/types'

function getClient() {
  return new CostExplorerClient({
    region: process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

async function fetchCosts(startDate: string, endDate: string, groupByService = true) {
  const client = getClient()
  const input: GetCostAndUsageCommandInput = {
    TimePeriod: { Start: startDate, End: endDate },
    Granularity: 'MONTHLY',
    Metrics: ['BlendedCost'],
    ...(groupByService && {
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    }),
  }
  const response = await client.send(new GetCostAndUsageCommand(input))
  return response.ResultsByTime ?? []
}

export async function getAwsMonthlyCosts(startDate: string, endDate: string): Promise<CloudDetailData> {
  const priorStart = format(startOfMonth(subMonths(parseISO(startDate), 1)), 'yyyy-MM-dd')
  const priorEnd = startDate

  const [currentData, priorData, historyData] = await Promise.all([
    fetchCosts(startDate, endDate, true),
    fetchCosts(priorStart, priorEnd, false),
    fetchCosts(startDate, endDate, false),
  ])

  // Aggregate services across all months in the range
  const serviceMap = new Map<string, number>()
  for (const month of currentData) {
    for (const group of month.Groups ?? []) {
      const name = group.Keys?.[0] ?? 'Unknown'
      const cost = parseFloat(group.Metrics?.BlendedCost?.Amount ?? '0')
      serviceMap.set(name, (serviceMap.get(name) ?? 0) + cost)
    }
  }
  const currentMonthCost = [...serviceMap.values()].reduce((a, b) => a + b, 0)
  const priorMonthCost = parseFloat(priorData[0]?.Total?.BlendedCost?.Amount ?? '0')

  const topServices: ServiceCost[] = [...serviceMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, cost]) => ({
      name,
      cost,
      percentOfTotal: currentMonthCost > 0 ? (cost / currentMonthCost) * 100 : 0,
    }))

  const history: MonthlyCost[] = historyData.map((r) => ({
    month: r.TimePeriod?.Start?.slice(0, 7) ?? '',
    cost: parseFloat(r.Total?.BlendedCost?.Amount ?? '0'),
  }))

  return {
    provider: 'aws',
    currentMonthCost,
    priorMonthCost,
    percentChange: calcPercentChange(currentMonthCost, priorMonthCost),
    topServices,
    history,
  }
}
