import { getAwsMonthlyCosts } from '@/lib/aws/client'

jest.mock('@aws-sdk/client-cost-explorer', () => ({
  CostExplorerClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      ResultsByTime: [
        {
          TimePeriod: { Start: '2026-03-01', End: '2026-03-24' },
          Total: { BlendedCost: { Amount: '890.50', Unit: 'USD' } },
          Groups: [
            {
              Keys: ['Amazon EC2'],
              Metrics: { BlendedCost: { Amount: '420.00', Unit: 'USD' } },
            },
            {
              Keys: ['Amazon RDS'],
              Metrics: { BlendedCost: { Amount: '280.00', Unit: 'USD' } },
            },
          ],
        },
      ],
    }),
  })),
  GetCostAndUsageCommand: jest.fn(),
}))

process.env.AWS_ACCESS_KEY_ID = 'test-key'
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret'
process.env.AWS_DEFAULT_REGION = 'us-east-1'

describe('getAwsMonthlyCosts', () => {
  it('returns CloudDetailData shape', async () => {
    const result = await getAwsMonthlyCosts('current')
    expect(result.provider).toBe('aws')
    expect(typeof result.currentMonthCost).toBe('number')
    expect(result.topServices).toBeInstanceOf(Array)
    expect(result.history).toBeInstanceOf(Array)
  })

  it('includes service breakdown sorted by cost', async () => {
    const result = await getAwsMonthlyCosts('current')
    expect(result.topServices.length).toBeGreaterThan(0)
    expect(result.topServices[0]).toHaveProperty('name')
    expect(result.topServices[0]).toHaveProperty('cost')
    expect(result.topServices[0]).toHaveProperty('percentOfTotal')
    // Sorted descending
    if (result.topServices.length > 1) {
      expect(result.topServices[0].cost).toBeGreaterThanOrEqual(result.topServices[1].cost)
    }
  })

  it('calculates percentOfTotal correctly', async () => {
    const result = await getAwsMonthlyCosts('current')
    const total = result.topServices.reduce((sum, s) => sum + s.cost, 0)
    result.topServices.forEach((s) => {
      const expected = total > 0 ? (s.cost / total) * 100 : 0
      expect(s.percentOfTotal).toBeCloseTo(expected, 1)
    })
  })
})
