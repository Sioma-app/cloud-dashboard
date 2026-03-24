import { getGcpMonthlyCosts } from '@/lib/gcp/client'

// Mock only the external SDK, not the module under test
jest.mock('@google-cloud/billing', () => ({
  CloudBillingClient: jest.fn().mockImplementation(() => ({
    getBillingAccount: jest.fn().mockResolvedValue([{ name: 'test' }]),
  })),
}))

// Set required env vars
process.env.GCP_SERVICE_ACCOUNT_KEY = Buffer.from(
  JSON.stringify({ type: 'service_account', project_id: 'test' })
).toString('base64')
process.env.GCP_PROJECT_ID = 'test-project'
process.env.GCP_BILLING_ACCOUNT_ID = '000000-000000-000000'

describe('getGcpMonthlyCosts', () => {
  it('returns CloudDetailData shape without throwing', async () => {
    const result = await getGcpMonthlyCosts('current')
    expect(result.provider).toBe('gcp')
    expect(typeof result.currentMonthCost).toBe('number')
    expect(result.topServices).toBeInstanceOf(Array)
    expect(result.history).toBeInstanceOf(Array)
    expect(typeof result.percentChange).toBe('number')
  })

  it('returns zero costs when stub returns empty data', async () => {
    const result = await getGcpMonthlyCosts('current')
    expect(result.currentMonthCost).toBe(0)
  })
})
