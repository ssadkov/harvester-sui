import { tool } from 'ai';
import { z } from 'zod';

// Моковые данные для пулов
const mockPools = [
  {
    name: 'SUI-ETH LP',
    protocol: 'Cetus',
    tvl: 1500000,
    apy: 12.5,
    risk: 'medium',
    tokens: {
      SUI: 45,
      ETH: 55
    }
  },
  {
    name: 'BTC-USDC LP',
    protocol: 'DeepBook',
    tvl: 2500000,
    apy: 8.2,
    risk: 'low',
    tokens: {
      BTC: 40,
      USDC: 60
    }
  }
];

type RiskLevel = 'low' | 'medium' | 'high';

export const viewPoolsTool = tool({
  description: 'Показать информацию о доступных пулах ликвидности',
  parameters: z.object({
    protocol: z.string().optional().describe('Фильтр по протоколу'),
    minApy: z.number().optional().describe('Минимальный APY'),
    maxRisk: z.enum(['low', 'medium', 'high']).optional().describe('Максимальный уровень риска')
  }),
  execute: async ({ protocol, minApy, maxRisk }) => {
    console.log('Filtering pools with params:', { protocol, minApy, maxRisk });
    
    let filteredPools = [...mockPools];
    
    if (protocol) {
      filteredPools = filteredPools.filter(pool => pool.protocol === protocol);
    }
    
    if (minApy) {
      filteredPools = filteredPools.filter(pool => pool.apy >= minApy);
    }
    
    if (maxRisk) {
      const riskLevels: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
      filteredPools = filteredPools.filter(pool => riskLevels[pool.risk as RiskLevel] <= riskLevels[maxRisk]);
    }
    
    console.log('Filtered pools:', filteredPools);
    
    return {
      type: 'ui',
      component: 'PoolsView',
      props: {
        pools: filteredPools
      }
    };
  }
}); 