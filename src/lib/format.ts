import { format, startOfMonth, subMonths } from 'date-fns'
import type { Period, DateRange } from './types'

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
