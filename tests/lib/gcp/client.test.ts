import { getGcpMonthlyCosts } from '@/lib/gcp/client'

// Mock the BigQuery SDK
jest.mock('@google-cloud/bigquery', () => ({
  BigQuery: jest.fn().mockImplementation(() => ({
    dataset: jest.fn().mockReturnValue({
      getTables: jest.fn().mockResolvedValue([[{ id: 'gcp_billing_export_resource_v1_000000_000000_000000' }]]),
    }),
    query: jest.fn().mockResolvedValue([[]]),
  })),
}))

// Set required env vars
process.env.GCP_SERVICE_ACCOUNT_KEY = Buffer.from(
  JSON.stringify({ type: 'service_account', project_id: 'test', client_email: 'test@test.iam.gserviceaccount.com', private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3xHn/ygWep4PAtEsHAXXnKEBJ\n-----END RSA PRIVATE KEY-----\n' })
).toString('base64')
process.env.GCP_PROJECT_ID = 'test-project'
process.env.GCP_BIGQUERY_DATASET = 'test-dataset'

describe('getGcpMonthlyCosts', () => {
  it('returns CloudDetailData shape without throwing', async () => {
    const result = await getGcpMonthlyCosts('2026-03-01', '2026-03-24')
    expect(result.provider).toBe('gcp')
    expect(typeof result.currentMonthCost).toBe('number')
    expect(result.topServices).toBeInstanceOf(Array)
    expect(result.history).toBeInstanceOf(Array)
    expect(typeof result.percentChange).toBe('number')
  })

  it('returns zero costs when BigQuery returns empty rows', async () => {
    const result = await getGcpMonthlyCosts('2026-03-01', '2026-03-24')
    expect(result.currentMonthCost).toBe(0)
    expect(result.topServices).toHaveLength(0)
  })
})
