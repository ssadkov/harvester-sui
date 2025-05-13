import { Message } from "@/components/message";
import { CoreMessage, generateId } from "ai";
import { z } from "zod";

// Интерфейс для данных о пуле
interface PoolData {
  name: string;
  protocol: string;
  tvl: number;
  apy: number;
  risk: 'low' | 'medium' | 'high';
  tokens: {
    symbol: string;
    percentage: number;
  }[];
}

// Интерфейс для параметров фильтрации
interface PoolFilterParams {
  protocol?: string;
  minApy?: number;
  maxRisk?: 'low' | 'medium' | 'high';
}

// Функция для получения данных о пулах
async function fetchPoolData(): Promise<PoolData[]> {
  // TODO: Реализовать получение данных из API
  return [
    {
      name: "SUI-USDC",
      protocol: "Scallop",
      tvl: 1000000,
      apy: 12.5,
      risk: "low",
      tokens: [
        { symbol: "SUI", percentage: 50 },
        { symbol: "USDC", percentage: 50 }
      ]
    },
    {
      name: "SUI-ETH",
      protocol: "Scallop",
      tvl: 2500000,
      apy: 15.8,
      risk: "medium",
      tokens: [
        { symbol: "SUI", percentage: 60 },
        { symbol: "ETH", percentage: 40 }
      ]
    },
    {
      name: "BTC-USDC",
      protocol: "Scallop",
      tvl: 5000000,
      apy: 8.2,
      risk: "low",
      tokens: [
        { symbol: "BTC", percentage: 50 },
        { symbol: "USDC", percentage: 50 }
      ]
    },
    {
      name: "ETH-USDT",
      protocol: "Momentum",
      tvl: 3000000,
      apy: 18.5,
      risk: "high",
      tokens: [
        { symbol: "ETH", percentage: 55 },
        { symbol: "USDT", percentage: 45 }
      ]
    },
    {
      name: "SUI-USDT",
      protocol: "Momentum",
      tvl: 1500000,
      apy: 22.3,
      risk: "high",
      tokens: [
        { symbol: "SUI", percentage: 65 },
        { symbol: "USDT", percentage: 35 }
      ]
    }
  ];
}

// Tool для отображения информации о пулах
export const poolTools = {
  viewPools: {
    description: "Показать информацию о доступных пулах ликвидности",
    parameters: z.object({
      protocol: z.string().optional(),
      minApy: z.number().optional(),
      maxRisk: z.enum(['low', 'medium', 'high']).optional()
    }),
    generate: async function* ({ protocol, minApy, maxRisk }: PoolFilterParams) {
      const toolCallId = generateId();
      
      // Получаем данные о пулах
      const pools = await fetchPoolData();
      
      // Фильтруем пулы по параметрам
      const filteredPools = pools.filter(pool => {
        if (protocol && pool.protocol !== protocol) return false;
        if (minApy && pool.apy < minApy) return false;
        if (maxRisk) {
          const riskLevels: Record<PoolData['risk'], number> = { low: 1, medium: 2, high: 3 };
          if (riskLevels[pool.risk] > riskLevels[maxRisk]) return false;
        }
        return true;
      });

      // Форматируем данные для отображения
      const formattedPools = filteredPools.map(pool => ({
        name: pool.name,
        protocol: pool.protocol,
        tvl: `$${pool.tvl.toLocaleString()}`,
        apy: `${pool.apy.toFixed(2)}%`,
        risk: pool.risk,
        tokens: pool.tokens.map(t => `${t.symbol} (${t.percentage}%)`).join(' + ')
      }));

      return <Message 
        role="assistant" 
        content={
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Available Pools</h3>
            <div className="grid gap-4">
              {formattedPools.map((pool, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{pool.name}</h4>
                      <p className="text-sm text-gray-500">{pool.protocol}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">{pool.apy}</p>
                      <p className="text-sm text-gray-500">TVL: {pool.tvl}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm">
                      <span className="font-medium">Tokens:</span> {pool.tokens}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Risk:</span> {pool.risk}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        } 
      />;
    }
  }
}; 