import { NextRequest, NextResponse } from 'next/server'
import { getGcpMonthlyCosts } from '@/lib/gcp/client'
import type { Period } from '@/lib/types'

export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get('period') ?? 'current') as Period
  try {
    const data = await getGcpMonthlyCosts(period)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[GCP billing]', error)
    return NextResponse.json({ error: 'Failed to fetch GCP billing data' }, { status: 500 })
  }
}
