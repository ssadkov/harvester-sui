import { tool } from 'ai';
import { z } from 'zod';
import { PoolsList } from '@/components/PoolsList';
import { processPoolsData } from '@/utils/poolUtils';

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
  description: 'Show liquidity pools for the specified token',
  parameters: z.object({
    token: z.string().describe('Token to search pools for (e.g., usdc, btc, sui)'),
  }),
  execute: async ({ token }) => {
    try {
      console.log('Fetching pools for token:', token);
      const baseUrl = typeof window === 'undefined' ? process.env.NEXT_PUBLIC_BASE_URL : '';
      const response = await fetch(
        `${baseUrl}/api/pools?search=${token.toLowerCase()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      if (!data || Object.keys(data).length === 0) {
        return {
          type: 'ui',
          component: 'PoolsView',
          props: {
            message: 'No pools found',
            pools: []
          }
        };
      }

      const processedPools = processPoolsData(data);
      console.log('Processed pools:', processedPools);
      
      return {
        type: 'ui',
        component: 'PoolsView',
        props: {
          message: `Found pools: ${processedPools.length}`,
          pools: processedPools
        }
      };
    } catch (error) {
      console.error('Error fetching pools:', error);
      return {
        type: 'ui',
        component: 'PoolsView',
        props: {
          message: 'Error fetching pool data',
          pools: []
        }
      };
    }
  }
}); 