import { format, startOfMonth, subMonths } from 'date-fns'
import type { Period, DateRange } from './types'

export function parseDateRangeFromParams(params: { period?: string; from?: string; to?: string }): DateRange {
  if (params.from && params.to) {
    const start = `${params.from}-01`
    const toDate = new Date(`${params.to}-01`)
    const end = format(new Date(toDate.getFullYear(), toDate.getMonth() + 1, 0), 'yyyy-MM-dd')
    return { start, end }
  }
  return getDateRange((params.period ?? 'current') as Period)
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
