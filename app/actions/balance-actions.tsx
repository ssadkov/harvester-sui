"use server";

import { z } from 'zod';

/**
 * Интерфейс для позиций Momentum
 */
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

/**
 * Форматирует данные о балансе Scallop для удобного чтения
 */
function formatScallopBalance(data: any) {
  // Расчет общей стоимости портфеля
  const totalValueLocked = (
    parseFloat(data.totalSupplyValue || "0") + 
    parseFloat(data.totalCollateralValue || "0") + 
    parseFloat(data.totalLockedScaValue || "0")
  ).toFixed(2);
  
  // Форматирование числа с разделителями тысяч и ограничением десятичных знаков
  const formatNumber = (num: number, digits = 2) => {
    // Если число очень маленькое, то показываем научную нотацию
    if (num < 0.00001 && num > 0) {
      return num.toExponential(4);
    }
    
    // Для чисел до 1 - больше знаков после запятой
    const decimals = num < 1 && num > 0 ? 6 : digits;
    
    // Для больших чисел - разделители тысяч
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  };
  
  // Форматирование денежных значений
  const formatUSD = (num: number) => {
    if (num < 0.01 && num > 0) {
      return `$${num.toFixed(6)}`;
    }
    return `$${formatNumber(num, 2)}`;
  };
  
  // Форматирование процентов
  const formatPercent = (num: number) => `${(num * 100).toFixed(2)}%`;
  
  // Создаем массив строк для отображения
  let output: string[] = ["# Your Scallop Portfolio Summary\n"];
  
  // Общая информация
  output.push(`## Total Value Locked: ${formatUSD(parseFloat(totalValueLocked))}`);
  output.push(`- Supplied Assets: ${formatUSD(data.totalSupplyValue || 0)}`);
  output.push(`- Collateral Value: ${formatUSD(data.totalCollateralValue || 0)}`);
  output.push(`- Locked SCA: ${formatUSD(data.totalLockedScaValue || 0)}`);
  output.push(`- Debt: ${formatUSD(data.totalDebtValue || 0)}\n`);
  
  // Поставленные активы
  if (data.lendings && data.lendings.length > 0) {
    output.push(`## Supplied Assets (${data.lendings.length})`);
    data.lendings.forEach((lending: any, index: number) => {
      const suppliedValue = parseFloat(lending.suppliedValue || "0");
      const apy = parseFloat(lending.supplyApy || "0");
      
      output.push(`${index + 1}. ${formatNumber(lending.suppliedCoin)} ${lending.symbol} (${formatUSD(suppliedValue)}) - APY: ${formatPercent(apy)}`);
    });
    output.push("");
  }
  
  // Залоги и кредитные позиции
  if (data.borrowings && data.borrowings.length > 0) {
    output.push("## Collateral Positions");
    
    data.borrowings.forEach((position: any) => {
      const collaterals = position.collaterals || [];
      const borrowedPools = position.borrowedPools || [];
      
      // Отображаем залоги
      collaterals.forEach((collateral: any) => {
        output.push(`- ${formatNumber(collateral.depositedCoin)} ${collateral.symbol} (${formatUSD(collateral.depositedValueInUsd || 0)})`);
      });
      
      // Информация о доступных средствах для займа
      if (position.availableCollateralInUsd > 0) {
        output.push(`- Available to Borrow: ${formatUSD(position.availableCollateralInUsd)}`);
      }
      
      // Уровень риска
      const riskLevels = ["Excellent (0% risk)", "Low", "Medium", "High", "Very High"];
      const riskLevel = position.riskLevel < riskLevels.length ? riskLevels[position.riskLevel] : "Unknown";
      output.push(`- Health: ${riskLevel}`);
      
      // Информация о займах, если они есть
      if (borrowedPools.length > 0) {
        output.push("- Borrowed:");
        borrowedPools.forEach((loan: any) => {
          output.push(`  * ${formatNumber(loan.borrowedCoin)} ${loan.symbol} (${formatUSD(loan.borrowedValueInUsd || 0)})`);
        });
      }
      
      output.push("");
    });
  }
  
  // Заблокированный SCA
  if (data.veScas && data.veScas.length > 0) {
    output.push("## Locked SCA");
    
    data.veScas.forEach((veSca: any) => {
      output.push(`- ${formatNumber(veSca.lockedScaInCoin)} SCA (${formatUSD(veSca.lockedScaInUsd || 0)})`);
      output.push(`- veSCA Balance: ${formatNumber(veSca.currentVeScaBalance || 0)}`);
      output.push(`- Unlocks in: ${Math.ceil(veSca.remainingLockPeriodInDays || 0)} days`);
    });
    
    output.push("");
  }
  
  // Ожидающие награды
  if (data.pendingRewards) {
    const lendingRewards = data.pendingRewards.lendings || [];
    const borrowRewards = data.pendingRewards.borrowIncentives || [];
    
    if (lendingRewards.length > 0 || borrowRewards.length > 0) {
      output.push("## Pending Rewards");
      
      // Сначала отображаем награды за лендинг
      lendingRewards.forEach((reward: any) => {
        output.push(`- ${formatNumber(reward.pendingRewardInCoin)} ${reward.symbol} (${formatUSD(reward.pendingRewardInUsd || 0)})`);
      });
      
      // Затем награды за заимствование
      borrowRewards.forEach((reward: any) => {
        output.push(`- ${formatNumber(reward.pendingRewardInCoin)} ${reward.symbol} (${formatUSD(reward.pendingRewardInUsd || 0)})`);
      });
    }
  }
  
  return {
    formatted: output.join('\n'),
    raw: data
  };
}

/**
 * Форматирует данные о позициях Momentum для удобного чтения
 */
