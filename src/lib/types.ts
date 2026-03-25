export type CloudProvider = 'gcp' | 'aws' | 'azure'
export type Period = 'current' | '3m' | '6m' | '12m'

export interface CloudCostSummary {
  provider: CloudProvider
  currentMonthCost: number
  priorMonthCost: number
  percentChange: number
  currency: string
}

export interface ServiceCost {
  name: string
  cost: number
  percentOfTotal: number
}

export interface MonthlyCost {
  month: string  // YYYY-MM
  cost: number
}

export interface StackedPeriod {
  period: string   // e.g. "Sem 2", "Mar 2026"
  total: number
  services: Record<string, number>  // service name -> cost
}

export interface CloudDetailData {
  provider: CloudProvider
  currentMonthCost: number
  priorMonthCost: number
  percentChange: number
  topServices: ServiceCost[]
  history: MonthlyCost[]
  stackedHistory?: StackedPeriod[]
}

export interface SummaryData {
  totalCurrentMonth: number
  totalPriorMonth: number
  totalPercentChange: number
  clouds: CloudCostSummary[]
}

export interface DateRange {
  start: string  // YYYY-MM-DD
  end: string    // YYYY-MM-DD
}
