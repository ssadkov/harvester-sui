import { tool } from 'ai';
import { CoreMessage } from 'ai';
import { z } from 'zod';

interface TokenData {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  usdPrice: string;
  portfolioPercentage: number;
  iconUrl?: string;
}

interface TokenResult {
  type: 'ui';
  component: 'TokenView';
  props: {
    message: string;
    token: TokenData | null;
  };
}

// Моковые данные для токенов
const mockTokens: TokenData[] = [
  {
    symbol: 'SUI',
    name: 'SUI',
    balance: '1000.00',
    decimals: 9,
    usdPrice: '1.25',
    portfolioPercentage: 0,
    iconUrl: ''
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    balance: '5000.00',
    decimals: 6,
    usdPrice: '1.00',
    portfolioPercentage: 0,
    iconUrl: ''
  },
  {
    symbol: 'DEEP',
    name: 'DeepToken',
    balance: '2500.00',
    decimals: 9,
    usdPrice: '0.75',
    portfolioPercentage: 0,
    iconUrl: ''
  }
];

export const tokenTools = [
  tool<any, TokenResult>({
    description: 'Analyze a specific token in the user\'s wallet',
    parameters: z.object({
      symbol: z.string().describe('The symbol of the token to analyze (e.g., SUI, USDT)')
    }),
    execute: async ({ symbol }, { messages }: { messages: CoreMessage[] }) => {
      try {
        // Получаем контекст кошелька из системного сообщения
        const systemMessage = messages.find((m: CoreMessage) => m.role === 'system');
        if (!systemMessage?.content) {
          return {
            type: 'ui',
            component: 'TokenView',
            props: {
              message: 'Wallet context not found',
              token: null
            }
          };
        }

        const walletContextMatch = systemMessage.content.match(/Current wallet context: (.*)/);
        if (!walletContextMatch) {
          return {
            type: 'ui',
            component: 'TokenView',
            props: {
              message: 'Wallet context not found in system message',
              token: null
            }
          };
        }

        const walletContext = JSON.parse(walletContextMatch[1]);
        if (!walletContext?.connected || !walletContext?.account?.address) {
          return {
            type: 'ui',
            component: 'TokenView',
            props: {
              message: 'Wallet is not connected',
              token: null
            }
          };
        }

        // Делаем запрос к API
        const baseUrl = typeof window === 'undefined' ? process.env.NEXT_PUBLIC_BASE_URL : '';
        const response = await fetch(
          `${baseUrl}/api/tokens?symbol=${symbol}&address=${walletContext.account.address}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          return {
            type: 'ui',
            component: 'TokenView',
            props: {
              message: error.error || `Error fetching token data for ${symbol}`,
              token: null
            }
          };
        }

        const data = await response.json();
        return {
          type: 'ui',
          component: 'TokenView',
          props: {
            message: `Analysis of ${symbol}`,
            token: data.token
          }
        };
      } catch (error) {
        console.error('Error analyzing token:', error);
        return {
          type: 'ui',
          component: 'TokenView',
          props: {
            message: `Error analyzing token: ${error instanceof Error ? error.message : 'Unknown error'}`,
            token: null
          }
        };
      }
    }
  })
]; 