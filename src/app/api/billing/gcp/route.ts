import { NextRequest, NextResponse } from 'next/server'
import { getGcpMonthlyCosts } from '@/lib/gcp/client'
import { parseDateRangeFromParams } from '@/lib/format'

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from') ?? undefined
  const to = req.nextUrl.searchParams.get('to') ?? undefined
  const period = req.nextUrl.searchParams.get('period') ?? 'current'
  const range = parseDateRangeFromParams({ period, from, to })
  try {
    const data = await getGcpMonthlyCosts(range.start, range.end)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[GCP billing]', error)
    return NextResponse.json({ error: 'Failed to fetch GCP billing data' }, { status: 500 })
  }
}
