import { Transaction } from '@mysten/sui/transactions';
import { MmtSDK } from '@mmt-finance/clmm-sdk';

// Инициализация SDK
export const initMomentumSDK = () => {
  return MmtSDK.NEW({
    network: 'mainnet',
  });
};

// Создание транзакции для сбора наград
export const createClaimAllTx = async (
  sdk: MmtSDK,
  senderAddress: string
) => {
  try {
    console.log('Creating claim transaction for address:', senderAddress);

    // Получаем все пулы
    const pools = await sdk.Pool.getAllPools();
    console.log('Found pools:', pools.length);

    // Создаем транзакцию используя SDK метод
    const tx = await sdk.Pool.collectAllPoolsRewards(senderAddress, pools);

    console.log('Transaction created successfully');
    return tx;
  } catch (error) {
    console.error('Error creating claim transaction:', error);
    throw error;
  }
};
