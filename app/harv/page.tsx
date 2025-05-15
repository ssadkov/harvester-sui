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
import { CameraView } from '@/components/camera-view';
import { HubView } from '@/components/hub-view';
import { UsageView } from '@/components/usage-view';
import { PoolsView } from '../components/chat/PoolsView';
import { WalletView } from '../components/chat/WalletView';

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

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    onFinish: (message) => {
      console.log('Chat finished:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });
  const wallet = useWallet();

  const [showActionButtons, setShowActionButtons] = useState(false);
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
  
  // Asset panel states
  const [userTokens, setUserTokens] = useState<Token[]>([]);
  const [scallopData, setScallopData] = useState<ScallopData | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [showAssetPanel, setShowAssetPanel] = useState(true);
  const [showTokens, setShowTokens] = useState(true);
  const [showScallopPositions, setShowScallopPositions] = useState(true);
  const [showMomentumPositions, setShowMomentumPositions] = useState(false);
  const [showBluefinPositions, setShowBluefinPositions] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  // Add new state for total value
  const [totalTokenValue, setTotalTokenValue] = useState<number>(0);

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

  // Обновляем предлагаемые действия
  const suggestedActions = [
    { title: "Check", label: "Scallop Balance", action: "check-scallop-balance" },
    { title: "Check", label: "Momentum Balance", action: "check-momentum-balance" },
    { title: "Show me", label: "Pie chart of my assets", action: "show-assets-pie-chart" },
    {
      title: "How much",
      label: "electricity have I used this month?",
      action: "Show electricity usage",
    },
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
    return sum;
  }, [totalTokenValue, scallopData, momentumData]);

  // Функция для дисконнекта и сброса данных
  const handleDisconnect = () => {
    wallet.disconnect();
    setUserTokens([]);
    setScallopData(null);
    setMomentumData(null);
    setTotalTokenValue(0);
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

  // Рендер результата tool-инвокации (аналогично TestChat)
  const renderToolResult = (result: any) => {
    if (typeof result === 'object' && result.type === 'ui') {
      switch (result.component) {
        case 'CameraView':
          return <CameraView {...result.props} />;
        case 'HubView':
          return <HubView {...result.props} />;
        case 'UsageView':
          return <UsageView {...result.props} />;
        case 'PoolsView':
          return <PoolsView {...result.props} />;
        case 'WalletView':
          return <WalletView {...result.props} />;
        default:
          return <div>Неизвестный компонент: {result.component}</div>;
      }
    }
    return <div>{JSON.stringify(result)}</div>;
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
                : "border-r border-zinc-200 dark:border-zinc-700 h-full max-h-screen overflow-y-auto bg-white dark:bg-zinc-800 z-10"
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
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
                      scallopData ? (
                        parseFloat(scallopData.totalSupplyValue || "0") +
                        parseFloat(scallopData.totalCollateralValue || "0") +
                        parseFloat(scallopData.totalLockedScaValue || "0")
                      ) : 0,
                      momentumData && momentumData.raw && !momentumData.raw.error ?
                        momentumData.raw.reduce((sum: number, pos: any) => sum + (pos.amount || 0), 0) : 0,
                      0 // Bluefin
                    ];
                    const hasNonZero = protocolBalances.some(v => v > 0);
                    if (!hasNonZero) return null;
                    return (
                      <button
                        onClick={() => {
                          // setMessages((messages) => [
                          //   ...messages,
                          //   <Message key={messages.length} role="assistant" content={<ProtocolPieChart protocolBalances={[
                          //     { protocol: 'Wallet', value: totalTokenValue },
                          //     { protocol: 'Scallop', value: scallopData ? 
                          //       parseFloat(scallopData.totalSupplyValue || "0") +
                          //       parseFloat(scallopData.totalCollateralValue || "0") +
                          //       parseFloat(scallopData.totalLockedScaValue || "0") : 0
                          //     },
                          //     { protocol: 'Momentum', value: momentumData && momentumData.raw && !momentumData.raw.error ? 
                          //       momentumData.raw.reduce((sum: number, pos: any) => sum + (pos.amount || 0), 0) : 0
                          //     },
                          //     { protocol: 'Bluefin', value: 0 }
                          //   ]} />} />
                          // ]);
                        }}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                        title="Show protocols distribution"
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
                        // setMessages((messages) => [
                        //   ...messages,
                        //   <Message key={messages.length} role="assistant" content={<PieChartAssets tokenBalances={(userTokens || []).map(t => ({ symbol: t.symbol, balance: t.balance, decimals: t.decimals, value: parseFloat(t.usdPrice || '0') }))} />} />
                        // ]);
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
                        
                        <div className="space-y-2">
                          {(userTokens || []).map((token) => (
                            <div key={token.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
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
              
              {/* Scallop section */}
              <div className="mb-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900">
                  <button 
                    onClick={() => setShowScallopPositions(!showScallopPositions)}
                    className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded px-2 py-1"
                  >
                    <Image 
                      src="https://app.scallop.io/images/logo-192.png"
                      alt="Scallop Logo"
                      width={16}
                      height={16}
                      className="rounded-sm"
                    />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      Scallop {scallopData ? 
                        `$${formatNumber(
                          parseFloat(scallopData.totalSupplyValue || "0") +
                          parseFloat(scallopData.totalCollateralValue || "0") +
                          parseFloat(scallopData.totalLockedScaValue || "0")
                        )}` : 
                        ''
                      }
                    </span>
                    {showScallopPositions ? (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <Link
                      href="https://app.scallop.io/referral?ref=670e31ea50cc539a9a3e2f84"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                      title="Open Scallop"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </Link>
                  </div>
                </div>
                
                {showScallopPositions && (
                  <div className="p-3">
                    {isLoadingAssets ? (
                      <div className="flex justify-center py-4">
                        <span className="text-sm text-zinc-500">Loading positions...</span>
                      </div>
                    ) : scallopData ? (
                      <div className="space-y-4">
                        {/* Summary section - removed, now in header */}
                        
                        {/* Supplied Assets */}
                        {scallopData.lendings && scallopData.lendings.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium mb-2 text-zinc-500">Supplied Assets</h4>
                            <div className="space-y-2">
                              {scallopData.lendings.map((lending, index) => (
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
                        
                        {/* Borrowings & Collateral */}
                        {scallopData.borrowings && scallopData.borrowings.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium mb-2 text-zinc-500">Collateral & Borrowings</h4>
                            <div className="space-y-3">
                              {scallopData.borrowings.map((position, posIndex) => (
                                <div key={posIndex} className="border border-zinc-200 dark:border-zinc-700 rounded p-2">
                                  {/* Collaterals */}
                                  {position.collaterals.map((collateral, collIndex) => (
                                    <div key={`coll-${posIndex}-${collIndex}`} className="flex justify-between items-center mb-1">
                                      <div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            Collateral
                                          </span>
                                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {collateral.symbol}
                                          </span>
                                        </div>
                                        <p className="text-xs text-zinc-500">{formatNumber(collateral.depositedCoin)}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                          ${formatNumber(collateral.depositedValueInUsd)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {/* Risk level */}
                                  <div className="flex items-center my-1">
                                    <span className="text-xs text-zinc-500 mr-1">Health:</span>
                                    {position.riskLevel === 0 && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        Excellent
                                      </span>
                                    )}
                                    {position.riskLevel === 1 && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        Low
                                      </span>
                                    )}
                                    {position.riskLevel === 2 && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                        Medium
                                      </span>
                                    )}
                                    {position.riskLevel === 3 && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                        High
                                      </span>
                                    )}
                                    {position.riskLevel >= 4 && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                        Very High
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Available to borrow */}
                                  {position.availableCollateralInUsd > 0 && (
                                    <div className="text-xs text-zinc-500 my-1">
                                      Available: ${formatNumber(position.availableCollateralInUsd)}
                                    </div>
                                  )}
                                  
                                  {/* Borrowings */}
                                  {position.borrowedPools && position.borrowedPools.length > 0 && (
                                    <div className="mt-2">
                                      {position.borrowedPools.map((borrowed, borrowIndex) => (
                                        <div key={`borrow-${posIndex}-${borrowIndex}`} className="flex justify-between items-center mb-1">
                                          <div>
                                            <div className="flex items-center gap-1">
                                              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                Borrow
                                              </span>
                                              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {borrowed.symbol}
                                              </span>
                                            </div>
                                            <p className="text-xs text-zinc-500">{formatNumber(borrowed.borrowedCoin)}</p>
                                          </div>
                                          <div className="text-right"><p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                              ${formatNumber(borrowed.borrowedValueInUsd)}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Locked SCA */}
                        {scallopData.veScas && scallopData.veScas.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium mb-2 text-zinc-500">Locked SCA</h4>
                            <div className="space-y-2">
                              {scallopData.veScas.map((veSca, index) => (
                                <div key={index} className="border border-zinc-200 dark:border-zinc-700 rounded p-2">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                        {formatNumber(veSca.lockedScaInCoin)} SCA
                                      </p>
                                      <p className="text-xs text-zinc-500">
                                        veSCA: {formatNumber(veSca.currentVeScaBalance)}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                        ${formatNumber(veSca.lockedScaInUsd)}
                                      </p>
                                      <p className="text-xs text-zinc-500">
                                        Unlocks in {Math.ceil(veSca.remainingLockPeriodInDays)} days
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Pending Rewards */}
                        {scallopData.pendingRewards && 
                          (scallopData.pendingRewards.lendings?.length > 0 || 
                           scallopData.pendingRewards.borrowIncentives?.length > 0) && (
                          <div>
                            <h4 className="text-xs font-medium mb-2 text-zinc-500">Pending Rewards</h4>
                            <div className="space-y-2 border border-zinc-200 dark:border-zinc-700 rounded p-2">
                              {/* Supply rewards */}
                              {scallopData.pendingRewards.lendings?.map((reward, index) => (
                                <div key={`supply-reward-${index}`} className="flex justify-between">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-zinc-500">Supply</span>
                                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                      {formatNumber(reward.pendingRewardInCoin)} {reward.symbol}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-500">
                                    ${formatNumber(reward.pendingRewardInUsd)}
                                  </p>
                                </div>
                              ))}
                              
                              {/* Borrow rewards */}
                              {scallopData.pendingRewards.borrowIncentives?.map((reward, index) => (
                                <div key={`borrow-reward-${index}`} className="flex justify-between">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-zinc-500">Borrow</span>
                                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                      {formatNumber(reward.pendingRewardInCoin)} {reward.symbol}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-500">
                                    ${formatNumber(reward.pendingRewardInUsd)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : wallet.connected ? (
                      <div className="text-center py-4 text-sm text-zinc-500">
                        No Scallop positions found
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-zinc-500">
                        Connect wallet to view positions
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Momentum section */}
              <div className="mb-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900">
                  <button 
                    onClick={() => setShowMomentumPositions(!showMomentumPositions)}
                    className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded px-2 py-1"
                  >
                    <Image 
                      src="https://app.mmt.finance/assets/images/momentum-logo-sq.svg"
                      alt="Momentum Logo"
                      width={16}
                      height={16}
                      className="rounded-sm"
                    />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      Momentum {momentumData && momentumData.raw && !momentumData.raw.error && momentumData.raw.length > 0 ? 
                        `$${formatNumber(momentumData.raw.reduce((sum: number, pos: any) => sum + pos.amount, 0))}` : 
                        ''
                      }
                    </span>
                    {showMomentumPositions ? (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <Link
                      href="https://app.mmt.finance/leaderboard?refer=8EQO6A"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                      title="Open Momentum"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </Link>
                  </div>
                </div>
                
                {showMomentumPositions && (
                  <div className="p-3">
                    {isLoadingAssets ? (
                      <div className="flex justify-center py-4">
                        <span className="text-sm text-zinc-500">Loading positions...</span>
                      </div>
                    ) : momentumData && momentumData.raw && !momentumData.raw.error && momentumData.raw.length > 0 ? (
                      <div className="space-y-3">
                        {/* Summary removed, now in header */}
                        
                        {momentumData.raw.map((position: any, index: number) => (
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
                      </div>
                    ) : wallet.connected ? (
                      <div className="text-center py-4 text-sm text-zinc-500">
                        No Momentum positions found
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-zinc-500">
                        Connect wallet to view positions
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Bluefin section */}
              <div className="mb-4 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900">
                  <button 
                    onClick={() => setShowBluefinPositions(!showBluefinPositions)}
                    className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded px-2 py-1"
                  >
                    <Image 
                      src="https://bluefin.io/images/square.png"
                      alt="Bluefin Logo"
                      width={16}
                      height={16}
                      className="rounded-sm"
                    />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">Bluefin</span>
                    {showBluefinPositions ? (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <Link
                      href="https://trade.bluefin.io/liquidity-pools"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                      title="Open Bluefin"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </Link>
                  </div>
                </div>
                
                {showBluefinPositions && (
                  <div className="p-3">
                    <div className="text-center py-4 text-sm text-zinc-500">
                      Coming soon - Bluefin integration
                    </div>
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
      <div className="flex flex-col justify-between gap-4 flex-grow pb-20 relative">
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
              {message.parts?.some(
                (part) => part.type === 'tool-invocation' && part.toolInvocation.state === 'result' && part.toolInvocation.result?.type === 'ui'
              ) ? (
                <div className="w-full max-w-none rounded-lg p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                  {message.parts?.map((part, index) => {
                    if (part.type === 'tool-invocation' && part.toolInvocation.state === 'result') {
                      return <div key={index}>{renderToolResult(part.toolInvocation.result)}</div>;
                    } else if (part.type === 'text') {
                      return <div key={index} className="text-sm">{part.text}</div>;
                    } else {
                      return null;
                    }
                  })}
                </div>
              ) : (
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                }`}>
                  {message.parts?.map((part, index) => {
                    switch (part.type) {
                      case 'text':
                        return <div key={index} className="text-sm">{part.text}</div>;
                      case 'tool-invocation':
                        return (
                          <div key={index} className="mt-2">
                            <div className="text-sm">
                              {part.toolInvocation.state === 'partial-call' && 
                                `Подготовка к вызову инструмента ${part.toolInvocation.toolName}...`}
                              {part.toolInvocation.state === 'call' && 
                                `Выполняется ${part.toolInvocation.toolName}...`}
                              {part.toolInvocation.state === 'result' && 
                                renderToolResult(part.toolInvocation.result)}
                            </div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              )}
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
              className="w-full md:max-w-[750px] mx-auto mb-4 z-50"
            >
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 grid grid-cols-2 gap-4">
                {suggestedActions.map((action, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    onClick={() => {}}
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

        <form onSubmit={(e) => { setShowActionButtons(false); handleSubmit(e); }} className="flex flex-col gap-2 relative items-center w-full md:max-w-[750px] mx-auto">
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
}