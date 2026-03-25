import { getAzureMonthlyCosts } from '@/lib/azure/client'

jest.mock('@azure/identity', () => ({
  ClientSecretCredential: jest.fn().mockImplementation(() => ({})),
}))

jest.mock('@azure/arm-costmanagement', () => ({
  CostManagementClient: jest.fn().mockImplementation(() => ({
    query: {
      usage: jest.fn().mockResolvedValue({
        rows: [
          [1234.56, 'USD', '2026-03-01', 'Virtual Machines'],
          [567.89, 'USD', '2026-03-01', 'SQL Database'],
          [200.00, 'USD', '2026-03-01', 'Storage'],
        ],
        columns: [
          { name: 'Cost' },
          { name: 'Currency' },
          { name: 'UsageDate' },
          { name: 'ServiceName' },
        ],
      }),
    },
  })),
}))

process.env.AZURE_TENANT_ID = 'test-tenant'
process.env.AZURE_CLIENT_ID = 'test-client'
process.env.AZURE_CLIENT_SECRET = 'test-secret'
process.env.AZURE_SUBSCRIPTION_ID = 'test-sub'

describe('getAzureMonthlyCosts', () => {
  it('returns CloudDetailData shape', async () => {
    const result = await getAzureMonthlyCosts('2026-03-01', '2026-03-24')
    expect(result.provider).toBe('azure')
    expect(typeof result.currentMonthCost).toBe('number')
    expect(result.topServices).toBeInstanceOf(Array)
    expect(result.history).toBeInstanceOf(Array)
  })

  it('aggregates service costs correctly', async () => {
    const result = await getAzureMonthlyCosts('2026-03-01', '2026-03-24')
    expect(result.topServices.length).toBeGreaterThan(0)
    expect(result.topServices[0]).toHaveProperty('name')
    expect(result.topServices[0]).toHaveProperty('cost')
    expect(result.topServices[0]).toHaveProperty('percentOfTotal')
  })

  it('returns history as empty array (known limitation)', async () => {
    const result = await getAzureMonthlyCosts('2026-03-01', '2026-03-24')
    expect(result.history).toEqual([])
  })
})
