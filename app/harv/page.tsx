"use client";

import { ReactNode, useRef, useState, useEffect, useMemo } from "react";
import { useChat } from 'ai/react';
import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { motion, AnimatePresence } from "framer-motion";
import { MasonryIcon, VercelIcon } from "@/components/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SendHorizonal, Menu, DollarSign, ChevronRight, ChevronDown, Wallet, CreditCard, Disc, LineChart, PieChart } from "lucide-react";
import { ConnectButton, useWallet } from '@suiet/wallet-kit';
import { 
  fetchTokenBalances, 
  sortTokensByValue, 
  calculateTotalPortfolioValue,
  type Token,
  type TokenData 
} from '@/app/actions/balance-actions';
import { formatTokenBalance, formatUSDValue } from '@/app/utils/format';
import { fetchScallopBalance, fetchMomentumBalance } from '@/app/actions/balance-actions';
import ReactMarkdown from 'react-markdown';
import Image from "next/image";
import { PieChartAssets } from '@/components/PieChartAssets';
import { ProtocolPieChart } from '@/components/ProtocolPieChart';
import { PoolsView } from '../components/chat/PoolsView';
import { WalletView } from '../components/chat/WalletView';
import { TokenView } from '../components/chat/TokenView';
import { createClaimAllTx, initMomentumSDK } from '@/app/utils/momentum-utils';
import { createClaimAllRewardsTx, initNaviSDK, getAvailableRewards } from '@/app/utils/navi-utils';
import { viewPoolsTool } from '@/app/tools/pool-tools';
import { processPoolsData } from '@/utils/poolUtils';

// Добавляем константы для иконок и ссылок протоколов
const protocolIcons: Record<string, string> = {
  'cetus': '/protocols/cetus.png',
  'deepbook': '/protocols/deepbook.png',
  'scallop': '/protocols/scallop.png',
  'momentum': '/protocols/momentum.png',
  'bluefin': '/protocols/bluefin.png',
  'navi': '/protocols/navi.png'
};

const protocolLinks: Record<string, string> = {
  'cetus': 'https://app.cetus.zone',
  'deepbook': 'https://deepbook.sui.io',
  'scallop': 'https://app.scallop.io',
  'momentum': 'https://app.mmt.finance',
  'bluefin': 'https://app.bluefin.io',
  'navi': 'https://app.navi.finance'
};

// Define Momentum position interface
interface MomentumPosition {
  objectId: string;
  poolId: string;
  upperPrice: number;
  lowerPrice: number;
  upperTick: number;
  lowerTick: number;
  liquidity: string;
  amount: number;
  status: string;
  claimableRewards: number;
  rewarders: any[];
  feeAmountXUsd: number;
  feeAmountYUsd: number;
  feeAmountX: number;
  feeAmountY: number;
}

// Define Scallop data interfaces
interface ScallopLending {
  symbol: string;
  suppliedCoin: number;
  suppliedValue: string;
  supplyApy: string;
}

interface ScallopCollateral {
  symbol: string;
  depositedCoin: number;
  depositedValueInUsd: number;
}

interface ScallopBorrowedPool {
  symbol: string;
  borrowedCoin: number;
  borrowedValueInUsd: number;
  borrowApy?: string;
}

interface ScallopBorrowing {
  collaterals: ScallopCollateral[];
  borrowedPools: ScallopBorrowedPool[];
  availableCollateralInUsd: number;
  riskLevel: number;
}

interface ScallopVeSca {
  lockedScaInCoin: number;
  lockedScaInUsd: number;
  currentVeScaBalance: number;
  remainingLockPeriodInDays: number;
}

interface ScallopReward {
  symbol: string;
  pendingRewardInCoin: number;
  pendingRewardInUsd: number;
}

interface ScallopData {
  totalSupplyValue: string;
  totalCollateralValue: string;
  totalLockedScaValue: string;
  totalDebtValue: string;
  lendings: ScallopLending[];
  borrowings: ScallopBorrowing[];
  veScas: ScallopVeSca[];
  pendingRewards?: {
    lendings: ScallopReward[];
    borrowIncentives: ScallopReward[];
  };
}

interface Position {
  protocol: string;
  type: string;
  asset: string;
  balance: string;
  value: string;
  apy?: string;
}

// Finkeeper API interfaces
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

// Интерфейсы для данных протоколов
type ProtocolData = 
  | {
      type: 'scallop';
      name: string;
      value: number;
      data: ScallopData;
      logo: string;
      url: string;
    }
  | {
      type: 'momentum';
      name: string;
      value: number;
      data: MomentumData;
      logo: string;
      url: string;
    }
  | {
      type: 'finkeeper';
      name: string;
      value: number;
      data: FinkeeperData;
      logo: string;
      url: string;
    };

interface MomentumData {
  formatted: string;
  raw: any[];
}

// Тип для проверки Finkeeper данных
type FinkeeperData = {
  analysisPlatformId: number;
  investmentCount: number;
} & FinkeeperPlatform;

// Добавляем кэш для результатов запросов
const poolsCache = new Map<string, any[]>();

