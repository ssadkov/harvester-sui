interface Pool {
  pool_id: string | null;
  token1: string;
  token2: string | null;
  total_apr: number;
  reward1: string | null;
  reward2: string | null;
  reward1_apr: number | null;
  reward2_apr: number | null;
  protocol: string;
  type: string;
  tvl: number;
  volume_24: string;
  fees_24: string;
}

interface ProtocolPools {
  [key: string]: Pool;
}

interface PoolsResponse {
  [protocol: string]: ProtocolPools;
}

export interface ProcessedPool {
  tokens: string[];
  totalApr: number;
  protocol: string;
  type: string;
  tvl: number;
}

export function processPoolsData(data: PoolsResponse): ProcessedPool[] {
  const processedPools: ProcessedPool[] = [];

  // Проходим по всем протоколам
  Object.entries(data).forEach(([protocol, pools]) => {
    // Проходим по всем пулам в протоколе
    Object.values(pools).forEach((pool) => {
      const tokens = [pool.token1];
      if (pool.token2) {
        tokens.push(pool.token2);
      }

      let totalApr = typeof pool.total_apr === 'string' ? parseFloat(pool.total_apr) : pool.total_apr;
      
      // Корректируем APR для разных протоколов
      if (['bluefin', 'navi', 'momentum'].includes(protocol.toLowerCase())) {
        totalApr = totalApr / 100;
      }

      processedPools.push({
        tokens,
        totalApr,
        protocol,
        type: pool.type,
        tvl: typeof pool.tvl === 'string' ? parseFloat(pool.tvl) : pool.tvl
      });
    });
  });

  // Сортируем по APR в порядке убывания
  return processedPools.sort((a, b) => b.totalApr - a.totalApr);
}

export function formatApr(apr: number): string {
  return `${(apr * 100).toFixed(2)}%`;
}

export function formatTvl(tvl: number): string {
  if (tvl >= 1e9) {
    return `$${(tvl / 1e9).toFixed(2)}B`;
  } else if (tvl >= 1e6) {
    return `$${(tvl / 1e6).toFixed(2)}M`;
  } else if (tvl >= 1e3) {
    return `$${(tvl / 1e3).toFixed(2)}K`;
  }
  return `$${tvl.toFixed(2)}`;
} 