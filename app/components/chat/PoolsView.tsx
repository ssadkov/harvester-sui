'use client';

import { ProcessedPool } from '@/utils/poolUtils';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface PoolsViewProps {
  message: string;
  pools: ProcessedPool[];
}

const protocolIcons: { [key: string]: string } = {
  bluefin: 'https://bluefin.io/images/square.png',
  navi: 'https://app.naviprotocol.io/favicon.png',
  momentum: 'https://app.mmt.finance/assets/images/momentum-logo-sq.svg',
  scallop: 'https://app.scallop.io/images/logo-192.png',
};

const protocolLinks: { [key: string]: string } = {
  momentum: 'https://app.mmt.finance/leaderboard?refer=8EQO6A',
  scallop: 'https://app.scallop.io/referral?ref=670e31ea50cc539a9a3e2f84',
  bluefin: 'https://trade.bluefin.io/liquidity-pools',
  navi: 'https://app.naviprotocol.io/?code=539477413831118848',
};

type PoolType = 'all' | 'lending' | 'liquidity';

export function PoolsView({ message, pools }: PoolsViewProps) {
  const [selectedType, setSelectedType] = useState<PoolType>('all');

  const filteredPools = pools.filter(pool => {
    if (selectedType === 'all') return true;
    if (selectedType === 'lending') return pool.type.toLowerCase().includes('lending');
    if (selectedType === 'liquidity') return pool.type.toLowerCase().includes('impermanent loss');
    return true;
  });

  if (!pools || pools.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <div className="text-yellow-800 dark:text-yellow-200">
          {message}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-center mb-4 space-x-2">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-4 py-2 rounded ${
            selectedType === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => setSelectedType('lending')}
          className={`px-4 py-2 rounded ${
            selectedType === 'lending' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Кредитование
        </button>
        <button
          onClick={() => setSelectedType('liquidity')}
          className={`px-4 py-2 rounded ${
            selectedType === 'liquidity' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Ликвидность
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px] max-w-[700px] mx-auto">
          <thead>
            <tr className="bg-gray-100 dark:bg-zinc-800">
              <th className="px-4 py-2 text-left">Пул</th>
              <th className="px-4 py-2 text-right">APR</th>
              <th className="px-4 py-2 text-left">Риск</th>
              <th className="px-4 py-2 text-left">Протокол</th>
              <th className="px-4 py-2 text-right">TVL</th>
            </tr>
          </thead>
          <tbody>
            {filteredPools.map((pool, index) => (
              <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-zinc-800">
                <td className="px-4 py-2">
                  {pool.tokens.join(' / ')}
                </td>
                <td className="px-4 py-2 text-right font-medium text-green-600">
                  {(pool.totalApr * 100).toFixed(2)}%
                </td>
                <td className="px-4 py-2">
                  {pool.type.toLowerCase().includes('lending') ? (
                    <span className="text-xl">🟢</span>
                  ) : (
                    <span className="text-xl">🟡</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {protocolIcons[pool.protocol.toLowerCase()] && (
                      <Image
                        src={protocolIcons[pool.protocol.toLowerCase()]}
                        alt={pool.protocol}
                        width={20}
                        height={20}
                        className="rounded"
                        sizes="20px"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <Link 
                      href={protocolLinks[pool.protocol.toLowerCase()] || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="capitalize hover:text-blue-500 transition-colors"
                    >
                      {pool.protocol}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  ${(pool.tvl / 1000000).toFixed(2)}M
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-sm text-gray-500 mt-2 text-center p-2">
          Показываются только пулы с TVL более $10,000
        </div>
      </div>
    </div>
  );
} 