const TokenPools = ({ symbol }: { symbol: string }) => {
  const [pools, setPools] = useState<any[]>([]);
  const [isLoadingPools, setIsLoadingPools] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchPools = async () => {
      console.log('Fetching pools for symbol:', symbol);
      
      // Проверяем кэш
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
          // Сохраняем в кэш
          poolsCache.set(symbol, processedPools);
          setPools(processedPools);
        } else {
          console.log('No pools data received');
          poolsCache.set(symbol, []);
          setPools([]);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
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

  console.log('Current state:', { isLoadingPools, poolsCount: pools.length });

  if (isLoadingPools) {
    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-4">Earn ideas</h3>
        <div className="flex justify-center py-4">
          <span className="text-sm text-zinc-500">Loading pools...</span>
        </div>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-4">Earn ideas</h3>
        <div className="text-sm text-zinc-500">No pools found for {symbol}</div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-4">Earn ideas</h3>
      <PoolsView message={`Found ${pools.length} pools`} pools={pools} />
    </div>
  );
};

const Home = () => {
  const wallet = useWallet();
  const [showActionButtons, setShowActionButtons] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{
    type: 'token' | 'protocol';
    data: any;
    name: string;
    value: number;
    logo?: string;
  } | null>(null);
  const [balanceData, setBalanceData] = useState<{
    formatted: string;
    raw: any;
  } | null>(null);
  const [momentumData, setMomentumData] = useState<{
    formatted: string;
    raw: any;
  } | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoadingMomentum, setIsLoadingMomentum] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  
  const { messages, input, handleInputChange, handleSubmit, append, setMessages } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: {
      wallet: wallet.connected ? {
        connected: wallet.connected,
        account: wallet.account ? {
          address: wallet.account.address,
          publicKey: wallet.account.publicKey
        } : null
      } : null
    },
    onFinish: (message) => {
      console.log('Chat finished:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onResponse: (response) => {
      console.log('Chat response:', response);
    }
  });

  // Asset panel states
  const [userTokens, setUserTokens] = useState<Token[]>([]);
  const [scallopData, setScallopData] = useState<ScallopData | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [showAssetPanel, setShowAssetPanel] = useState(true);
  const [showTokens, setShowTokens] = useState(false);
  const [showScallopPositions, setShowScallopPositions] = useState(false);
  const [showMomentumPositions, setShowMomentumPositions] = useState(false);
  const [showBluefinPositions, setShowBluefinPositions] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [finkeeperData, setFinkeeperData] = useState<FinkeeperResponse | null>(null);
  const [showFinkeeperPositions, setShowFinkeeperPositions] = useState<Record<number, boolean>>({});
  const [isLoadingFinkeeper, setIsLoadingFinkeeper] = useState(false);
  const [finkeeperDetailData, setFinkeeperDetailData] = useState<Record<number, FinkeeperDetailResponse>>({});
  const [isLoadingFinkeeperDetail, setIsLoadingFinkeeperDetail] = useState<Record<number, boolean>>({});

  // Добавляем состояние для фильтрации
  const [hideSmallAssets, setHideSmallAssets] = useState(true);

  // Создаем массив всех протоколов для сортировки
  const sortedProtocols = useMemo(() => {
    const protocols: ProtocolData[] = [];

    // Добавляем Scallop
    if (scallopData) {
      const scallopValue = 
        parseFloat(scallopData.totalSupplyValue || "0") +
        parseFloat(scallopData.totalCollateralValue || "0") +
        parseFloat(scallopData.totalLockedScaValue || "0");
      
      if (scallopValue > 0) {
        protocols.push({
          type: 'scallop',
          name: 'Scallop',
          value: scallopValue,
          data: scallopData,
          logo: 'https://app.scallop.io/images/logo-192.png',
          url: 'https://app.scallop.io/referral?ref=670e31ea50cc539a9a3e2f84'
        });
      }
    }

    // Добавляем Momentum
    if (momentumData && momentumData.raw && Array.isArray(momentumData.raw)) {
      const momentumValue = momentumData.raw.reduce((acc: number, pos: any) => acc + (pos.amount || 0), 0);
      if (momentumValue > 0) {
        protocols.push({
          type: 'momentum',
          name: 'Momentum',
          value: momentumValue,
          data: momentumData,
          logo: 'https://app.mmt.finance/assets/images/momentum-logo-sq.svg',
          url: 'https://app.mmt.finance/leaderboard?refer=8EQO6A'
        });
      }
    }

    // Добавляем протоколы из Finkeeper
    if (finkeeperData?.data.walletIdPlatformList[0]?.platformList) {
      finkeeperData.data.walletIdPlatformList[0].platformList
        .filter(platform => !['Scallop', 'Momentum'].includes(platform.platformName))
        .forEach(platform => {
          const value = parseFloat(platform.currencyAmount);
          if (value > 0) {
            protocols.push({
              type: 'finkeeper',
              name: platform.platformName,
              value: value,
              data: platform as FinkeeperData,
              logo: platform.platformLogo,
              url: platform.platformUrl
            });
          }
        });
    }

    // Сортируем по значению (по убыванию)
    return protocols.sort((a, b) => b.value - a.value);
  }, [scallopData, momentumData, finkeeperData]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  // Add new state for total value
  const [totalTokenValue, setTotalTokenValue] = useState<number>(0);

  // Функция для получения данных из Finkeeper
  const fetchFinkeeperData = async (address: string) => {
    setIsLoadingFinkeeper(true);
    try {
      const response = await fetch('https://finkeeper-okx.vercel.app/api/defi/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddressList: [
            {
              chainId: 784,
              walletAddress: address
            }
          ]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFinkeeperData(data);
      }
    } catch (error) {
      console.error('Error fetching Finkeeper data:', error);
    } finally {
      setIsLoadingFinkeeper(false);
    }
  };

  // Обновляем функцию получения детальной информации
  const fetchFinkeeperDetail = async (platformId: number, address: string) => {
    setIsLoadingFinkeeperDetail(prev => ({ ...prev, [platformId]: true }));
    try {
      const response = await fetch(`https://finkeeper-okx.vercel.app/api/defi/positions?platformId=${platformId}&chainId=784&walletAddress=${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFinkeeperDetailData(prev => ({ ...prev, [platformId]: data }));
      }
    } catch (error) {
      console.error('Error fetching Finkeeper detail:', error);
    } finally {
      setIsLoadingFinkeeperDetail(prev => ({ ...prev, [platformId]: false }));
    }
  };

  // Итоговая сумма всех активов (кошелёк + протоколы)
  const totalAssets = useMemo(() => {
    let sum = totalTokenValue;
    // Scallop
    if (scallopData) {
      sum +=
        parseFloat(scallopData.totalSupplyValue || "0") +
        parseFloat(scallopData.totalCollateralValue || "0") +
        parseFloat(scallopData.totalLockedScaValue || "0");
    }
    // Momentum
    if (momentumData && momentumData.raw && Array.isArray(momentumData.raw)) {
      sum += momentumData.raw.reduce((acc: number, pos: any) => acc + (pos.amount || 0), 0);
    }
    // Finkeeper
    if (finkeeperData?.data.walletIdPlatformList[0]?.platformList) {
      sum += finkeeperData.data.walletIdPlatformList[0].platformList
        .filter(platform => !['Scallop', 'Momentum'].includes(platform.platformName))
        .reduce((acc, platform) => acc + parseFloat(platform.currencyAmount), 0);
    }
    return sum;
  }, [totalTokenValue, scallopData, momentumData, finkeeperData]);

  // Update total value when tokens change
  useEffect(() => {
    const updateTotalValue = async () => {
      if ((userTokens || []).length > 0) {
        const tokenData = Object.fromEntries((userTokens || []).map(t => [t.id, t]));
        const total = await calculateTotalPortfolioValue(tokenData);
        setTotalTokenValue(total);
      } else {
        setTotalTokenValue(0);
      }
    };
    
    updateTotalValue();
  }, [userTokens]);

  // Check if mobile view on mount and window resize
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
    // Check on mount
    checkIfMobile();
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Fetch user assets when wallet connects
  useEffect(() => {
    if (wallet.connected && wallet.account) {
      fetchUserAssets();
    }
  }, [wallet.connected, wallet.account]);

  // Helper function for number formatting
  const formatNumber = (num: number | string, digits = 2) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    
    // If number is very small, show scientific notation
    if (numValue < 0.00001 && numValue > 0) {
      return numValue.toExponential(4);
    }
    
    // For numbers less than 1 - more decimal places
    const decimals = numValue < 1 && numValue > 0 ? 6 : digits;
    
    // For large numbers - add thousand separators
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  };

  // Function to fetch user assets
  const fetchUserAssets = async () => {
    if (!wallet.connected || !wallet.account) return;
    
    setIsLoadingAssets(true);
    
    try {
      // Fetch token balances
      const tokenData = await fetchTokenBalances(wallet.account.address);
      const sortedTokens = await sortTokensByValue(tokenData);
      setUserTokens(sortedTokens);

      // Use the existing balance-actions function to get Scallop data
      const scallopBalanceResult = await fetchScallopBalance(wallet.account.address);
      if (scallopBalanceResult.raw && !scallopBalanceResult.raw.error) {
        setScallopData(scallopBalanceResult.raw);
      }

      // Fetch Momentum data
      const momentumBalanceResult = await fetchMomentumBalance(wallet.account.address);
      setMomentumData(momentumBalanceResult);

      // Fetch Finkeeper data
      await fetchFinkeeperData(wallet.account.address);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  // Get total token value
  const getTotalTokenValue = async () => {
    try {
      const tokenData = Object.fromEntries((userTokens || []).map(t => [t.id, t]));
      return await calculateTotalPortfolioValue(tokenData);
    } catch (error) {
      console.error('Error calculating total value:', error);
      return 0;
    }
  };

  // Обновляем suggestedActions
  const suggestedActions = [
    { title: "Show me", label: "Pie chart of assets in protocols", action: "show-protocols-pie-chart" },
    { title: "Check", label: "Momentum Balance", action: "check-momentum-balance" },
    { title: "Show me", label: "Pie chart of assets in wallet", action: "show-assets-pie-chart" },
    { title: "Show", label: "USD pools", action: "show-usd-pools" }
  ];

  // Функция для отправки баланса Scallop в чат
  const sendScallopBalanceToChat = async () => {
    if (!wallet.connected || !wallet.account) {
      alert("Please connect your wallet first");
      return;
    }

    setIsLoadingBalance(true);

    try {
      // Получаем данные баланса
      const balanceData = await fetchScallopBalance(wallet.account.address);
      
      // Update user assets with new data
      setBalanceData(balanceData);
      fetchUserAssets();
      
    } catch (error) {
      console.error("Error fetching balance:", error);
      
      // Добавляем сообщение об ошибке
      // setMessages((messages) => [
      //   ...messages,
      //   <Message 
      //     key={messages.length} 
      //     role="assistant" 
      //     content={`Sorry, I couldn't fetch your Scallop balance. Error: ${error instanceof Error ? error.message : "Unknown error"}`} 
      //   />,
      // ]);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Функция для отправки баланса Momentum в чат
  const sendMomentumBalanceToChat = async () => {
    if (!wallet.connected || !wallet.account) {
      alert("Please connect your wallet first");
      return;
    }

    setIsLoadingMomentum(true);

    try {
      // Получаем данные баланса
      const momentumData = await fetchMomentumBalance(wallet.account.address);
      
      // Update momentum data
      setMomentumData(momentumData);
      
      // Also refresh user assets
      fetchUserAssets();
      
    } catch (error) {
      console.error("Error fetching Momentum balance:", error);
      
      // Добавляем сообщение об ошибке
      // setMessages((messages) => [
      //   ...messages,
      //   <Message 
      //     key={messages.length} 
      //     role="assistant" 
      //     content={`Sorry, I couldn't fetch your Momentum positions. Error: ${error instanceof Error ? error.message : "Unknown error"}`} 
      //   />,
      // ]);
    } finally {
      setIsLoadingMomentum(false);
    }
  };

  // Функция для переключения видимости меню действий
  const toggleActionButtons = () => {
    setShowActionButtons(!showActionButtons);
  };

  // Toggle asset panel visibility
  const toggleAssetPanel = () => {
    setShowAssetPanel(!showAssetPanel);
  };

  // Функция для дисконнекта и сброса данных
  const handleDisconnect = () => {
    wallet.disconnect();
    setUserTokens([]);
    setScallopData(null);
    setMomentumData(null);
    setTotalTokenValue(0);
    setFinkeeperData(null);
    setShowFinkeeperPositions({});
    setShowScallopPositions(false);
    setShowMomentumPositions(false);
    setShowBluefinPositions(false);
    setShowTokens(false);
  };

  // Показывать меню при первой загрузке, если сообщений нет
  useEffect(() => {
    if (messages.length === 0) {
      setShowActionButtons(true);
    }
  }, []);

  // Автопрокрутка вниз при новых сообщениях или открытии меню
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showActionButtons]);

  // Обновляем renderToolResult
  const renderToolResult = (result: any) => {
    if (typeof result === 'object' && result.type === 'ui') {
      switch (result.component) {
        case 'PoolsView':
          return <PoolsView {...result.props} />;
        case 'WalletView':
          return <WalletView {...result.props} />;
        case 'TokenView':
          return <TokenView {...result.props} />;
        case 'PieChartAssets':
          return <PieChartAssets {...result.props} />;
        case 'ProtocolPieChart':
          return <ProtocolPieChart {...result.props} />;
        default:
          return <div>Неизвестный компонент: {result.component}</div>;
      }
    }
    return <div>{JSON.stringify(result)}</div>;
  };

  // Добавляем обработчик отправки формы
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting message:', input);
    setShowActionButtons(false);
    handleSubmit(e);
  };

  // Добавляем обработчик для кнопки Show USD pools
  const handleShowUSDPools = async () => {
    if (!wallet.connected) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      // Создаем событие submit
      const event = new Event('submit') as any;
      event.preventDefault = () => {};
      
      // Устанавливаем значение input и сразу отправляем
      handleInputChange({ target: { value: 'usd' } } as any);
      handleSubmit(event);
    } catch (error) {
      console.error('Error fetching pools:', error);
      alert('Failed to fetch pools data');
    }
  };

  const [naviData, setNaviData] = useState<{
    rewards: any[];
    isLoading: boolean;
  }>({
    rewards: [],
    isLoading: false
  });

  // Функция для сбора наград Navi
  const handleNaviCollect = async () => {
    if (!wallet.connected || !wallet.account?.address) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      console.log('Starting Navi collect rewards...');
      
      // Инициализируем SDK
      const client = initNaviSDK();
      console.log('SDK initialized');
      
      // Создаем транзакцию
      console.log('Creating transaction...');
      const tx = await createClaimAllRewardsTx(client, wallet.account.address);
      console.log('Transaction created:', tx);
      
      // Подписываем и отправляем транзакцию через кошелек пользователя
      console.log('Signing and executing transaction...');
      const result = await wallet.signAndExecuteTransaction({
        transaction: tx
      });
      
      console.log('Transaction result:', result);
      
      // Если мы дошли до этой точки, значит транзакция успешна
      alert('Successfully collected Navi rewards!');
      // Обновляем данные после успешной транзакции
      fetchUserAssets();
      // Проверяем награды снова
      checkNaviRewards();
      
    } catch (error) {
      console.error('Error executing transaction:', error);
      if (error instanceof Error) {
        alert(`Failed to execute transaction: ${error.message}`);
      } else {
        alert('Failed to execute transaction: Unknown error');
      }
    }
  };

  // Функция для проверки наград Navi
  const checkNaviRewards = async () => {
    if (!wallet.connected || !wallet.account?.address) return;

    setNaviData(prev => ({ ...prev, isLoading: true }));
    try {
      const client = initNaviSDK();
      const rewards = await getAvailableRewards(client, wallet.account.address);
      console.log('Navi rewards:', rewards);
      setNaviData({ rewards: rewards ? [rewards] : [], isLoading: false });
    } catch (error) {
      console.error('Error checking Navi rewards:', error);
      setNaviData(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Проверяем награды при подключении кошелька
  useEffect(() => {
    if (wallet.connected && wallet.account) {
      checkNaviRewards();
    }
  }, [wallet.connected, wallet.account]);

  // Добавляем эффект для логирования данных позиций
  useEffect(() => {
    if (isLoadingFinkeeperDetail) {
      const loadingProtocols = Object.entries(isLoadingFinkeeperDetail)
        .filter(([_, isLoading]) => isLoading)
        .map(([id]) => id);
      
      if (loadingProtocols.length > 0) {
        console.log('Loading positions for protocols:', loadingProtocols);
      }
    }
  }, [isLoadingFinkeeperDetail]);

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
              {/* Header with wallet info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">My Assets</h2>
                  {wallet.connected && (
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">${Number(totalAssets).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  )}
                  <button
                    onClick={() => fetchUserAssets()}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                    title="Refresh all balances"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-zinc-500 ${(isLoadingAssets || isLoadingFinkeeper) ? 'animate-spin' : ''}`}>
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                      <path d="M16 21h5v-5"/>
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {wallet.connected && (() => {
                    const protocolBalances = [
                      { protocol: 'Wallet', value: totalTokenValue },
                      { protocol: 'Scallop', value: scallopData ? (
                        parseFloat(scallopData.totalSupplyValue || "0") +
                        parseFloat(scallopData.totalCollateralValue || "0") +
                        parseFloat(scallopData.totalLockedScaValue || "0")
                      ) : 0 },
                      { protocol: 'Momentum', value: momentumData && momentumData.raw && !momentumData.raw.error ?
                        momentumData.raw.reduce((sum: number, pos: any) => sum + (pos.amount || 0), 0) : 0 }
                    ];

                    // Добавляем протоколы из Finkeeper
                    if (finkeeperData?.data.walletIdPlatformList[0]?.platformList) {
                      finkeeperData.data.walletIdPlatformList[0].platformList
                        .filter(platform => !['Scallop', 'Momentum'].includes(platform.platformName))
                        .forEach(platform => {
                          const value = parseFloat(platform.currencyAmount);
                          if (value > 0) {
                            protocolBalances.push({
                              protocol: platform.platformName,
                              value: value
                            });
                          }
                        });
                    }

                    const hasNonZero = protocolBalances.some(v => v.value > 0);
                    if (!hasNonZero) return null;
                    return (
                      <button
                        onClick={() => {
                          append({
                            role: 'user',
                            content: 'Show Pie chart of my protocols'
                          });
                          append({
                            role: 'assistant',
                            content: JSON.stringify({
                              type: 'ui',
                              component: 'ProtocolPieChart',
                              props: {
                                protocolBalances
                              }
                            })
                          });
                        }}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                        title="Show pie chart of protocols"
                      >
                        <PieChart className="w-4 h-4 text-zinc-400" />
                      </button>
                    );
                  })()}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAssetPanel(false)}
                    className="md:hidden"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Wallet connection status */}
              <div className="mb-6">
                {wallet.connected && wallet.account ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Wallet className="h-4 w-4 text-emerald-500" />
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {wallet.account.address.substring(0, 6)}...{wallet.account.address.substring(wallet.account.address.length - 4)}
                    </span>
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
              
              {/* Tokens section */}
              <div className="mb-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <div className="flex flex-row items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900">
                  <div className="flex-1">
                    <button
                      onClick={() => setShowTokens(!showTokens)}
                      className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded px-2 py-1"
                    >
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        Wallet {wallet.connected ? `$${formatNumber(totalTokenValue)}` : ''}
                      </span>
                      {showTokens ? (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                      )}
                    </button>
                  </div>
                  {(userTokens || []).length > 0 && (
                    <button
                      onClick={() => {
                        append({
                          role: 'user',
                          content: 'Show Pie chart of my assets'
                        });
                        append({
                          role: 'assistant',
                          content: JSON.stringify({
                            type: 'ui',
                            component: 'PieChartAssets',
                            props: {
                              tokenBalances: (userTokens || []).map(t => ({
                                symbol: t.symbol,
                                balance: t.balance,
                                decimals: t.decimals,
                                value: parseFloat(t.usdPrice || '0')
                              }))
                            }
                          })
                        });
                      }}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors ml-2"
                      title="Show pie chart of assets"
                    >
                      <PieChart className="w-4 h-4 text-zinc-400" />
                    </button>
                  )}
                </div>
                
                {showTokens && (
                  <div className="p-3">
                    {isLoadingAssets ? (
                      <div className="flex justify-center py-4">
                        <span className="text-sm text-zinc-500">Loading tokens...</span>
                      </div>
                    ) : (userTokens || []).length > 0 ? (
                      <div className="space-y-2">
                        {(userTokens || [])
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
                                  {formatTokenBalance(token.balance, token.decimals)} {token.symbol}
                                </p>
                                {token.usdPrice && (
                                  <p className="text-xs text-zinc-500">
                                    {formatUSDValue(token.usdPrice)}
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
              
              {/* Protocol sections */}
              {sortedProtocols.map((protocol, index) => (
                <div key={index} className="mb-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900">
                    <button 
                      onClick={() => {
                        if (protocol.type === 'scallop') {
                          setShowScallopPositions(!showScallopPositions);
                        } else if (protocol.type === 'momentum') {
                          setShowMomentumPositions(!showMomentumPositions);
                        } else if (protocol.type === 'finkeeper' && 'analysisPlatformId' in protocol.data) {
                          setShowFinkeeperPositions(prev => ({
                            ...prev,
                            [protocol.data.analysisPlatformId]: !prev[protocol.data.analysisPlatformId]
                          }));
                          if (!showFinkeeperPositions[protocol.data.analysisPlatformId] && wallet.account) {
                            fetchFinkeeperDetail(protocol.data.analysisPlatformId, wallet.account.address);
                          }
                        }
                      }}
                      className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded px-2 py-1"
                    >
                      <Image 
                        src={protocol.logo}
                        alt={`${protocol.name} Logo`}
                        width={16}
                        height={16}
                        className="rounded-sm"
                      />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {protocol.name} ${formatNumber(protocol.value)}
                      </span>
                      {((protocol.type === 'scallop' && showScallopPositions) ||
                        (protocol.type === 'momentum' && showMomentumPositions) ||
                        (protocol.type === 'finkeeper' && 'analysisPlatformId' in protocol.data && showFinkeeperPositions[protocol.data.analysisPlatformId])) ? (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <Link
                        href={protocol.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                        title={`Open ${protocol.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </Link>
                    </div>
                  </div>
                  
                  {((protocol.type === 'scallop' && showScallopPositions) ||
                    (protocol.type === 'momentum' && showMomentumPositions) ||
                    (protocol.type === 'finkeeper' && 'analysisPlatformId' in protocol.data && showFinkeeperPositions[protocol.data.analysisPlatformId])) && (
                    <div className="p-3">
                      {isLoadingAssets ? (
                        <div className="flex justify-center py-4">
                          <span className="text-sm text-zinc-500">Loading positions...</span>
                        </div>
                      ) : protocol.type === 'scallop' && 'lendings' in protocol.data ? (
                        // Scallop content
                        <div className="space-y-4">
                          {protocol.data.lendings && protocol.data.lendings.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium mb-2 text-zinc-500">Supplied Assets</h4>
                              <div className="space-y-2">
                                {protocol.data.lendings.map((lending: any, index: number) => (
                                  <div key={index} className="flex justify-between items-center">
                                    <div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                          Supply
                                        </span>
                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                          {lending.symbol}
                                        </span>
                                      </div>
                                      <p className="text-xs text-zinc-500">{formatNumber(lending.suppliedCoin)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                        ${formatNumber(parseFloat(lending.suppliedValue))}
                                      </p>
                                      <p className="text-xs text-zinc-500">
                                        APY: {(parseFloat(lending.supplyApy) * 100).toFixed(2)}%
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : protocol.type === 'momentum' && 'raw' in protocol.data ? (
                        // Momentum content
                        <div className="space-y-3">
                          {protocol.data.raw.map((position: any, index: number) => (
                            <div key={index} className="border border-zinc-200 dark:border-zinc-700 rounded p-2">
                              <div className="flex justify-between items-center mb-1">
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      position.status === 'In Range' 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                    }`}>
                                      {position.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-500">Range: {formatNumber(position.lowerPrice)} - {formatNumber(position.upperPrice)}</p>
                                </div>
                                
                                <div className="text-right">
                                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                    ${formatNumber(position.amount)}
                                  </p>
                                  {(position.feeAmountXUsd + position.feeAmountYUsd) > 0 && (
                                    <p className="text-xs text-zinc-500">
                                      Fees: ${formatNumber(position.feeAmountXUsd + position.feeAmountYUsd)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {position.claimableRewards > 0 && (
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                  Rewards: ${formatNumber(position.claimableRewards)}
                                </div>
                              )}
                            </div>
                          ))}
                          {/* Кнопка сбора наград Momentum */}
                          {protocol.data.raw.some((position: any) => position.claimableRewards > 0 || (position.feeAmountXUsd + position.feeAmountYUsd) > 0) && (
                            <div className="mt-2 flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={async () => {
                                  try {
                                    if (!wallet.connected || !wallet.account?.address) {
                                      alert("Please connect your wallet first");
                                      return;
                                    }

                                    console.log('Starting transaction...');

                                    // Инициализируем SDK
                                    const sdk = initMomentumSDK();
                                    console.log('SDK initialized');
                                    
                                    // Создаем транзакцию
                                    const tx = await createClaimAllTx(
                                      sdk,
                                      wallet.account.address
                                    );
                                    console.log('Transaction created:', tx);

                                    // Подписываем и отправляем транзакцию
                                    console.log('Signing and executing transaction...');
                                    const result = await wallet.signAndExecuteTransaction({
                                      transaction: tx
                                    });
                                    
                                    console.log('Transaction result:', result);
                                    alert('Transaction signed and executed successfully!');
                                    
                                    // Обновляем данные после успешной транзакции
                                    console.log('Refreshing user assets...');
                                    fetchUserAssets();
                                  } catch (error) {
                                    console.error('Error executing transaction:', error);
                                    if (error instanceof Error) {
                                      alert(`Failed to execute transaction: ${error.message}`);
                                    } else {
                                      alert('Failed to execute transaction: Unknown error');
                                    }
                                  }
                                }}
                              >
                                Collect all rewards and fees
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : protocol.type === 'finkeeper' && 'investmentCount' in protocol.data ? (
                        // Finkeeper content
                        <div>
                          {(() => {
                            const platformId = ('analysisPlatformId' in protocol.data ? protocol.data.analysisPlatformId : undefined);
                            if (!platformId) return null;
                            if (isLoadingFinkeeperDetail[platformId]) {
                              return (
                                <div className="flex justify-center py-4">
                                  <span className="text-sm text-zinc-500">Loading positions...</span>
                                </div>
                              );
                            }
                            const detail = finkeeperDetailData[platformId]?.data?.walletIdPlatformDetailList[0]?.networkHoldVoList[0]?.investTokenBalanceVoList;
                            if (detail) {
                              return (
                                <div className="space-y-3">
                                  {detail
                                    .filter(investment => !hideSmallAssets || parseFloat(investment.totalValue) >= 1)
                                    .map((investment: FinkeeperInvestment, index: number) => (
                                      <div key={index} className="border border-zinc-200 dark:border-zinc-700 rounded p-2">
                                        <div className="flex justify-between items-center mb-1">
                                          <div>
                                            <div className="flex items-center gap-1">
                                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                investment.investType === 1 
                                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                              }`}>
                                                {investment.investName}
                                              </span>
                                              <span className="text-sm font-medium">{investment.investmentName}</span>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                              ${formatNumber(investment.totalValue)}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="space-y-1 mt-2">
                                          {investment.assetsTokenList
                                            .filter(token => !hideSmallAssets || parseFloat(token.currencyAmount) >= 1)
                                            .map((token: FinkeeperTokenInfo, tokenIndex: number) => (
                                              <div key={tokenIndex} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-1">
                                                  <Image 
                                                    src={token.tokenLogo} 
                                                    alt={token.tokenSymbol}
                                                    width={16}
                                                    height={16}
                                                    className="rounded-full"
                                                  />
                                                  <span>{token.tokenSymbol}</span>
                                                </div>
                                                <div className="text-right">
                                                  <p>{formatNumber(token.coinAmount)} {token.tokenSymbol}</p>
                                                  <p className="text-zinc-500">${formatNumber(token.currencyAmount)}</p>
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                        {investment.rewardDefiTokenInfo.length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                            {(() => {
                                              const visibleRewards = investment.rewardDefiTokenInfo
                                                .flatMap(reward => reward.baseDefiTokenInfos)
                                                .filter(token => !hideSmallAssets || parseFloat(token.currencyAmount) >= 1);
                                              
                                              if (visibleRewards.length === 0 && hideSmallAssets) {
                                                return (
                                                  <div className="flex items-center gap-1">
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Rewards:</p>
                                                    <span className="text-xs text-zinc-500">&lt;$1</span>
                                                  </div>
                                                );
                                              }
                                              
                                              return (
                                                <>
                                                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Rewards:</p>
                                                  {investment.rewardDefiTokenInfo.map((reward: FinkeeperRewardInfo, rewardIndex: number) => (
                                                    <div key={rewardIndex} className="space-y-1">
                                                      {reward.baseDefiTokenInfos
                                                        .filter(token => !hideSmallAssets || parseFloat(token.currencyAmount) >= 1)
                                                        .map((token: FinkeeperTokenInfo, tokenIndex: number) => (
                                                          <div key={tokenIndex} className="flex justify-between items-center text-xs">
                                                            <div className="flex items-center gap-1">
                                                              <Image 
                                                                src={token.tokenLogo} 
                                                                alt={token.tokenSymbol}
                                                                width={16}
                                                                height={16}
                                                                className="rounded-full"
                                                              />
                                                              <span>{token.tokenSymbol}</span>
                                                            </div>
                                                            <div className="text-right">
                                                              <p>{formatNumber(token.coinAmount)} {token.tokenSymbol}</p>
                                                              <p className="text-zinc-500">${formatNumber(token.currencyAmount)}</p>
                                                            </div>
                                                          </div>
                                                        ))}
                                                    </div>
                                                  ))}
                                                </>
                                              );
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  {platformId === 115572 && naviData.rewards.length > 0 && (
                                    <div className="mt-2 flex justify-end">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={handleNaviCollect}
                                      >
                                        Collect Navi rewards
                                      </Button>
                                    </div>
                                  )}
                                  {hideSmallAssets && (() => {
                                    const hiddenInvestments = detail.filter(investment => parseFloat(investment.totalValue) < 1).length;
                                    const hiddenTokens = detail.flatMap(investment => investment.assetsTokenList).filter(token => parseFloat(token.currencyAmount) < 1).length;
                                    const hiddenRewards = detail.flatMap(investment => investment.rewardDefiTokenInfo).flatMap(reward => reward.baseDefiTokenInfos).filter(token => parseFloat(token.currencyAmount) < 1).length;
                                    const totalHidden = hiddenInvestments + hiddenTokens + hiddenRewards;
                                    if (totalHidden > 0) {
                                      return (
                                        <div className="text-xs text-zinc-500 mt-2">
                                          {totalHidden} assets hidden
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              );
                            }
                            return (
                              <div className="text-sm text-zinc-500">
                                {'investmentCount' in protocol.data ? `Active positions: ${protocol.data.investmentCount}` : ''}
                              </div>
                            );
                          })()}
                        </div>
                      ) : null}
                    </div>
                  )}
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
      
      {/* Центральная панель с диаграммами или деталями актива */}
      <div className="w-1/3 h-full border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto bg-white dark:bg-zinc-800">
        <div className="p-4">
          {selectedAsset ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                {selectedAsset.logo && (
                  <Image
                    src={selectedAsset.logo}
                    alt={`${selectedAsset.name} Logo`}
                    width={32}
                    height={32}
                    className="rounded-sm"
                  />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{selectedAsset.name}</h2>
                  <p className="text-sm text-zinc-500">${formatNumber(selectedAsset.value)}</p>
                </div>
              </div>
              
              {selectedAsset.type === 'token' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                    <span className="text-sm font-medium">Balance</span>
                    <span className="text-sm">{formatTokenBalance(selectedAsset.data.balance, selectedAsset.data.decimals)} {selectedAsset.data.symbol}</span>
                  </div>
                  {selectedAsset.data.usdPrice && (
                    <div className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                      <span className="text-sm font-medium">Price</span>
                      <span className="text-sm">${formatNumber(parseFloat(selectedAsset.data.usdPrice))}</span>
                    </div>
                  )}
                  
                  {/* Добавляем секцию с пулами */}
                  <TokenPools symbol={selectedAsset.data.symbol} />
                </div>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Analytics</h2>
              
              {/* Диаграмма содержимого кошелька */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Wallet Assets</h3>
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                  <PieChartAssets
                    tokenBalances={(userTokens || []).map(t => ({
                      symbol: t.symbol,
                      balance: t.balance,
                      decimals: t.decimals,
                      value: parseFloat(t.usdPrice || '0')
                    }))}
                  />
                </div>
              </div>

              {/* Диаграмма протоколов */}
              {sortedProtocols.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Protocols</h3>
                  <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                    <ProtocolPieChart
                      protocolBalances={[
                        { protocol: 'Wallet', value: totalTokenValue },
                        ...sortedProtocols.map(p => ({
                          protocol: p.name,
                          value: p.value
                        }))
                      ]}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex flex-col justify-between gap-4 flex-grow pb-20 relative w-1/3">
        {/* Мобильный блок статуса кошелька и суммы */}
        {isMobileView && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 dark:bg-zinc-900/90 rounded-xl shadow-lg h-10 px-4 flex items-center gap-3 border border-zinc-200 dark:border-zinc-700">
            <Wallet className="h-4 w-4 text-emerald-500" />
            {wallet.connected && wallet.account ? (
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                {wallet.account.address.substring(0, 6)}...{wallet.account.address.substring(wallet.account.address.length - 4)}
              </span>
            ) : (
              <ConnectButton label="Connect SUI wallet" />
            )}
            {wallet.connected && wallet.account && (
              <span className="text-xs text-zinc-700 dark:text-zinc-200 font-semibold">
                ${formatNumber(totalAssets)}
              </span>
            )}
          </div>
        )}
        <div
          ref={messagesContainerRef}
          className="flex flex-col gap-3 w-full items-center px-4 overflow-y-scroll scrollbar-none md:max-w-[750px] mx-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {messages.length === 0 && (
            <motion.div className="h-[350px] w-full md:w-[750px] md:px-0 pt-20">
              <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700 shadow-lg">
                <div className="flex flex-row justify-center items-center mb-2">
                  <Image
                    src="/android-chrome-512x512.png"
                    alt="SUI Harvester AI Logo"
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                </div>
                <p className="text-center text-zinc-900 dark:text-zinc-50 text-base leading-relaxed">
                  SUI Harvester AI - an intelligent assistant that analyzes and manages your liquidity in the SUI ecosystem. Connect your wallet and let our AI optimize your DeFi operations for maximum yield and efficient asset management.
                </p>
              </div>
            </motion.div>
          )}
          {messages.map((message, idx) => (
            <div
              key={message.id}
              className={`flex w-full md:max-w-[750px] ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${idx === 0 ? 'pt-20' : ''}`}
            >
              {(() => {
                let content;
                try {
                  const parsed = JSON.parse(message.content);
                  if (parsed && parsed.type === 'ui') {
                    content = renderToolResult(parsed);
                  }
                } catch {
                  content = message.content;
                }
                return (
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  }`}>
                    {content}
                  </div>
                );
              })()}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Быстрые действия (аналогично главной) */}
        <AnimatePresence>
          {showActionButtons && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full md:max-w-[750px] mx-auto mb-4 z-20"
            >
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 grid grid-cols-2 gap-4">
                {suggestedActions.map((action, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    onClick={() => {
                      setShowActionButtons(false);
                      if (action.action === 'show-usd-pools') {
                        // viewPoolsTool.execute({ token: 'usd' }).then(result => {
                        append({
                          role: 'user',
                          content: 'Show USD pools'
                        });
                        append({
                          role: 'assistant',
                          content: JSON.stringify({
                            type: 'ui',
                            component: 'PoolsView',
                            props: {
                              token: 'usd'
                            }
                          })
                        });
                      } else if (action.action === 'show-assets-pie-chart') {
                        append({
                          role: 'user',
                          content: 'Show Pie chart of my assets'
                        });
                        append({
                          role: 'assistant',
                          content: JSON.stringify({
                            type: 'ui',
                            component: 'PieChartAssets',
                            props: {
                              tokenBalances: (userTokens || []).map(t => ({
                                symbol: t.symbol,
                                balance: t.balance,
                                decimals: t.decimals,
                                value: parseFloat(t.usdPrice || '0')
                              }))
                            }
                          })
                        });
                      } else if (action.action === 'show-protocols-pie-chart') {
                        const protocolBalances = [
                          { protocol: 'Wallet', value: totalTokenValue },
                          { protocol: 'Scallop', value: scallopData ? (
                            parseFloat(scallopData.totalSupplyValue || "0") +
                            parseFloat(scallopData.totalCollateralValue || "0") +
                            parseFloat(scallopData.totalLockedScaValue || "0")
                          ) : 0 },
                          { protocol: 'Momentum', value: momentumData && momentumData.raw && !momentumData.raw.error ?
                            momentumData.raw.reduce((sum: number, pos: any) => sum + (pos.amount || 0), 0) : 0 }
                        ];

                        // Добавляем протоколы из Finkeeper
                        if (finkeeperData?.data.walletIdPlatformList[0]?.platformList) {
                          finkeeperData.data.walletIdPlatformList[0].platformList
                            .filter(platform => !['Scallop', 'Momentum'].includes(platform.platformName))
                            .forEach(platform => {
                              const value = parseFloat(platform.currencyAmount);
                              if (value > 0) {
                                protocolBalances.push({
                                  protocol: platform.platformName,
                                  value: value
                                });
                              }
                            });
                        }

                        append({
                          role: 'user',
                          content: 'Show Pie chart of my protocols'
                        });
                        append({
                          role: 'assistant',
                          content: JSON.stringify({
                            type: 'ui',
                            component: 'ProtocolPieChart',
                            props: {
                              protocolBalances
                            }
                          })
                        });
                      }
                    }}
                    className="text-left border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-300 rounded-lg p-4 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex flex-col"
                  >
                    <span className="font-medium">{action.title}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={onSubmit} className="flex flex-col gap-2 relative items-center w-full md:max-w-[750px] mx-auto">
          <div className="flex w-full shadow-lg">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Send a message..."
              className="flex-grow rounded-l-md bg-zinc-100 px-2 py-1.5 outline-none dark:bg-zinc-700 text-zinc-800 dark:text-zinc-300"
            />
            <Button
              type="submit"
              variant="default"
              size="icon"
              className="rounded-none border-r-0"
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="rounded-l-none"
              onClick={() => setShowActionButtons((prev) => !prev)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Home;