import { NextRequest, NextResponse } from 'next/server'
import { getAzureMonthlyCosts } from '@/lib/azure/client'
import type { Period } from '@/lib/types'

export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get('period') ?? 'current') as Period
  try {
    const data = await getAzureMonthlyCosts(period)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Azure billing]', error)
    return NextResponse.json({ error: 'Failed to fetch Azure billing data' }, { status: 500 })
  }
}
