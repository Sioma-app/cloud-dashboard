import { format, startOfMonth, subMonths } from 'date-fns'
import type { Period, DateRange } from './types'

export function parseDateRangeFromParams(params: { period?: string; from?: string; to?: string; granularity?: string }): DateRange {
  let range: DateRange
  if (params.from && params.to) {
    // Split manually to avoid UTC parsing shifting the date by timezone offset
    const [fromYear, fromMonth] = params.from.split('-').map(Number)
    const [toYear, toMonth] = params.to.split('-').map(Number)
    const start = format(new Date(fromYear, fromMonth - 1, 1), 'yyyy-MM-dd')
    const end = format(new Date(toYear, toMonth, 0), 'yyyy-MM-dd') // day 0 = last day of toMonth
    range = { start, end }
  } else {
    range = getDateRange((params.period ?? 'current') as Period)
  }
  range.granularity = params.granularity === 'monthly' ? 'monthly' : 'weekly'
  return range
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function getDateRange(period: Period): DateRange {
  const now = new Date()
  if (period === 'current') {
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(now, 'yyyy-MM-dd'),
    }
  }
  const months = period === '3m' ? 3 : period === '6m' ? 6 : 12
  return {
    start: format(startOfMonth(subMonths(now, months - 1)), 'yyyy-MM-dd'),
    end: format(now, 'yyyy-MM-dd'),
  }
}

export function calcPercentChange(current: number, prior: number): number {
  if (prior === 0) return 0
  return ((current - prior) / prior) * 100
}
