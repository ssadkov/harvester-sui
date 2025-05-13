"use client";

import { useState } from 'react';
import { PoolsList } from '@/components/PoolsList';
import { processPoolsData } from '@/utils/poolUtils';

export default function SuiPoolsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery) return;

    setLoading(true);
    setError(null);
    try {
      console.log('Sending request:', searchQuery);
      const response = await fetch(
        `/api/pools?search=${searchQuery.toLowerCase()}`,
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
        setError('No pools found');
        setPools([]);
        return;
      }

      const processedPools = processPoolsData(data);
      console.log('Processed pools:', processedPools);
      setPools(processedPools);
    } catch (error) {
      console.error('Error fetching pools:', error);
      setError(error instanceof Error ? error.message : 'Error occurred while searching pools');
      setPools([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">SUI Liquidity Pools Aggregator</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter token (usd, btc, usdc)"
            className="flex-1 px-3 py-2 border rounded"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {pools.length > 0 && (
        <div className="bg-white rounded shadow">
          <PoolsList pools={pools} />
        </div>
      )}
    </div>
  );
} 