function formatMomentumBalance(positions: MomentumPosition[]) {
  // Если нет позиций, возвращаем информацию об отсутствии
  if (!positions || positions.length === 0) {
    return {
      formatted: "# Momentum Positions\n\nYou don't have any active Momentum positions.",
      raw: []
    };
  }
  
  // Вспомогательные функции форматирования
  const formatNumber = (num: number, digits = 2) => {
    if (num < 0.00001 && num > 0) {
      return num.toExponential(4);
    }
    
    const decimals = num < 1 && num > 0 ? 6 : digits;
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  };
  
  const formatUSD = (num: number) => {
    if (num < 0.01 && num > 0) {
      return `$${num.toFixed(6)}`;
    }
    return `$${formatNumber(num, 2)}`;
  };
  
  // Создаем массив строк для отображения
  let output: string[] = ["# Your Momentum Positions\n"];
  
  // Рассчитываем общую стоимость всех позиций
  const totalValue = positions.reduce((sum, position) => sum + position.amount, 0);
  output.push(`## Total Value: ${formatUSD(totalValue)}\n`);
  
  // Рассчитываем общую сумму наград
  const totalRewards = positions.reduce((sum, position) => sum + position.claimableRewards, 0);
  const totalFees = positions.reduce((sum, position) => sum + position.feeAmountXUsd + position.feeAmountYUsd, 0);
  
  output.push(`### Claimable Rewards: ${formatUSD(totalRewards)}`);
  output.push(`### Accumulated Fees: ${formatUSD(totalFees)}\n`);
  
  // Детали каждой позиции
  output.push(`## Position Details (${positions.length})`);
  
  positions.forEach((position, index) => {
    output.push(`### Position ${index + 1}`);
    output.push(`- Value: ${formatUSD(position.amount)}`);
    output.push(`- Status: ${position.status}`);
    output.push(`- Price Range: ${formatNumber(position.lowerPrice)} - ${formatNumber(position.upperPrice)}`);
    
    if (position.claimableRewards > 0) {
      output.push(`- Claimable Rewards: ${formatUSD(position.claimableRewards)}`);
    }
    
    const totalFees = position.feeAmountXUsd + position.feeAmountYUsd;
    if (totalFees > 0) {
      output.push(`- Accumulated Fees: ${formatUSD(totalFees)}`);
    }
    
    output.push(`- Position ID: ${position.objectId.substring(0, 10)}...`);
    output.push(`- Pool ID: ${position.poolId.substring(0, 10)}...\n`);
  });
  
  return {
    formatted: output.join('\n'),
    raw: positions
  };
}

/**
 * Серверное действие для получения баланса пользователя в Scallop
 * @param address адрес кошелька пользователя
 * @returns форматированные данные о балансе или объект с ошибкой
 */
export async function fetchScallopBalance(address: string) {
  try {
    console.log(`Fetching Scallop balance for address: ${address}`);
    
    const response = await fetch(
      `https://harvester-server-1.onrender.com/scallop/balance/${address}`,
      {
        method: 'GET',
        headers: {
          'accept': '*/*'
        },
        // Опция, позволяющая обновить кеш
        next: { revalidate: 60 } // Обновляет кеш каждые 60 секунд
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Форматируем данные для удобного отображения
    return formatScallopBalance(data);
  } catch (error) {
    console.error("Server error fetching Scallop balance:", error);
    return { 
      formatted: `Error: ${error instanceof Error ? error.message : "Failed to fetch balance data"}`,
      raw: { error: error instanceof Error ? error.message : "Failed to fetch balance data" }
    };
  }
}

/**
 * Серверное действие для получения позиций пользователя в Momentum
 * @param address адрес кошелька пользователя
 * @returns форматированные данные о позициях или объект с ошибкой
 */
export async function fetchMomentumBalance(address: string) {
  try {
    console.log(`Fetching Momentum positions for address: ${address}`);
    
    const response = await fetch(
      `https://harvester-server-1.onrender.com/momentum/balance/${address}`,
      {
        method: 'GET',
        headers: {
          'accept': '*/*'
        },
        // Опция, позволяющая обновить кеш
        next: { revalidate: 60 } // Обновляет кеш каждые 60 секунд
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const positions = await response.json();
    
    // Форматируем данные для удобного отображения
    return formatMomentumBalance(positions);
  } catch (error) {
    console.error("Server error fetching Momentum positions:", error);
    return { 
      formatted: `Error: ${error instanceof Error ? error.message : "Failed to fetch Momentum positions"}`,
      raw: { error: error instanceof Error ? error.message : "Failed to fetch Momentum positions" }
    };
  }
}

// Token interface
export interface Token {
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

export interface TokenData {
  [key: string]: Token;
}

// Function to fetch token balances
export async function fetchTokenBalances(address: string): Promise<TokenData> {
  try {
    const response = await fetch(`https://finkeeper.pro/apisui?address=${address}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching token balances:', error);
    throw error;
  }
}

// Function to sort tokens by USD value
export async function sortTokensByValue(tokens: TokenData): Promise<Token[]> {
  try {
    if (!tokens) return [];
    return Object.values(tokens).sort((a, b) => {
      const valueA = parseFloat(a.usdPrice || '0');
      const valueB = parseFloat(b.usdPrice || '0');
      return valueB - valueA;
    });
  } catch (error) {
    console.error('Error sorting tokens:', error);
    return [];
  }
}

// Function to calculate total portfolio value
export async function calculateTotalPortfolioValue(tokens: TokenData): Promise<number> {
  try {
    if (!tokens) return 0;
    return Object.values(tokens).reduce((total, token) => {
      return total + parseFloat(token.usdPrice || '0');
    }, 0);
  } catch (error) {
    console.error('Error calculating portfolio value:', error);
    return 0;
  }
}