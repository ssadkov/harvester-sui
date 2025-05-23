import { z } from 'zod';

// Интерфейсы для данных
export interface FinkeeperToken {
  tokenSymbol: string;
  tokenAddress: string;
  isBaseToken: boolean;
}

export interface FinkeeperPool {
  investmentId: string;
  investmentName: string;
  chainId: string;
  rate: string;
  investType: string;
  platformName: string;
  platformId: string;
  poolVersion: string;
  rateType: string;
  tvl: string;
  underlyingToken: FinkeeperToken[];
}

export interface FinkeeperPoolsResponse {
  code: number;
  msg: string;
  data: {
    investments: FinkeeperPool[];
    total: string;
  };
}

// Схема для параметров запроса
export const poolsRequestSchema = z.object({
  simplifyInvestType: z.string().default('101'),
  network: z.string().default('SUI'),
  offset: z.string().default('0'),
  sort: z.object({
    orders: z.array(z.object({
      direction: z.enum(['ASC', 'DESC']),
      property: z.string()
    }))
  }).default({
    orders: [{
      direction: 'DESC',
      property: 'RATE'
    }]
  })
});

// Кэш для результатов
const poolsCache = new Map<string, {
  data: FinkeeperPool[];
  timestamp: number;
}>();

// Время жизни кэша (2 секунды)
const CACHE_TTL = 2000;

// Функция для получения всех пулов с пагинацией
export async function fetchAllFinkeeperPools(): Promise<FinkeeperPool[]> {
  try {
    // Первый запрос для получения общего количества
    const initialParams = poolsRequestSchema.parse({});
    const initialResponse = await fetch('https://finkeeper-okx.vercel.app/api/defi/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(initialParams)
    });

    if (!initialResponse.ok) {
      throw new Error(`HTTP error! status: ${initialResponse.status}`);
    }

    const initialData = await initialResponse.json() as FinkeeperPoolsResponse;
    if (initialData.code !== 0) {
      throw new Error(`API error: ${initialData.msg}`);
    }

    const total = parseInt(initialData.data.total);
    console.log(`Total pools: ${total}`);

    // Собираем все пулы
    let allPools = [...initialData.data.investments];
    const pageSize = 10; // Размер страницы по умолчанию
    const totalPages = Math.ceil(total / pageSize);

    // Загружаем оставшиеся страницы
    for (let page = 1; page < totalPages; page++) {
      const offset = page * pageSize;
      console.log(`Fetching page ${page + 1} of ${totalPages} (offset: ${offset})`);

      // Ждем 1.2 секунды перед следующим запросом
      await new Promise(resolve => setTimeout(resolve, 1200));

      const pageParams = {
        ...initialParams,
        offset: offset.toString()
      };

      const pageResponse = await fetch('https://finkeeper-okx.vercel.app/api/defi/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pageParams)
      });

      if (!pageResponse.ok) {
        console.error(`Error fetching page ${page + 1}:`, pageResponse.status);
        continue;
      }

      const pageData = await pageResponse.json() as FinkeeperPoolsResponse;
      if (pageData.code === 0) {
        allPools = [...allPools, ...pageData.data.investments];
      }
    }

    console.log(`Successfully loaded ${allPools.length} pools`);
    return allPools;
  } catch (error) {
    console.error('Error fetching all pools:', error);
    return [];
  }
}

// Обновляем основную функцию для использования fetchAllFinkeeperPools
export async function fetchFinkeeperPools(params: Partial<z.infer<typeof poolsRequestSchema>> = {}): Promise<FinkeeperPool[]> {
  const cacheKey = 'all_pools';
  const cachedData = poolsCache.get(cacheKey);
  
  // Проверяем кэш
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    console.log('Using cached pools data');
    return cachedData.data;
  }

  try {
    console.log('Fetching all pools from Finkeeper API...');
    const allPools = await fetchAllFinkeeperPools();

    // Сохраняем в кэш
    poolsCache.set(cacheKey, {
      data: allPools,
      timestamp: Date.now()
    });

    return allPools;
  } catch (error) {
    console.error('Error fetching Finkeeper pools:', error);
    return [];
  }
}

// Функция для фильтрации пулов
export function filterPools(
  pools: FinkeeperPool[],
  filters: {
    token?: string;
    protocol?: string;
    minRate?: number;
    minTvl?: number;
  }
): FinkeeperPool[] {
  return pools.filter(pool => {
    if (filters.token && !pool.underlyingToken.some(token => 
      token.tokenSymbol.toLowerCase().includes(filters.token!.toLowerCase())
    )) {
      return false;
    }
    
    if (filters.protocol && pool.platformName.toLowerCase() !== filters.protocol.toLowerCase()) {
      return false;
    }
    
    if (filters.minRate && parseFloat(pool.rate) < filters.minRate) {
      return false;
    }
    
    if (filters.minTvl && parseFloat(pool.tvl) < filters.minTvl) {
      return false;
    }
    
    return true;
  });
}

// Функция для сортировки пулов
export function sortPools(
  pools: FinkeeperPool[],
  sortBy: 'rate' | 'tvl' | 'name' | 'protocol',
  direction: 'asc' | 'desc' = 'desc'
): FinkeeperPool[] {
  return [...pools].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'rate':
        comparison = parseFloat(a.rate) - parseFloat(b.rate);
        break;
      case 'tvl':
        comparison = parseFloat(a.tvl) - parseFloat(b.tvl);
        break;
      case 'name':
        comparison = a.investmentName.localeCompare(b.investmentName);
        break;
      case 'protocol':
        comparison = a.platformName.localeCompare(b.platformName);
        break;
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
}

// Функция для получения уникальных протоколов
export function getUniqueProtocols(pools: FinkeeperPool[]): string[] {
  return [...new Set(pools.map(pool => pool.platformName))].sort();
}

// Функция для получения уникальных токенов
export function getUniqueTokens(pools: FinkeeperPool[]): string[] {
  const tokens = new Set<string>();
  pools.forEach(pool => {
    pool.underlyingToken.forEach(token => {
      tokens.add(token.tokenSymbol);
    });
  });
  return [...tokens].sort();
} 