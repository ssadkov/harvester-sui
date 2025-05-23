import { Transaction } from '@mysten/sui/transactions';
import { claimAllRewardsPTB } from 'navi-sdk';
import { SuiClient } from '@mysten/sui/client';
import { pool, Pool, PoolConfig } from '@/app/types';

// Инициализация SDK
export const initNaviSDK = () => {
  return new SuiClient({
    url: 'https://sui-mainnet.public.blastapi.io'
  });
};

// Получение PoolConfig по символу токена
export const getPoolConfig = (symbol: string): PoolConfig | null => {
  // Приводим символ к верхнему регистру для поиска
  const normalizedSymbol = symbol.toUpperCase();
  
  // Ищем ключ в объекте pool, игнорируя регистр
  const poolKey = Object.keys(pool).find(
    key => key.toUpperCase() === normalizedSymbol
  ) as keyof Pool | undefined;

  if (!poolKey) {
    console.error(`Pool not found for token ${symbol}`);
    return null;
  }

  return pool[poolKey];
};

// Создание транзакции для сбора наград
export const createClaimAllRewardsTx = async (
  client: SuiClient,
  userAddress: string
) => {
  // Создаем новый Transaction Block
  const txb = new Transaction();
  txb.setSender(userAddress);
  
  // Добавляем в него вызов claimAllRewardsPTB
  await claimAllRewardsPTB(client, userAddress, txb);
  
  // Возвращаем подготовленную транзакцию для подписи
  return txb;
};

// Проверка доступных наград
export const getAvailableRewards = async (
  client: SuiClient,
  userAddress: string
) => {
  try {
    // Используем claimAllRewardsPTB для проверки наград
    const txb = new Transaction();
    txb.setSender(userAddress);
    await claimAllRewardsPTB(client, userAddress, txb);
    
    // Если транзакция создалась успешно, значит есть награды
    return [{
      type: 'reward',
      amount: '0', // Здесь нужно добавить реальную сумму наград
      symbol: 'NAVI'
    }];
  } catch (error) {
    console.error('Error getting rewards:', error);
    return [];
  }
}; 