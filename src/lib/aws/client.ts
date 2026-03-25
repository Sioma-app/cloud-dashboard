import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type GetCostAndUsageCommandInput,
} from '@aws-sdk/client-cost-explorer'
import { calcPercentChange } from '@/lib/format'
import { format, startOfMonth, subMonths, parseISO, startOfISOWeek } from 'date-fns'
import type { CloudDetailData, Granularity, MonthlyCost, ServiceCost, StackedPeriod } from '@/lib/types'

function getClient() {
  return new CostExplorerClient({
    region: process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

async function fetchCosts(
  startDate: string,
  endDate: string,
  groupByService = true,
  granularity: 'MONTHLY' | 'DAILY' = 'MONTHLY',
) {
  const client = getClient()
  const input: GetCostAndUsageCommandInput = {
    TimePeriod: { Start: startDate, End: endDate },
    Granularity: granularity as GetCostAndUsageCommandInput['Granularity'],
    Metrics: ['BlendedCost'],
    ...(groupByService && {
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    }),
  }
  const response = await client.send(new GetCostAndUsageCommand(input))
  return response.ResultsByTime ?? []
}

export async function getAwsMonthlyCosts(startDate: string, endDate: string, granularity: Granularity = 'weekly'): Promise<CloudDetailData> {
  const priorStart = format(startOfMonth(subMonths(parseISO(startDate), 1)), 'yyyy-MM-dd')
  const priorEnd = startDate

  // Extend weekly query to Monday of the first week so all weeks are complete
  const weekStart = granularity === 'weekly'
    ? format(startOfISOWeek(parseISO(startDate)), 'yyyy-MM-dd')
    : startDate

  const [currentData, priorData, historyData, dailyServiceData] = await Promise.all([
    fetchCosts(startDate, endDate, true),
    fetchCosts(priorStart, priorEnd, false),
    fetchCosts(startDate, endDate, false),
    granularity === 'weekly'
      ? fetchCosts(weekStart, endDate, true, 'DAILY').catch(() => [])
      : Promise.resolve([]),
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

  let stackedHistory: StackedPeriod[]

  if (granularity === 'monthly') {
    // Build stackedHistory from monthly service data (currentData already has per-service per-month)
    const monthlyPeriodMap = new Map<string, Record<string, number>>()
    for (const r of currentData) {
      const period = r.TimePeriod?.Start?.slice(0, 7) ?? ''
      if (!period) continue
      for (const group of r.Groups ?? []) {
        const name = group.Keys?.[0] ?? 'Unknown'
        const cost = parseFloat(group.Metrics?.BlendedCost?.Amount ?? '0')
        if (!monthlyPeriodMap.has(period)) monthlyPeriodMap.set(period, {})
        monthlyPeriodMap.get(period)![name] = (monthlyPeriodMap.get(period)![name] ?? 0) + cost
      }
    }
    stackedHistory = [...monthlyPeriodMap.entries()].map(([period, services]) => ({
      period,
      total: Object.values(services).reduce((a, b) => a + b, 0),
      services,
    }))
  } else {
    const weeklyPeriodMap = new Map<string, Record<string, number>>()
    for (const day of dailyServiceData) {
      const dayStart = day.TimePeriod?.Start ?? ''
      if (!dayStart) continue
      const d = parseISO(dayStart)
      const weekLabel = `Sem ${format(d, 'ww')}`
      for (const group of day.Groups ?? []) {
        const name = group.Keys?.[0] ?? 'Unknown'
        const cost = parseFloat(group.Metrics?.BlendedCost?.Amount ?? '0')
        if (!weeklyPeriodMap.has(weekLabel)) weeklyPeriodMap.set(weekLabel, {})
        weeklyPeriodMap.get(weekLabel)![name] = (weeklyPeriodMap.get(weekLabel)![name] ?? 0) + cost
      }
    }
    stackedHistory = [...weeklyPeriodMap.entries()].map(([period, services]) => ({
      period,
      total: Object.values(services).reduce((a, b) => a + b, 0),
      services,
    }))
  }

  return {
    provider: 'aws',
    currentMonthCost,
    priorMonthCost,
    percentChange: calcPercentChange(currentMonthCost, priorMonthCost),
    topServices,
    history,
    stackedHistory,
  }
}
