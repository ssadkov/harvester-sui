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

type PoolType = 'stable' | 'risk' | 'lending';

export function PoolsView({ message, pools }: PoolsViewProps) {
  const [selectedType, setSelectedType] = useState<PoolType>('stable');

  const filteredPools = pools.filter(pool => {
    // Filter by TVL first
    if (pool.tvl < 100000) return false;
    
    // Then apply type filter
    if (selectedType === 'stable') {
      if (pool.type.toLowerCase().includes('lending')) return true;
      if (['bluefin', 'momentum'].includes(pool.protocol.toLowerCase())) {
        const tokens = pool.tokens.map(t => t.toUpperCase());
        return tokens[0].includes('USD') && tokens[1].includes('USD') || 
               tokens[0].slice(-3) === tokens[1].slice(-3);
      }
      return true;
    }
    if (selectedType === 'risk') {
      if (['bluefin', 'momentum'].includes(pool.protocol.toLowerCase())) {
        const tokens = pool.tokens.map(t => t.toUpperCase());
        return !(tokens[0].includes('USD') && tokens[1].includes('USD') || 
                tokens[0].slice(-3) === tokens[1].slice(-3));
      }
      return false;
    }
    return true;
  });

  // Calculate average APR for each category
  const averageApr = filteredPools.length > 0 
    ? (filteredPools.reduce((sum, pool) => sum + pool.totalApr, 0) / filteredPools.length * 100).toFixed(2)
    : '0.00';

  const getTabDescription = (type: PoolType) => {
    switch (type) {
      case 'stable':
        return "Stable pools include lending positions and liquidity pools with wrapped tokens or stablecoin pairs. Examples: USDC/USDT, wBTC/LBTC";
      case 'risk':
        return "Risk pools are liquidity positions with different underlying assets. Examples: DEEP/USDC, WAL/USDC, wBTC/USDC";
      case 'lending':
        return "Lending pools offer the lowest risk. Examples: USDC lending, SUI lending";
      default:
        return "";
    }
  };

  const getTabFooterDescription = (type: PoolType) => {
    switch (type) {
      case 'stable':
        return "Stable pools are recommended for conservative investors. They provide steady returns with minimal impermanent loss risk. Perfect for long-term positions.";
      case 'risk':
        return "Risk pools offer higher potential returns but come with increased impermanent loss risk. Suitable for experienced traders who can actively manage their positions.";
      case 'lending':
        return "Lending pools provide a secure way to earn passive income. Your assets are protected by over-collateralization and liquidation mechanisms.";
      default:
        return "";
    }
  };

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
          onClick={() => setSelectedType('stable')}
          className={`px-4 py-2 rounded ${
            selectedType === 'stable' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Stable
        </button>
        <button
          onClick={() => setSelectedType('risk')}
          className={`px-4 py-2 rounded ${
            selectedType === 'risk' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Risk
        </button>
      </div>

      <div className="p-4 text-sm text-gray-600 dark:text-gray-400 border-b">
        {getTabDescription(selectedType)}
      </div>
      <table className="w-full border-collapse min-w-[600px] max-w-[700px] mx-auto">
        <thead>
          <tr className="bg-gray-100 dark:bg-zinc-800">
            <th className="px-4 py-2 text-left">Pool</th>
            <th className="px-4 py-2 text-right">APR</th>
            <th className="px-4 py-2 text-left">Risk</th>
            <th className="px-4 py-2 text-left">Protocol</th>
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
                  <span className="text-xl" title="Lending pool - lowest risk">🟢</span>
                ) : ['bluefin', 'momentum'].includes(pool.protocol.toLowerCase()) ? (
                  (() => {
                    const tokens = pool.tokens.map(t => t.toUpperCase());
                    const isStable = tokens[0].includes('USD') && tokens[1].includes('USD') || 
                                   tokens[0].slice(-3) === tokens[1].slice(-3);
                    return (
                      <span 
                        className="text-xl" 
                        title={isStable 
                          ? "Stable pool - wrapped tokens or stablecoins pair" 
                          : "Volatile pool - different underlying assets"}
                      >
                        {isStable ? '🟡' : '🔴'}
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-xl" title="Liquidity pool - medium risk">🟡</span>
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
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-sm text-gray-500 mt-2 text-center p-2 border-t">
        <div>Only pools with TVL over $100,000 are shown</div>
        <div className="mt-1 font-medium">Average APR: {averageApr}%</div>
        <div className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {getTabFooterDescription(selectedType)}
        </div>
      </div>
    </div>
  );
} 