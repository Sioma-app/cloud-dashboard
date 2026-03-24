import { NextRequest, NextResponse } from 'next/server'
import { getAwsMonthlyCosts } from '@/lib/aws/client'
import type { Period } from '@/lib/types'

export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get('period') ?? 'current') as Period
  try {
    const data = await getAwsMonthlyCosts(period)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[AWS billing]', error)
    return NextResponse.json({ error: 'Failed to fetch AWS billing data' }, { status: 500 })
  }
}
