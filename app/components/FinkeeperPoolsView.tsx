'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { 
  fetchFinkeeperPools, 
  filterPools, 
  sortPools, 
  getUniqueProtocols, 
  getUniqueTokens,
  type FinkeeperPool 
} from '@/app/utils/finkeeper-pools';
import Image from 'next/image';

// Иконки протоколов
const protocolIcons: { [key: string]: string } = {
  'Suilend': 'https://app.suilend.fi/favicon.ico',
  'Scallop': 'https://app.scallop.io/images/logo-192.png',
  'Momentum': 'https://app.mmt.finance/assets/images/momentum-logo-sq.svg',
  'Navi': 'https://app.naviprotocol.io/favicon.png',
  'Bluefin': 'https://bluefin.io/images/square.png',
};

// Ссылки на протоколы
const protocolLinks: { [key: string]: string } = {
  'Suilend': 'https://app.suilend.fi',
  'Scallop': 'https://app.scallop.io/referral?ref=670e31ea50cc539a9a3e2f84',
  'Momentum': 'https://app.mmt.finance/leaderboard?refer=8EQO6A',
  'Navi': 'https://app.naviprotocol.io/?code=539477413831118848',
  'Bluefin': 'https://trade.bluefin.io/liquidity-pools',
};

export function FinkeeperPoolsView() {
  const [pools, setPools] = useState<FinkeeperPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтры
  const [tokenSearch, setTokenSearch] = useState<string>('');
  
  // Сортировка
  const [sortConfig, setSortConfig] = useState<{
    key: 'rate' | 'tvl' | 'name' | 'protocol';
    direction: 'asc' | 'desc';
  }>({ key: 'rate', direction: 'desc' });

  const loadPools = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchFinkeeperPools();
      if (data.length === 0) {
        setError('No pools available at the moment. Please try again later.');
      } else {
        setPools(data);
      }
    } catch (err) {
      console.error('Error in FinkeeperPoolsView:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pools. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPools();
  }, []);

  // Фильтруем и сортируем пулы
  const filteredPools = useMemo(() => {
    let result = [...pools];
    
    // Применяем фильтры
    result = filterPools(result, {
      token: tokenSearch
    });
    
    // Применяем сортировку
    result = sortPools(result, sortConfig.key, sortConfig.direction);
    
    return result;
  }, [pools, tokenSearch, sortConfig]);

  const handleSort = (key: 'rate' | 'tvl' | 'name' | 'protocol') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortButton = ({ columnKey }: { columnKey: 'rate' | 'tvl' | 'name' | 'protocol' }) => (
    <button
      onClick={() => handleSort(columnKey)}
      className="ml-1 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
    >
      {sortConfig.key === columnKey ? (
        sortConfig.direction === 'asc' ? '↑' : '↓'
      ) : (
        <span className="text-zinc-400">↕</span>
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-lg font-medium text-red-500 mb-2">
          Error loading pools
        </div>
        <p className="text-sm text-zinc-500 mb-4">
          {error}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={loadPools}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-lg font-medium text-zinc-500 mb-2">
          No pools available
        </div>
        <p className="text-sm text-zinc-500">
          Please try again later
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <h2 className="text-2xl font-bold text-center mb-6">Discover earning opportunities</h2>

      {/* Таблица пулов */}
      <div className="overflow-x-auto">
        <table className="w-full max-w-4xl mx-auto">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left w-1/3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    Pool
                    <SortButton columnKey="name" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search by token..."
                    value={tokenSearch}
                    onChange={(e) => setTokenSearch(e.target.value)}
                    className="w-24 md:w-48 h-8 text-sm"
                  />
                </div>
              </th>
              <th className="px-3 py-2 text-left w-1/4">
                <div className="flex items-center">
                  Protocol
                  <SortButton columnKey="protocol" />
                </div>
              </th>
              <th className="px-3 py-2 text-right w-1/6">
                <div className="flex items-center justify-end">
                  APR
                  <SortButton columnKey="rate" />
                </div>
              </th>
              <th className="px-3 py-2 text-right hidden md:table-cell w-1/6">
                <div className="flex items-center justify-end">
                  TVL
                  <SortButton columnKey="tvl" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPools.map((pool) => (
              <tr key={pool.investmentId} className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <td className="px-3 py-2">
                  <div className="font-medium">{pool.investmentName}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {protocolIcons[pool.platformName] && (
                      <Image
                        src={protocolIcons[pool.platformName]}
                        alt={pool.platformName}
                        width={16}
                        height={16}
                        className="rounded"
                      />
                    )}
                    <a
                      href={protocolLinks[pool.platformName]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      {pool.platformName}
                    </a>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="text-green-600 dark:text-green-400">
                    {(parseFloat(pool.rate) * 100).toFixed(2)}%
                  </span>
                </td>
                <td className="px-3 py-2 text-right hidden md:table-cell">
                  ${parseFloat(pool.tvl).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Информация о количестве пулов */}
      <div className="text-sm text-zinc-500 text-center">
        Showing {filteredPools.length} of {pools.length} pools
      </div>
    </div>
  );
} 