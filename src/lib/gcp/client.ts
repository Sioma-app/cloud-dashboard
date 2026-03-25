import { BigQuery } from '@google-cloud/bigquery'
import { calcPercentChange } from '@/lib/format'
import { format, startOfMonth, subMonths, parseISO, startOfISOWeek } from 'date-fns'
import type { CloudDetailData, Granularity, MonthlyCost, ServiceCost, StackedPeriod } from '@/lib/types'

const PROJECT_ID = process.env.GCP_PROJECT_ID ?? 'desarrollo-375213'
const DATASET = process.env.GCP_BIGQUERY_DATASET ?? 'Costos'

function getClient() {
  const key = process.env.GCP_SERVICE_ACCOUNT_KEY
  if (!key) throw new Error('GCP_SERVICE_ACCOUNT_KEY not set')
  const credentials = JSON.parse(Buffer.from(key, 'base64').toString('utf8'))
  return new BigQuery({ projectId: PROJECT_ID, credentials })
}

let cachedTableName: string | null = null

async function getTableName(): Promise<string> {
  if (cachedTableName) return cachedTableName
  const bq = getClient()
  const [tables] = await bq.dataset(DATASET).getTables()
  const billing = tables.find((t) => t.id?.startsWith('gcp_billing_export'))
  if (!billing?.id) throw new Error(`No billing export table found in dataset ${DATASET}`)
  cachedTableName = `${PROJECT_ID}.${DATASET}.${billing.id}`
  return cachedTableName
}

async function fetchCostsByService(startDate: string, endDate: string) {
  const bq = getClient()
  const table = await getTableName()

  const query = `
    SELECT
      service.description AS service_name,
      SUM(cost) AS total_cost
    FROM \`${table}\`
    WHERE DATE(usage_start_time) >= @startDate
      AND DATE(usage_start_time) <= @endDate
    GROUP BY service_name
    ORDER BY total_cost DESC
    LIMIT 10
  `

  const location = process.env.GCP_BIGQUERY_LOCATION ?? 'US'
  const [rows] = await bq.query({
    query,
    params: { startDate, endDate },
    location,
  })

  const services: Array<{ name: string; cost: number }> = rows.map((r: Record<string, unknown>) => ({
    name: String(r.service_name ?? 'Unknown'),
    cost: Number(r.total_cost ?? 0),
  }))

  const total = services.reduce((sum, s) => sum + s.cost, 0)
  return { total, services }
}

async function fetchWeeklyByService(startDate: string, endDate: string): Promise<Array<Record<string, unknown>>> {
  const bq = getClient()
  const table = await getTableName()

  // Extend to the Monday of the week containing startDate so all weeks are complete
  const weekStart = format(startOfISOWeek(parseISO(startDate)), 'yyyy-MM-dd')

  const query = `
    SELECT
      FORMAT_DATE('Sem %V', DATE(usage_start_time)) AS period,
      service.description AS service_name,
      SUM(cost) AS total_cost
    FROM \`${table}\`
    WHERE DATE(usage_start_time) >= @weekStart
      AND DATE(usage_start_time) <= @endDate
    GROUP BY period, service_name
    ORDER BY period ASC, total_cost DESC
  `

  const location = process.env.GCP_BIGQUERY_LOCATION ?? 'US'
  const [rows] = await bq.query({
    query,
    params: { weekStart, endDate },
    location,
  })

  return rows as Array<Record<string, unknown>>
}

async function fetchMonthlyByService(startDate: string, endDate: string): Promise<Array<Record<string, unknown>>> {
  const bq = getClient()
  const table = await getTableName()

  const query = `
    SELECT
      FORMAT_DATE('%Y-%m', DATE(usage_start_time)) AS period,
      service.description AS service_name,
      SUM(cost) AS total_cost
    FROM \`${table}\`
    WHERE DATE(usage_start_time) >= @startDate
      AND DATE(usage_start_time) <= @endDate
    GROUP BY period, service_name
    ORDER BY period ASC, total_cost DESC
  `

  const location = process.env.GCP_BIGQUERY_LOCATION ?? 'US'
  const [rows] = await bq.query({
    query,
    params: { startDate, endDate },
    location,
  })

  return rows as Array<Record<string, unknown>>
}

async function fetchMonthlyHistory(startDate: string, endDate: string): Promise<MonthlyCost[]> {
  const bq = getClient()
  const table = await getTableName()

  const query = `
    SELECT
      FORMAT_DATE('%Y-%m', DATE(usage_start_time)) AS month,
      SUM(cost) AS total_cost
    FROM \`${table}\`
    WHERE DATE(usage_start_time) >= @startDate
      AND DATE(usage_start_time) <= @endDate
    GROUP BY month
    ORDER BY month ASC
  `

  const location = process.env.GCP_BIGQUERY_LOCATION ?? 'US'
  const [rows] = await bq.query({
    query,
    params: { startDate, endDate },
    location,
  })

  return rows.map((r: Record<string, unknown>) => ({
    month: String(r.month),
    cost: Number(r.total_cost ?? 0),
  }))
}

export async function getGcpMonthlyCosts(startDate: string, endDate: string, granularity: Granularity = 'weekly'): Promise<CloudDetailData> {
  const priorStart = format(startOfMonth(subMonths(parseISO(startDate), 1)), 'yyyy-MM-dd')
  const priorEnd = startDate

  const fetchPeriodRows = granularity === 'monthly'
    ? fetchMonthlyByService(startDate, endDate).catch(() => [] as Array<Record<string, unknown>>)
    : fetchWeeklyByService(startDate, endDate).catch(() => [] as Array<Record<string, unknown>>)

  const [current, prior, history, periodRows] = await Promise.all([
    fetchCostsByService(startDate, endDate),
    fetchCostsByService(priorStart, priorEnd),
    fetchMonthlyHistory(startDate, endDate),
    fetchPeriodRows,
  ])

  const topServices: ServiceCost[] = current.services.map((s) => ({
    name: s.name,
    cost: s.cost,
    percentOfTotal: current.total > 0 ? (s.cost / current.total) * 100 : 0,
  }))

  const periodMap = new Map<string, Record<string, number>>()
  for (const row of periodRows) {
    const p = String(row.period)
    const svc = String(row.service_name)
    const cost = Number(row.total_cost ?? 0)
    if (!periodMap.has(p)) periodMap.set(p, {})
    periodMap.get(p)![svc] = cost
  }
  const stackedHistory: StackedPeriod[] = [...periodMap.entries()].map(([period, services]) => ({
    period,
    total: Object.values(services).reduce((a, b) => a + b, 0),
    services,
  }))

  return {
    provider: 'gcp',
    currentMonthCost: current.total,
    priorMonthCost: prior.total,
    percentChange: calcPercentChange(current.total, prior.total),
    topServices,
    history,
    stackedHistory,
  }
}
