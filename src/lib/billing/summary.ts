import { getGcpMonthlyCosts } from '@/lib/gcp/client'
import { getAwsMonthlyCosts } from '@/lib/aws/client'
import { getAzureMonthlyCosts } from '@/lib/azure/client'
import { calcPercentChange } from '@/lib/format'
import type { CloudDetailData, Period, SummaryData } from '@/lib/types'

const EMPTY: CloudDetailData = {
  provider: 'gcp',
  currentMonthCost: 0,
  priorMonthCost: 0,
  percentChange: 0,
  topServices: [],
  history: [],
}

export async function getBillingSummary(period: Period): Promise<SummaryData> {
  const [gcpResult, awsResult, azureResult] = await Promise.allSettled([
    getGcpMonthlyCosts(period),
    getAwsMonthlyCosts(period),
    getAzureMonthlyCosts(period),
  ])

  if (gcpResult.status === 'rejected') console.error('[GCP summary]', gcpResult.reason)
  if (awsResult.status === 'rejected') console.error('[AWS summary]', awsResult.reason)
  if (azureResult.status === 'rejected') console.error('[Azure summary]', azureResult.reason)

  const gcp = gcpResult.status === 'fulfilled' ? gcpResult.value : { ...EMPTY, provider: 'gcp' as const }
  const aws = awsResult.status === 'fulfilled' ? awsResult.value : { ...EMPTY, provider: 'aws' as const }
  const azure = azureResult.status === 'fulfilled' ? azureResult.value : { ...EMPTY, provider: 'azure' as const }

  const totalCurrentMonth = gcp.currentMonthCost + aws.currentMonthCost + azure.currentMonthCost
  const totalPriorMonth = gcp.priorMonthCost + aws.priorMonthCost + azure.priorMonthCost

  return {
    totalCurrentMonth,
    totalPriorMonth,
    totalPercentChange: calcPercentChange(totalCurrentMonth, totalPriorMonth),
    clouds: [
      { provider: 'gcp', currentMonthCost: gcp.currentMonthCost, priorMonthCost: gcp.priorMonthCost, percentChange: gcp.percentChange, currency: 'USD' },
      { provider: 'aws', currentMonthCost: aws.currentMonthCost, priorMonthCost: aws.priorMonthCost, percentChange: aws.percentChange, currency: 'USD' },
      { provider: 'azure', currentMonthCost: azure.currentMonthCost, priorMonthCost: azure.priorMonthCost, percentChange: azure.percentChange, currency: 'USD' },
    ],
  }
}
