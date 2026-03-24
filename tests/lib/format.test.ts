import { formatCurrency, formatPercent, getDateRange } from '@/lib/format'

describe('formatCurrency', () => {
  it('formats USD with 2 decimal places', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })
  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })
})

describe('formatPercent', () => {
  it('formats positive change with + sign', () => {
    expect(formatPercent(5.3)).toBe('+5.3%')
  })
  it('formats negative change', () => {
    expect(formatPercent(-2.1)).toBe('-2.1%')
  })
  it('handles zero change', () => {
    expect(formatPercent(0)).toBe('0.0%')
  })
})

describe('getDateRange', () => {
  it('returns start and end of current month', () => {
    const { start, end } = getDateRange('current')
    expect(start).toMatch(/^\d{4}-\d{2}-01$/)
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('returns 3-month range spanning > 60 days', () => {
    const { start, end } = getDateRange('3m')
    const diff = new Date(end).getTime() - new Date(start).getTime()
    expect(diff).toBeGreaterThan(60 * 24 * 60 * 60 * 1000)
  })
})
