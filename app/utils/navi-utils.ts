import { Transaction } from '@mysten/sui/transactions';
import { claimAllRewardsPTB } from 'navi-sdk';
import { SuiClient } from '@mysten/sui/client';

// Инициализация SDK
export const initNaviSDK = () => {
  return new SuiClient({
    url: 'https://sui-mainnet.public.blastapi.io'
  });
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