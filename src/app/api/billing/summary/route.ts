import { NextRequest, NextResponse } from 'next/server'
import { getBillingSummary } from '@/lib/billing/summary'
import { parseDateRangeFromParams } from '@/lib/format'

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from') ?? undefined
  const to = req.nextUrl.searchParams.get('to') ?? undefined
  const period = req.nextUrl.searchParams.get('period') ?? 'current'
  const range = parseDateRangeFromParams({ period, from, to })
  try {
    const summary = await getBillingSummary(range.start, range.end)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('[billing summary]', error)
    return NextResponse.json({ error: 'Failed to fetch billing summary' }, { status: 500 })
  }
}
