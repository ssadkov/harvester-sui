"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import Image from 'next/image';

interface Token {
  coinType: string;
  totalBalance: string;
  decimals: number;
  name: string;
  symbol: string;
  description: string;
  iconUrl: string | null;
  id: string;
  balance: string;
  price?: string;
  usdPrice?: string;
}

interface TokenData {
  [key: string]: Token;
}

export default function ApiDataPage() {
  const wallet = useWallet();
  const [apiData, setApiData] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!wallet.connected || !wallet.account) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/proxy?address=${wallet.account.address}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        setApiData(data);
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (wallet.connected && wallet.account) {
      fetchData();
    }
  }, [wallet.connected, wallet.account]);

  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (n === 0) return '0';
    if (n < 0.000001) return n.toExponential(2);
    if (n < 0.01) return n.toFixed(6);
    if (n < 1) return n.toFixed(4);
    if (n < 100) return n.toFixed(2);
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatUSD = (num: string | number) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Wallet Tokens</CardTitle>
            {wallet.connected && wallet.account && (
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="h-4 w-4 text-emerald-500" />
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {wallet.account.address}
                </span>
                <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs px-2 py-0.5 rounded-full">
                  Connected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => wallet.disconnect()}
                  className="ml-2"
                >
                  Disconnect
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!wallet.connected ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">Connect your wallet to view tokens</p>
              <Button onClick={() => wallet.select('sui')}>Connect Wallet</Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 dark:text-zinc-400">Loading tokens...</p>
            </div>
          ) : error ? (
            <div className="text-red-500 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              Error: {error}
            </div>
          ) : apiData ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={fetchData}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? 'Refreshing...' : 'Refresh Tokens'}
                </Button>
              </div>
              <div className="grid gap-4">
                {Object.entries(apiData).map(([key, token]) => (
                  <Card key={key} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {token.iconUrl ? (
                          <div className="w-10 h-10 relative rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                            <Image
                              src={token.iconUrl}
                              alt={token.symbol}
                              fill
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <span className="text-lg font-medium text-zinc-500">
                              {token.symbol[0]}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium">{token.name}</h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">{token.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNumber(token.balance)} {token.symbol}</p>
                        {token.usdPrice && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {formatUSD(token.usdPrice)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-zinc-500 dark:text-zinc-400">No tokens found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}