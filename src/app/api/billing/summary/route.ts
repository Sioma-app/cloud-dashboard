import { NextRequest, NextResponse } from 'next/server'
import { getBillingSummary } from '@/lib/billing/summary'
import type { Period } from '@/lib/types'

export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get('period') ?? 'current') as Period
  try {
    const summary = await getBillingSummary(period)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('[billing summary]', error)
    return NextResponse.json({ error: 'Failed to fetch billing summary' }, { status: 500 })
  }
}
