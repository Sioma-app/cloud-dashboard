import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type GetCostAndUsageCommandInput,
} from '@aws-sdk/client-cost-explorer'
import { calcPercentChange } from '@/lib/format'
import { format, startOfMonth, subMonths } from 'date-fns'
import type { CloudDetailData, MonthlyCost, Period, ServiceCost } from '@/lib/types'

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

export async function getAwsMonthlyCosts(period: Period): Promise<CloudDetailData> {
  const now = new Date()
  const currentStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const currentEnd = format(now, 'yyyy-MM-dd')
  const priorStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')
  const priorEnd = format(startOfMonth(now), 'yyyy-MM-dd')

  const months = period === 'current' ? 1 : period === '3m' ? 3 : period === '6m' ? 6 : 12
  const historyStart = format(startOfMonth(subMonths(now, months - 1)), 'yyyy-MM-dd')

  const [currentData, priorData, historyData] = await Promise.all([
    fetchCosts(currentStart, currentEnd, true),
    fetchCosts(priorStart, priorEnd, false),
    fetchCosts(historyStart, currentEnd, false),
  ])

  const currentMonthCost = parseFloat(currentData[0]?.Total?.BlendedCost?.Amount ?? '0')
  const priorMonthCost = parseFloat(priorData[0]?.Total?.BlendedCost?.Amount ?? '0')

  const rawServices = (currentData[0]?.Groups ?? [])
    .map((g) => ({
      name: g.Keys?.[0] ?? 'Unknown',
      cost: parseFloat(g.Metrics?.BlendedCost?.Amount ?? '0'),
      percentOfTotal: 0,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10)

  const serviceTotal = rawServices.reduce((sum, s) => sum + s.cost, 0)

  const topServices: ServiceCost[] = rawServices.map((s) => ({
    ...s,
    percentOfTotal: serviceTotal > 0 ? (s.cost / serviceTotal) * 100 : 0,
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
