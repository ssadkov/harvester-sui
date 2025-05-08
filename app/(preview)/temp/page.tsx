"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Wallet, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { PieChart, Pie, Tooltip } from 'recharts';
import { formatTokenBalance, formatUSDValue } from '@/app/utils/format';

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

interface TokenBalance {
  symbol: string;
  balance: string;
  decimals: number;
  value: number;
}

export default function ApiDataPage() {
  const wallet = useWallet();
  const [apiData, setApiData] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);

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

  useEffect(() => {
    const fetchBalances = async () => {
      if (!wallet.connected || !wallet.account || !apiData) return;
      
      setIsLoading(true);
      try {
        const balances = Object.values(apiData)
          .filter(token => parseFloat(token.usdPrice || '0') > 0)
          .map(token => ({
            symbol: token.symbol,
            balance: token.balance,
            decimals: token.decimals,
            value: parseFloat(token.usdPrice || '0'),
          }));
        setTokenBalances(balances);
      } catch (error) {
        console.error('Error processing balances:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (apiData) {
      fetchBalances();
    }
  }, [wallet.connected, wallet.account, apiData]);

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

  // Считаем общую сумму
  const totalValue = tokenBalances.reduce((sum, t) => sum + t.value, 0);

  // Фильтруем токены >10%, остальные в 'Others'
  const mainTokens = tokenBalances.filter(t => t.value / totalValue > 0.1);
  const othersTokens = tokenBalances.filter(t => t.value / totalValue <= 0.1);
  const othersValue = othersTokens.reduce((sum, t) => sum + t.value, 0);

  // Sapphire цвета для секторов
  const sapphireColors = [
    'hsl(221.2, 83.2%, 53.3%)', // chart-1
    'hsl(212, 95%, 68%)',      // chart-2
    'hsl(216, 92%, 60%)',      // chart-3
    'hsl(210, 98%, 78%)',      // chart-4
    'hsl(212, 97%, 87%)',      // chart-5
  ];

  const chartData = [
    ...mainTokens.map((token, index) => ({
      symbol: token.symbol,
      value: token.value,
      fill: sapphireColors[index % sapphireColors.length],
      decimals: token.decimals,
      balance: token.balance,
    })),
    ...(othersValue > 0
      ? [{ symbol: 'Others', value: othersValue, fill: sapphireColors[4], decimals: 0, balance: '0' }]
      : []),
  ];

  // Подписи с тикером и процентом
  const renderLabel = ({ symbol, percent }: any) => {
    if (percent < 0.05) return null;
    return `${symbol}: ${(percent * 100).toFixed(0)}%`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const t = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-2 shadow-lg">
          <p className="text-sm font-medium">{t.symbol}</p>
          <p className="text-sm text-muted-foreground">
            {formatUSDValue(t.value)}
          </p>
          <p className="text-xs text-zinc-500">
            {formatTokenBalance(t.balance, t.decimals)} {t.symbol}
          </p>
        </div>
      );
    }
    return null;
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
              
              {/* Круговая диаграмма */}
              {tokenBalances.length > 0 && (
                <Card className="flex flex-col mt-4">
                  <CardHeader className="items-center pb-0">
                    <CardTitle>Wallet Balance Distribution</CardTitle>
                    <CardDescription>Current token balances in USD</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0">
                    <div className="mx-auto aspect-square max-h-[250px]">
                      <PieChart width={250} height={250}>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="symbol"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          paddingAngle={4}
                          label={renderLabel}
                          labelLine={true}
                        />
                      </PieChart>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2 font-medium leading-none">
                      Total Value: ${chartData.reduce((sum, item) => sum + item.value, 0).toFixed(2)}
                    </div>
                    <div className="leading-none text-muted-foreground">
                      Showing tokens with non-zero balance
                    </div>
                  </CardFooter>
                </Card>
              )}

              {/* Список токенов */}
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
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <span className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
                              {token.symbol[0]}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium">{token.symbol}</h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {formatNumber(token.balance)} {token.symbol}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {token.usdPrice ? formatUSD(parseFloat(token.balance) * parseFloat(token.usdPrice)) : '-'}
                        </p>
                        {token.usdPrice && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            ${formatNumber(token.usdPrice)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}