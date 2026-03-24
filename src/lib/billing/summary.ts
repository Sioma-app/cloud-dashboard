import { getGcpMonthlyCosts } from '@/lib/gcp/client'
import { getAwsMonthlyCosts } from '@/lib/aws/client'
import { getAzureMonthlyCosts } from '@/lib/azure/client'
import { calcPercentChange } from '@/lib/format'
import type { Period, SummaryData } from '@/lib/types'

export async function getBillingSummary(period: Period): Promise<SummaryData> {
  const [gcp, aws, azure] = await Promise.all([
    getGcpMonthlyCosts(period),
    getAwsMonthlyCosts(period),
    getAzureMonthlyCosts(period),
  ])

  const totalCurrentMonth = gcp.currentMonthCost + aws.currentMonthCost + azure.currentMonthCost
  const totalPriorMonth = gcp.priorMonthCost + aws.priorMonthCost + azure.priorMonthCost

  return {
    totalCurrentMonth,
    totalPriorMonth,
    totalPercentChange: calcPercentChange(totalCurrentMonth, totalPriorMonth),
    clouds: [
      {
        provider: 'gcp',
        currentMonthCost: gcp.currentMonthCost,
        priorMonthCost: gcp.priorMonthCost,
        percentChange: gcp.percentChange,
        currency: 'USD',
      },
      {
        provider: 'aws',
        currentMonthCost: aws.currentMonthCost,
        priorMonthCost: aws.priorMonthCost,
        percentChange: aws.percentChange,
        currency: 'USD',
      },
      {
        provider: 'azure',
        currentMonthCost: azure.currentMonthCost,
        priorMonthCost: azure.priorMonthCost,
        percentChange: azure.percentChange,
        currency: 'USD',
      },
    ],
  }
}
