"use client";

import { useState, useEffect } from "react";
import { useWallet } from '@suiet/wallet-kit';
import { ConnectButton } from '@suiet/wallet-kit';
import { Wallet, ChevronRight, ChevronDown, Menu, CreditCard, ChevronLeft, Copy, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { PoolsView } from '../components/chat/PoolsView';
import { processPoolsData } from '@/utils/poolUtils';
import { formatTokenBalance, formatUSDValue } from '@/app/utils/format';
import { Token, sortTokensByValue, fetchMomentumBalance, fetchScallopBalance } from '@/app/actions/balance-actions';

// Интерфейсы для данных
interface Pool {
  pool_id: string | null;
  token1: string;
  token2: string | null;
  total_apr: number | string;
  reward1: string | null;
  reward2: string | null;
  reward1_apr: number | string | null;
  reward2_apr: number | string | null;
  protocol: string;
  type: string;
  tvl: string;
  volume_24: string;
  fees_24: string;
}

interface PoolsData {
  [protocol: string]: {
    [key: string]: Pool;
  };
}

interface TokenWithBalance {
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

// Функция для форматирования чисел
const formatNumber = (num: number | string, digits = 2) => {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  
  if (numValue < 0.00001 && numValue > 0) {
    return numValue.toExponential(4);
  }
  
  const decimals = numValue < 1 && numValue > 0 ? 6 : digits;
  
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
};

// Компонент для отображения пулов токена
const TokenPools = ({ symbol }: { symbol: string }) => {
  const [pools, setPools] = useState<any[]>([]);
  const [isLoadingPools, setIsLoadingPools] = useState(false);
  const [selectedType, setSelectedType] = useState<'stable' | 'risk'>('stable');

  useEffect(() => {
    const abortController = new AbortController();

    const fetchPools = async () => {
      console.log('Fetching pools for symbol:', symbol);
      
      if (poolsCache.has(symbol)) {
        console.log('Using cached pools for:', symbol);
        setPools(poolsCache.get(symbol)!);
        return;
      }

      setIsLoadingPools(true);
      try {
        const baseUrl = typeof window === 'undefined' ? process.env.NEXT_PUBLIC_BASE_URL : '';
        const url = `${baseUrl}/api/pools?search=${symbol.toLowerCase()}`;
        console.log('Fetching from URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortController.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data);
        
        if (data && Object.keys(data).length > 0) {
          const processedPools = processPoolsData(data);
          console.log('Processed pools:', processedPools);
          poolsCache.set(symbol, processedPools);
          setPools(processedPools);
        } else {
          console.log('No pools data received');
          poolsCache.set(symbol, []);
          setPools([]);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Request was aborted');
        } else {
          console.error('Error fetching pools:', error);
          poolsCache.set(symbol, []);
          setPools([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingPools(false);
        }
      }
    };

    fetchPools();

    return () => {
      abortController.abort();
    };
  }, [symbol]);

  const stablePools = pools.filter(pool => {
    if (pool.type.toLowerCase().includes('lending')) return true;
    if (['bluefin', 'momentum'].includes(pool.protocol.toLowerCase())) {
      const token1 = pool.token1?.toUpperCase() || '';
      const token2 = pool.token2?.toUpperCase() || '';
      return token1.includes('USD') && token2.includes('USD') || 
             token1.slice(-3) === token2.slice(-3);
    }
    return true;
  });

  const riskPools = pools.filter(pool => {
    if (['bluefin', 'momentum'].includes(pool.protocol.toLowerCase())) {
      const token1 = pool.token1?.toUpperCase() || '';
      const token2 = pool.token2?.toUpperCase() || '';
      return !(token1.includes('USD') && token2.includes('USD') || 
              token1.slice(-3) === token2.slice(-3));
    }
    return false;
  });

  if (isLoadingPools) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white"></div>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          No pools found for {symbol}
        </div>
        <p className="text-sm text-zinc-500">
          Try searching for a different token or check back later
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Earn ideas for {symbol}
        </h2>
        <p className="text-sm text-zinc-500">
          Found {pools.length} pools where you can earn rewards
        </p>
      </div>

      <PoolsView 
        message={`No pools found for ${symbol}`}
        pools={pools}
      />
    </div>
  );
};

// Кэш для результатов запросов
const poolsCache = new Map<string, any[]>();

// Основной компонент страницы
export default function ControlPage() {
  const wallet = useWallet();
  const [showAssetPanel, setShowAssetPanel] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [poolsData, setPoolsData] = useState<PoolsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{ type: string; data: TokenWithBalance; name: string; value: number; logo?: string } | null>(null);
  const [userTokens, setUserTokens] = useState<TokenWithBalance[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [hideSmallAssets, setHideSmallAssets] = useState(false);
  const [showTokens, setShowTokens] = useState(true);
  const [showPositions, setShowPositions] = useState(true);
  const [momentumData, setMomentumData] = useState<any>(null);
  const [scallopData, setScallopData] = useState<any>(null);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [showMomentum, setShowMomentum] = useState(true);
  const [showScallop, setShowScallop] = useState(true);

  // Преобразуем poolsData в массив пулов
  const filteredPools = poolsData ? Object.entries(poolsData).flatMap(([protocol, pools]) =>
    Object.entries(pools).map(([_, pool]) => ({
      ...pool,
      protocol,
      tokens: [pool.token1, pool.token2].filter(Boolean)
    }))
  ) : [];

  // Проверяем мобильное отображение
  useEffect(() => {
    const checkIfMobile = () => {
      if (window.innerWidth < 768) {
        setIsMobileView(true);
        setShowAssetPanel(false);
      } else {
        setIsMobileView(false);
        setShowAssetPanel(true);
      }
    };
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Загружаем токены пользователя при подключении кошелька
  useEffect(() => {
    if (wallet.connected && wallet.account) {
      fetchUserAssets();
    }
  }, [wallet.connected, wallet.account]);

  // Функция для загрузки активов пользователя
  const fetchUserAssets = async () => {
    if (!wallet.connected || !wallet.account) {
      console.log('Wallet not connected or no account');
      return;
    }
    
    setIsLoadingAssets(true);
    
    try {
      const address = wallet.account.address;
      console.log('Fetching tokens for address:', address);
      
      const url = `/api/tokens?address=${address}`;
      console.log('Request URL:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw API response:', data);
      
      if (!data || typeof data !== 'object') {
        console.error('Invalid data format received:', data);
        throw new Error('Invalid data format received from API');
      }
      
      // Преобразуем объект в массив токенов
      const tokensArray = Object.entries(data).map(([id, token]: [string, any]) => {
        console.log('Processing token:', id, token);
        const balance = parseFloat(token.totalBalance) / Math.pow(10, token.decimals);
        const usdPrice = token.price ? balance * parseFloat(token.price) : 0;
        
        return {
          ...token,
          id,
          balance: balance.toString(),
          usdPrice: usdPrice.toString(),
          coinType: id,
          totalBalance: token.totalBalance,
          decimals: token.decimals || 0,
          name: token.name || token.symbol || 'Unknown Token',
          symbol: token.symbol || '???',
          description: token.description || '',
          iconUrl: token.iconUrl || null
        };
      });
      
      console.log('Processed tokens array:', tokensArray);
      
      // Сортируем токены по стоимости в USD
      const sortedTokens = tokensArray.sort((a, b) => {
        const valueA = parseFloat(a.usdPrice || '0');
        const valueB = parseFloat(b.usdPrice || '0');
        return valueB - valueA;
      });
      
      console.log('Final sorted tokens:', sortedTokens);
      
      setUserTokens(sortedTokens);
    } catch (error) {
      console.error('Error fetching assets:', error);
      setUserTokens([]);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  // Функция для загрузки позиций
  const fetchUserPositions = async () => {
    if (!wallet.connected || !wallet.account) return;
    
    setIsLoadingPositions(true);
    try {
      // Получаем данные Momentum
      const momentumResult = await fetchMomentumBalance(wallet.account.address);
      setMomentumData(momentumResult.raw || []);

      // Получаем данные Scallop
      const scallopResult = await fetchScallopBalance(wallet.account.address);
      setScallopData(scallopResult.raw || null);
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setIsLoadingPositions(false);
    }
  };

  // Загружаем позиции при подключении кошелька
  useEffect(() => {
    if (wallet.connected && wallet.account) {
      fetchUserPositions();
    }
  }, [wallet.connected, wallet.account]);

  return (
    <div className="flex flex-row justify-between h-dvh bg-white dark:bg-zinc-900">
      {/* Overlay для мобильного drawer */}
      {isMobileView && showAssetPanel && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setShowAssetPanel(false)}
        />
      )}

      {/* Asset panel - mobile drawer/fullscreen + desktop sidebar */}
      <AnimatePresence>
        {showAssetPanel && (
          <motion.div
            initial={{ x: isMobileView ? '-100%' : 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobileView ? '-100%' : 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={
              isMobileView
                ? "fixed top-0 left-0 w-full h-full z-50 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto"
                : "border-r border-zinc-200 dark:border-zinc-700 h-full max-h-screen overflow-y-auto bg-white dark:bg-zinc-800 z-10 w-1/3"
            }
          >
            <div className="p-4">
              {/* Header with logo and title */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 relative rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <Image
                    src="/logo.png"
                    alt="Harvester SUI"
                    fill
                    className="object-contain"
                  />
                </div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  Harvester SUI
                </h1>
              </div>

              {/* Header with wallet info and assets */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">My Assets</h2>
                  {wallet.connected && (
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      ${formatNumber(userTokens.reduce((sum, token) => sum + parseFloat(token.usdPrice || '0'), 0))}
                    </span>
                  )}
                  <button
                    onClick={() => fetchUserAssets()}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                    title="Refresh all balances"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-zinc-500 ${isLoadingAssets ? 'animate-spin' : ''}`}>
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                      <path d="M16 21h5v-5"/>
                    </svg>
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAssetPanel(false)}
                  className="md:hidden"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Wallet connection status */}
              <div className="mb-6">
                {wallet.connected && wallet.account ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Wallet className="h-4 w-4 text-emerald-500" />
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {wallet.account.address.substring(0, 6)}...{wallet.account.address.substring(wallet.account.address.length - 4)}
                    </span>
                    <button
                      onClick={() => {
                        if (wallet.account) {
                          navigator.clipboard.writeText(wallet.account.address);
                        }
                      }}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                      title="Copy address"
                    >
                      <Copy className="h-4 w-4 text-zinc-500" />
                    </button>
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
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Wallet className="h-4 w-4 text-zinc-400" />
                      <span className="text-zinc-500 dark:text-zinc-400">Connect wallet to see list of assets</span>
                    </div>
                    <div className="mt-1">
                      <ConnectButton label="Connect SUI wallet" />
                    </div>
                  </div>
                )}
              </div>

              {/* Галка Hide assets под заголовком */}
              <div className="mb-2">
                <label className="flex items-center gap-2 text-sm text-zinc-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideSmallAssets}
                    onChange={(e) => setHideSmallAssets(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-600"
                  />
                  Hide assets &lt;$1
                </label>
              </div>

              {/* Wallet section */}
              <div className="mb-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <div className="flex flex-row items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900">
                  <div className="flex-1">
                    <button
                      onClick={() => setShowTokens(!showTokens)}
                      className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded px-2 py-1"
                    >
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        Wallet {wallet.connected ? `$${formatNumber(userTokens.reduce((sum, token) => sum + parseFloat(token.usdPrice || '0'), 0))}` : ''}
                      </span>
                      {showTokens ? (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                      )}
                    </button>
                  </div>
                </div>
                
                {showTokens && (
                  <div className="p-3">
                    {isLoadingAssets ? (
                      <div className="flex justify-center py-4">
                        <span className="text-sm text-zinc-500">Loading tokens...</span>
                      </div>
                    ) : userTokens && userTokens.length > 0 ? (
                      <div className="space-y-2">
                        {userTokens
                          .filter(token => !hideSmallAssets || parseFloat(token.usdPrice || '0') >= 1)
                          .map((token) => (
                            <div 
                              key={token.id} 
                              className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                              onClick={() => setSelectedAsset({
                                type: 'token',
                                data: token,
                                name: token.symbol,
                                value: parseFloat(token.usdPrice || '0'),
                                logo: token.iconUrl || undefined
                              })}
                            >
                              <div className="flex items-center gap-2">
                                {token.iconUrl ? (
                                  <div className="w-6 h-6 relative rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                    <Image
                                      src={token.iconUrl}
                                      alt={token.symbol}
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                    <span className="text-xs font-medium text-zinc-500">
                                      {(token.symbol && token.symbol.length > 0) ? token.symbol[0] : '?'}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium">{token.symbol}</p>
                                  <p className="text-xs text-zinc-500">{token.name}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {formatNumber(parseFloat(token.balance || '0'))} {token.symbol}
                                </p>
                                {parseFloat(token.usdPrice || '0') > 0 && (
                                  <p className="text-xs text-zinc-500">
                                    ${formatNumber(parseFloat(token.usdPrice || '0'))}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : wallet.connected ? (
                      <div className="text-center py-4 text-sm text-zinc-500">
                        No tokens found
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-zinc-500">
                        Connect wallet to view positions
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Momentum Protocol Block */}
              <div className="mb-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <div className="flex flex-row items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900">
                  <div className="flex-1">
                    <button
                      onClick={() => setShowMomentum(!showMomentum)}
                      className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded px-2 py-1"
                    >
                      <Image
                        src="https://app.mmt.finance/assets/images/momentum-logo-sq.svg"
                        alt="Momentum"
                        width={16}
                        height={16}
                        className="rounded"
                      />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        Momentum {momentumData && momentumData.length > 0 ? `$${formatNumber(momentumData.reduce((sum: number, pos: any) => sum + (pos.amount || 0), 0))}` : ''}
                      </span>
                      {showMomentum ? (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                      )}
                    </button>
                  </div>
                </div>
                
                {showMomentum && (
                  <div className="p-3">
                    {isLoadingPositions ? (
                      <div className="flex justify-center py-4">
                        <span className="text-sm text-zinc-500">Loading positions...</span>
                      </div>
                    ) : wallet.connected ? (
                      momentumData && momentumData.length > 0 ? (
                        <div className="space-y-2">
                          {momentumData.map((position: any, index: number) => (
                            <div key={index} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                              <div className="text-sm">
                                <div className="flex justify-between">
                                  <span>Value:</span>
                                  <span className="font-medium">${formatNumber(position.amount)}</span>
                                </div>
                                {position.claimableRewards > 0 && (
                                  <div className="flex justify-between text-green-600">
                                    <span>Rewards:</span>
                                    <span className="font-medium">${formatNumber(position.claimableRewards)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-sm text-zinc-500">
                          No active positions
                        </div>
                      )
                    ) : (
                      <div className="text-center py-4 text-sm text-zinc-500">
                        Connect wallet to view positions
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Scallop Protocol Block */}
              <div className="mb-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <div className="flex flex-row items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900">
                  <div className="flex-1">
                    <button
                      onClick={() => setShowScallop(!showScallop)}
                      className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded px-2 py-1"
                    >
                      <Image
                        src="https://app.scallop.io/images/logo-192.png"
                        alt="Scallop"
                        width={16}
                        height={16}
                        className="rounded"
                      />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        Scallop {scallopData && scallopData.lendings && scallopData.lendings.length > 0 ? `$${formatNumber(scallopData.lendings.reduce((sum: number, lending: any) => sum + (lending.suppliedValue || 0), 0))}` : ''}
                      </span>
                      {showScallop ? (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                      )}
                    </button>
                  </div>
                </div>
                
                {showScallop && (
                  <div className="p-3">
                    {isLoadingPositions ? (
                      <div className="flex justify-center py-4">
                        <span className="text-sm text-zinc-500">Loading positions...</span>
                      </div>
                    ) : wallet.connected ? (
                      scallopData && scallopData.lendings && scallopData.lendings.length > 0 ? (
                        <div className="space-y-2">
                          {scallopData.lendings.map((lending: any, index: number) => (
                            <div key={index} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                              <div className="text-sm">
                                <div className="flex justify-between">
                                  <span>{lending.symbol}:</span>
                                  <span className="font-medium">${formatNumber(lending.suppliedValue)}</span>
                                </div>
                                <div className="flex justify-between text-green-600">
                                  <span>APY:</span>
                                  <span className="font-medium">{formatNumber(lending.supplyApy)}%</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-sm text-zinc-500">
                          No active positions
                        </div>
                      )
                    ) : (
                      <div className="text-center py-4 text-sm text-zinc-500">
                        Connect wallet to view positions
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile toggle button for asset panel */}
      {isMobileView && !showAssetPanel && (
        <button
          onClick={() => setShowAssetPanel(true)}
          className="fixed top-4 left-4 z-50 bg-white dark:bg-zinc-800 shadow-md rounded-md p-2"
        >
          <Menu className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
        </button>
      )}

      {/* Main content area */}
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {selectedAsset && selectedAsset.type === 'token' ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {selectedAsset.logo ? (
                    <div className="w-10 h-10 relative rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      <Image
                        src={selectedAsset.logo}
                        alt={selectedAsset.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <span className="text-lg font-medium text-zinc-500">
                        {selectedAsset.name[0]}
                      </span>
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedAsset.name}
                    </h1>
                    <p className="text-sm text-zinc-500">
                      ${formatNumber(selectedAsset.value)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAsset(null)}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to overview
                </Button>
              </div>
              <TokenPools symbol={selectedAsset.data.symbol} />
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Select a token to see earning opportunities
              </div>
              <p className="text-sm text-zinc-500">
                Click on any token from your wallet to discover pools and strategies
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 