import { ProcessedPool, formatApr, formatTvl } from '@/utils/poolUtils';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';

interface PoolsListProps {
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

export function PoolsList({ pools }: PoolsListProps) {
  const [selectedType, setSelectedType] = useState<PoolType>('all');

  const filteredPools = pools.filter(pool => {
    if (selectedType === 'all') return true;
    if (selectedType === 'lending') return pool.type.toLowerCase().includes('lending');
    if (selectedType === 'liquidity') return pool.type.toLowerCase().includes('impermanent loss');
    return true;
  });

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
          All
        </button>
        <button
          onClick={() => setSelectedType('lending')}
          className={`px-4 py-2 rounded ${
            selectedType === 'lending' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Lending
        </button>
        <button
          onClick={() => setSelectedType('liquidity')}
          className={`px-4 py-2 rounded ${
            selectedType === 'liquidity' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Liquidity Pools
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Pool</th>
              <th className="px-4 py-2 text-right">APR</th>
              <th className="px-4 py-2 text-left">Risk Factor</th>
              <th className="px-4 py-2 text-left">Protocol</th>
              <th className="px-4 py-2 text-right">TVL</th>
            </tr>
          </thead>
          <tbody>
            {filteredPools.map((pool, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">
                  {pool.tokens.join(' / ')}
                </td>
                <td className="px-4 py-2 text-right font-medium text-green-600">
                  {formatApr(pool.totalApr)}
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
                  {formatTvl(pool.tvl, pool.protocol)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-sm text-gray-500 mt-2 text-center">
          Only pools with TVL over $10,000 are displayed
        </div>
      </div>
    </div>
  );
} 