"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useWallet } from '@suiet/wallet-kit';
import { ConnectButton } from '@suiet/wallet-kit';
import { Wallet, ChevronRight, ChevronDown, Menu, CreditCard, ChevronLeft, Copy, PieChart, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { PoolsView } from '../components/chat/PoolsView';
import { processPoolsData } from '@/utils/poolUtils';
import { formatTokenBalance, formatUSDValue } from '@/app/utils/format';
import { Token, sortTokensByValue, fetchMomentumBalance, fetchScallopBalance } from '@/app/actions/balance-actions';
import { createClaimAllTx, initMomentumSDK } from '@/app/utils/momentum-utils';
import { createClaimAllRewardsTx, initNaviSDK, getAvailableRewards } from '@/app/utils/navi-utils';
import { PieChartAssets } from '@/components/PieChartAssets';
import { ProtocolPieChart } from '@/components/ProtocolPieChart';

// Массив цветов для графиков протоколов
const protocolColors = [
  'hsl(262.1, 83.3%, 57.8%)', // Momentum - фиолетовый
  'hsl(142.1, 76.2%, 36.3%)', // Scallop - зеленый
  'hsl(221.2, 83.2%, 53.3%)', // синий
  'hsl(32.1, 94.6%, 44.3%)',  // оранжевый
  'hsl(0, 84.2%, 60.2%)',     // красный
  'hsl(174.7, 77.8%, 51.8%)', // бирюзовый
  'hsl(291.1, 64.1%, 42.2%)', // фиолетовый
  'hsl(48.2, 89.1%, 53.1%)',  // желтый
  'hsl(152.2, 76.2%, 36.3%)', // мятный
  'hsl(340.5, 82.1%, 52.2%)', // розовый
  'hsl(207.4, 90.2%, 54.1%)', // голубой
  'hsl(120.0, 76.2%, 36.3%)', // зеленый
  'hsl(39.1, 89.1%, 53.1%)',  // оранжевый
  'hsl(0.0, 84.2%, 60.2%)',   // красный
  'hsl(174.7, 77.8%, 51.8%)', // бирюзовый
];

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

// Интерфейсы для Finkeeper
interface FinkeeperNetworkBalance {
  network: string;
  networkLogo: string;
  chainId: number;
  currencyAmount: string;
  investmentCount: number;
}

interface FinkeeperPlatform {
  platformName: string;
  analysisPlatformId: number;
  platformLogo: string;
  platformColor: string;
  currencyAmount: string;
  isSupportInvest: boolean;
  bonusTag: number;
  platformUrl: string;
  networkBalanceVoList: FinkeeperNetworkBalance[];
  investmentCount: number;
}

interface FinkeeperWalletPlatform {
  platformList: FinkeeperPlatform[];
  totalAssets: string;
}

interface FinkeeperResponse {
  code: number;
  msg: string;
  data: {
    walletIdPlatformList: FinkeeperWalletPlatform[];
  };
}

// Интерфейсы для детальной информации Finkeeper
interface FinkeeperTokenInfo {
  tokenSymbol: string;
  tokenLogo: string;
  coinAmount: string;
  currencyAmount: string;
  tokenPrecision: number;
  tokenAddress: string;
  network: string;
}

interface FinkeeperRewardInfo {
  baseDefiTokenInfos: FinkeeperTokenInfo[];
  rewardType: number;
}

interface FinkeeperInvestment {
  investmentName: string;
  investmentKey: string;
  investType: number;
  investName: string;
  assetsTokenList: FinkeeperTokenInfo[];
  rewardDefiTokenInfo: FinkeeperRewardInfo[];
  totalValue: string;
}

interface FinkeeperNetworkHold {
  network: string;
  chainId: number;
  totalAssert: string;
  investTokenBalanceVoList: FinkeeperInvestment[];
  availableRewards: any[];
  airDropRewardInfo: any[];
}

interface FinkeeperPlatformDetail {
  networkHoldVoList: FinkeeperNetworkHold[];
  accountId: string;
}

interface FinkeeperDetailResponse {
  code: number;
  msg: string;
  data: {
    walletIdPlatformDetailList: FinkeeperPlatformDetail[];
  };
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
  const [hideSmallAssets, setHideSmallAssets] = useState(true);
  const [showTokens, setShowTokens] = useState(true);
  const [showPositions, setShowPositions] = useState(true);
  const [momentumData, setMomentumData] = useState<any>(null);
  const [scallopData, setScallopData] = useState<any>(null);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [showMomentum, setShowMomentum] = useState(false);
  const [showScallop, setShowScallop] = useState(false);
  
  // Состояния для Finkeeper
  const [finkeeperData, setFinkeeperData] = useState<FinkeeperResponse | null>(null);
  const [isLoadingFinkeeper, setIsLoadingFinkeeper] = useState(false);
  const [showFinkeeperProtocols, setShowFinkeeperProtocols] = useState<Record<number, boolean>>({});

  // Состояния для детализации Finkeeper
  const [showFinkeeperPositions, setShowFinkeeperPositions] = useState<Record<number, boolean>>({});
  const [finkeeperDetailData, setFinkeeperDetailData] = useState<Record<number, FinkeeperDetailResponse>>({});
  const [isLoadingFinkeeperDetail, setIsLoadingFinkeeperDetail] = useState<Record<number, boolean>>({});
  const [finkeeperErrors, setFinkeeperErrors] = useState<Record<number, string>>({});

  const [totalTokenValue, setTotalTokenValue] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);

  // Состояния для Navi
  const [naviData, setNaviData] = useState<{
    rewards: any[];
    isLoading: boolean;
  }>({ rewards: [], isLoading: false });

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
    try {
      if (!wallet.account) return;
      
      setIsLoadingAssets(true);
      console.log('Fetching tokens for address:', wallet.account.address);
      
      // Загружаем токены
      const response = await fetch(`/api/tokens?address=${wallet.account.address}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw API response:', data);

      if (data.error) {
        console.log('Processing token: error', data.error);
        console.log('Processing token: message', data.message);
        setUserTokens([]);
        return;
      }

      const processedTokens = data.map((token: any) => {
        console.log('Processing token:', token);
        const balance = parseFloat(token.balance || '0');
        const price = parseFloat(token.price || '0');
        const usdPrice = parseFloat(token.usdPrice || '0');
        
        return {
          ...token,
          id: token.id || '',
          balance: isNaN(balance) ? '0' : balance.toString(),
          price: isNaN(price) ? '0' : price.toString(),
          usdPrice: isNaN(usdPrice) ? '0' : usdPrice.toString(),
          totalBalance: isNaN(balance * price) ? '0' : (balance * price).toString()
        };
      });

      console.log('Processed tokens array:', processedTokens);
      
      // Сортируем токены по стоимости в USD
      const sortedTokens = processedTokens.sort((a: any, b: any) => {
        const aValue = parseFloat(a.totalBalance || '0');
        const bValue = parseFloat(b.totalBalance || '0');
        return bValue - aValue;
      });

      console.log('Final sorted tokens:', sortedTokens);
      setUserTokens(sortedTokens);

      // Загружаем данные Scallop
      const scallopResult = await fetchScallopBalance(wallet.account.address);
      console.log('Scallop API response:', scallopResult);
      setScallopData(scallopResult.raw || null);

      // Загружаем данные Finkeeper
      await fetchFinkeeperData();

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
      // Получаем данные Scallop
      const scallopResult = await fetchScallopBalance(wallet.account.address);
      console.log('Scallop API response:', scallopResult);
      setScallopData(scallopResult.raw || null);

      // Получаем данные Finkeeper
      await fetchFinkeeperData();

      // Проверяем наличие позиций и устанавливаем начальное состояние блоков
      const hasScallopPositions = scallopResult.raw && scallopResult.raw.lendings && scallopResult.raw.lendings.length > 0;
      const hasFinkeeperPositions = finkeeperData?.data?.walletIdPlatformList?.[0]?.platformList?.[0]?.currencyAmount !== undefined;
      
      // Если нет позиций ни в одном протоколе, показываем только Wallet
      if (!hasScallopPositions && !hasFinkeeperPositions) {
        setShowTokens(true);
        setShowScallop(false);
        setShowFinkeeperProtocols({});
      } else {
        // Если есть позиции, сворачиваем все блоки
        setShowTokens(false);
        setShowScallop(false);
        setShowFinkeeperProtocols({});
      }
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

  // Функция для загрузки данных Finkeeper
  const fetchFinkeeperData = async () => {
    try {
      if (!wallet.account) return;

      console.log('Fetching Finkeeper data for address:', wallet.account.address);
      const response = await fetch('https://finkeeper-okx.vercel.app/api/defi/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddressList: [
            {
              chainId: 784,
              walletAddress: wallet.account.address
            }
          ]
        })
      });

      if (!response.ok) {
        console.error('Finkeeper API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as FinkeeperResponse;
      console.log('Raw Finkeeper response:', data);

      if (data.code !== 0) {
        console.error('Finkeeper API error:', data.msg);
        setFinkeeperData(null);
        return;
      }

      const walletPlatforms = data.data?.walletIdPlatformList?.[0];
      if (!walletPlatforms?.platformList) {
        console.log('No Finkeeper data available');
        setFinkeeperData(null);
        return;
      }

      // Фильтруем и сортируем платформы
      const filteredPlatforms = walletPlatforms.platformList
        .filter((platform: FinkeeperPlatform) => {
          const amount = parseFloat(platform.currencyAmount || '0');
          console.log(`Platform ${platform.platformName}: amount = ${amount}`);
          return !['Scallop'].includes(platform.platformName) && amount > 0;
        })
        .sort((a: FinkeeperPlatform, b: FinkeeperPlatform) => 
          parseFloat(b.currencyAmount || '0') - parseFloat(a.currencyAmount || '0')
        );

      console.log('Filtered platforms:', filteredPlatforms);
      
      // Обновляем данные с отфильтрованными платформами
      const updatedData: FinkeeperResponse = {
        ...data,
        data: {
          ...data.data,
          walletIdPlatformList: [{
            ...walletPlatforms,
            platformList: filteredPlatforms
          }]
        }
      };
      
      setFinkeeperData(updatedData);
    } catch (error) {
      console.error('Error fetching Finkeeper data:', error);
      setFinkeeperData(null);
    }
  };

  // Функция для загрузки детальных данных
  const fetchFinkeeperDetail = async (platformId: number, address: string) => {
    console.log('Fetching Finkeeper detail for platform:', platformId, 'address:', address);
    setIsLoadingFinkeeperDetail(prev => ({ ...prev, [platformId]: true }));
    setFinkeeperErrors(prev => ({ ...prev, [platformId]: '' }));
    
    try {
      const url = `https://finkeeper-okx.vercel.app/api/defi/positions?platformId=${platformId}&chainId=784&walletAddress=${address}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw Finkeeper detail response for platform', platformId, ':', data);
      
      if (data.code !== 0) {
        throw new Error(`API error: ${data.msg || data.error_message || 'Unknown error'}`);
      }

      // Проверяем структуру данных
      const platformDetail = data.data?.walletIdPlatformDetailList?.[0];
      if (!platformDetail) {
        console.log('No platform detail data found');
        setFinkeeperDetailData(prev => ({ ...prev, [platformId]: data }));
        return;
      }

      const networkHold = platformDetail.networkHoldVoList?.[0];
      if (!networkHold) {
        console.log('No network hold data found');
        setFinkeeperDetailData(prev => ({ ...prev, [platformId]: data }));
        return;
      }

      const investments = networkHold.investTokenBalanceVoList || [];
      console.log(`Found ${investments.length} investments for platform ${platformId}:`, investments);

      // Логируем детали каждого инвестирования
      investments.forEach((investment: FinkeeperInvestment, index: number) => {
        console.log(`Investment ${index + 1} for platform ${platformId}:`, {
          name: investment.investmentName,
          type: investment.investName,
          totalValue: investment.totalValue,
          assets: investment.assetsTokenList?.length || 0,
          rewards: investment.rewardDefiTokenInfo?.[0]?.baseDefiTokenInfos?.length || 0
        });
      });
      
      setFinkeeperDetailData(prev => ({ ...prev, [platformId]: data }));
    } catch (error) {
      console.error('Error fetching Finkeeper detail for platform', platformId, ':', error);
      setFinkeeperErrors(prev => ({ 
        ...prev, 
        [platformId]: error instanceof Error ? error.message : 'Failed to load data' 
      }));
    } finally {
      setIsLoadingFinkeeperDetail(prev => ({ ...prev, [platformId]: false }));
    }
  };

  // Мемоизированная функция для получения детальных данных
  const getDetailData = useMemo(() => (platformId: number) => {
    const data = finkeeperDetailData[platformId]?.data?.walletIdPlatformDetailList?.[0]?.networkHoldVoList?.[0]?.investTokenBalanceVoList || [];
    console.log(`Getting detail data for platform ${platformId}:`, {
      hasData: !!finkeeperDetailData[platformId],
      investmentsCount: data.length,
      platformId
    });
    return data;
  }, [finkeeperDetailData]);

  // Функция для повторной загрузки данных
  const retryFetch = useCallback((platformId: number) => {
    console.log('Retrying fetch for platform:', platformId);
    if (wallet.account) {
      fetchFinkeeperDetail(platformId, wallet.account.address);
    }
  }, [wallet.account]);

  const handleDisconnect = () => {
    wallet.disconnect();
    setUserTokens([]);
    setFinkeeperData(null);
    setShowFinkeeperProtocols({});
    setShowTokens(false);
    setSelectedAsset(null);
  };

  // Обновляем общую сумму активов при изменении данных
  useEffect(() => {
    let sum = totalTokenValue;
    
    // Добавляем сумму из Scallop
    if (scallopData && scallopData.lendings) {
      sum += scallopData.lendings.reduce((acc: number, lending: any) => acc + (lending.suppliedValue || 0), 0);
    }
    
    // Добавляем сумму из Finkeeper
    if (finkeeperData?.data?.walletIdPlatformList?.[0]?.platformList) {
      sum += finkeeperData.data.walletIdPlatformList[0].platformList
        .filter(platform => !['Scallop'].includes(platform.platformName))
        .reduce((acc, platform) => acc + parseFloat(platform.currencyAmount || '0'), 0);
    }
    
    setTotalAssets(sum);
  }, [totalTokenValue, scallopData, finkeeperData]);

  // Обновляем общую стоимость токенов при изменении списка токенов
  useEffect(() => {
    const total = userTokens.reduce((sum, token) => {
      const value = parseFloat(token.usdPrice || '0');
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    setTotalTokenValue(total);
  }, [userTokens]);

  // Функция для сбора наград Navi
  const handleNaviCollect = async () => {
    if (!wallet.account) return;
    
    try {
      console.log('Starting Navi collect rewards...');
      
      const client = initNaviSDK();
      const tx = await createClaimAllRewardsTx(client, wallet.account.address);
      
      await wallet.signAndExecuteTransactionBlock({
        transactionBlock: tx as any,
      });
      
      alert('Successfully collected Navi rewards!');
      checkNaviRewards();
    } catch (error) {
      console.error('Error collecting Navi rewards:', error);
    }
  };

  // Функция для проверки наград Navi
  const checkNaviRewards = async () => {
    if (!wallet.account) return;
    
    try {
      setNaviData(prev => ({ ...prev, isLoading: true }));
      
      const client = initNaviSDK();
      const rewards = await getAvailableRewards(client, wallet.account.address);
      
      console.log('Navi rewards:', rewards);
      setNaviData({ rewards: rewards ? [rewards] : [], isLoading: false });
    } catch (error) {
      console.error('Error checking Navi rewards:', error);
      setNaviData(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Проверяем награды Navi при подключении кошелька
  useEffect(() => {
    if (wallet.connected && wallet.account) {
      checkNaviRewards();
    }
  }, [wallet.connected, wallet.account]);

  // Обновляем обработку отображения деталей протокола
  const renderProtocolDetails = (platform: FinkeeperPlatform) => {
    const platformId = platform.analysisPlatformId;
    const isLoading = isLoadingFinkeeperDetail[platformId];
    const error = finkeeperErrors[platformId];
    const investments = getDetailData(platformId);

    if (isLoading) {
      return (
        <div className="flex justify-center py-4">
          <span className="text-sm text-zinc-500">Loading positions...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-red-500 mb-2">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => retryFetch(platformId)}
          >
            Retry
          </Button>
        </div>
      );
    }

    if (!investments || investments.length === 0) {
      return (
        <div className="text-center py-4 text-sm text-zinc-500">
          No active positions
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {investments
          .filter(investment => !hideSmallAssets || parseFloat(investment.totalValue) >= 1)
          .map((investment: FinkeeperInvestment, index: number) => (
            <div key={index} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{investment.investmentName}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    investment.investName === 'Borrow'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  }`}>
                    {investment.investName}
                  </span>
                </div>
                <span className="font-medium">
                  ${formatNumber(parseFloat(investment.totalValue))}
                </span>
              </div>

              {/* Основные активы */}
              <div className="space-y-2 mb-2">
                {investment.assetsTokenList
                  .filter(token => !hideSmallAssets || parseFloat(token.currencyAmount) >= 1)
                  .map((token, tokenIndex) => (
                    <div key={tokenIndex} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <Image
                          src={token.tokenLogo}
                          alt={token.tokenSymbol}
                          width={16}
                          height={16}
                          className="rounded"
                        />
                        <span>{token.tokenSymbol}</span>
                      </div>
                      <div className="text-right">
                        <div>{formatNumber(parseFloat(token.coinAmount))} {token.tokenSymbol}</div>
                        <div className="text-xs text-zinc-500">
                          ${formatNumber(parseFloat(token.currencyAmount))}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Награды */}
              {investment.rewardDefiTokenInfo?.[0]?.baseDefiTokenInfos?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="text-sm font-medium mb-2">Rewards</div>
                  <div className="space-y-2">
                    {investment.rewardDefiTokenInfo[0].baseDefiTokenInfos
                      .filter(token => !hideSmallAssets || parseFloat(token.currencyAmount) >= 1)
                      .map((token, tokenIndex) => (
                        <div key={tokenIndex} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <Image
                              src={token.tokenLogo}
                              alt={token.tokenSymbol}
                              width={16}
                              height={16}
                              className="rounded"
                            />
                            <span>{token.tokenSymbol}</span>
                          </div>
                          <div className="text-right">
                            <div>{formatNumber(parseFloat(token.coinAmount))} {token.tokenSymbol}</div>
                            <div className="text-xs text-zinc-500">
                              ${formatNumber(parseFloat(token.currencyAmount))}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        {/* Кнопка сбора наград для Navi */}
        {platformId === 115572 && naviData.rewards.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-800/50"
            onClick={handleNaviCollect}
          >
            Collect Navi rewards
          </Button>
        )}
      </div>
    );
  };

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
                      ${formatNumber(totalAssets)}
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
                      onClick={handleDisconnect}
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
                <div 
                  onClick={() => setShowTokens(!showTokens)}
                  className="flex flex-row items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex-1 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        Wallet
                      </span>
                    </div>
                    {wallet.connected && (
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        ${formatNumber(totalTokenValue)}
                      </span>
                    )}
                  </div>
                  {showTokens ? (
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  )}
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
                        {hideSmallAssets && userTokens.filter(token => parseFloat(token.usdPrice || '0') < 1).length > 0 && (
                          <div className="text-xs text-zinc-500 mt-2">
                            {userTokens.filter(token => parseFloat(token.usdPrice || '0') < 1).length} assets hidden
                          </div>
                        )}
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

              {/* Protocol blocks */}
              {[
                // Scallop block
                scallopData && scallopData.lendings && scallopData.lendings.length > 0 && {
                  id: 'scallop',
                  name: 'Scallop',
                  logo: 'https://app.scallop.io/images/logo-192.png',
                  value: scallopData.lendings.reduce((sum: number, lending: any) => sum + (lending.suppliedValue || 0), 0),
                  show: showScallop,
                  setShow: setShowScallop,
                  content: (
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
                  )
                },
                // Finkeeper blocks
                ...(finkeeperData?.data?.walletIdPlatformList?.[0]?.platformList
                  ?.filter(platform => 
                    !['Scallop'].includes(platform.platformName) && 
                    parseFloat(platform.currencyAmount || '0') > 0
                  )
                  .map(platform => ({
                    id: platform.analysisPlatformId.toString(),
                    name: platform.platformName,
                    logo: platform.platformLogo,
                    value: parseFloat(platform.currencyAmount || '0'),
                    show: showFinkeeperProtocols[platform.analysisPlatformId],
                    setShow: (show: boolean) => {
                      setShowFinkeeperProtocols(prev => ({
                        ...prev,
                        [platform.analysisPlatformId]: show
                      }));
                      // Загружаем детальные данные при первом раскрытии
                      if (show && !finkeeperDetailData[platform.analysisPlatformId] && wallet.account) {
                        fetchFinkeeperDetail(platform.analysisPlatformId, wallet.account.address);
                      }
                    },
                    content: renderProtocolDetails(platform)
                  })) || [])
              ]
                .filter(Boolean)
                .sort((a, b) => b.value - a.value)
                .map(protocol => (
                  <div key={protocol.id} className="mb-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                    <div 
                      onClick={() => protocol.setShow(!protocol.show)}
                      className="flex flex-row items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex-1 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Image
                            src={protocol.logo}
                            alt={protocol.name}
                            width={16}
                            height={16}
                            className="rounded"
                          />
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {protocol.name}
                          </span>
                        </div>
                        {protocol.value > 0 && (
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            ${formatNumber(protocol.value)}
                          </span>
                        )}
                      </div>
                      {protocol.show ? (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                    {protocol.show && protocol.content}
                  </div>
                ))}

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
              <p className="text-sm text-zinc-500 mb-8">
                Click on any token from your wallet to discover pools and strategies
              </p>
              
              <div className="flex flex-wrap justify-center gap-8">
                {/* График распределения токенов */}
                {userTokens.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">
                      Token Distribution
                    </h3>
                    <PieChartAssets 
                      tokenBalances={userTokens.map(token => ({
                        symbol: token.symbol,
                        balance: token.balance,
                        decimals: token.decimals,
                        value: parseFloat(token.usdPrice || '0')
                      }))}
                    />
                  </div>
                )}

                {/* График распределения по протоколам */}
                {(scallopData?.lendings?.length > 0 || (finkeeperData?.data?.walletIdPlatformList?.[0]?.platformList?.length ?? 0) > 0) && (
                  <div>
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">
                      Protocol Distribution
                    </h3>
                    <ProtocolPieChart 
                      protocolBalances={[
                        ...(scallopData?.lendings?.length > 0 ? [{
                          protocol: 'Scallop',
                          value: scallopData.lendings.reduce((sum: number, lending: any) => sum + (lending.suppliedValue || 0), 0),
                          icon: 'https://app.scallop.io/images/logo-192.png',
                          color: protocolColors[1]
                        }] : []),
                        ...(finkeeperData?.data?.walletIdPlatformList?.[0]?.platformList
                          ?.filter((platform: FinkeeperPlatform) => 
                            !['Scallop'].includes(platform.platformName) && 
                            parseFloat(platform.currencyAmount || '0') > 0
                          )
                          .map((platform: FinkeeperPlatform, index: number) => ({
                            protocol: platform.platformName,
                            value: parseFloat(platform.currencyAmount || '0'),
                            icon: platform.platformLogo,
                            color: protocolColors[(index + 2) % protocolColors.length]
                          })) || [])
                      ]}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 