import { Transaction } from '@mysten/sui/transactions';
import { MmtSDK } from '@mmt-finance/clmm-sdk';

// Инициализация SDK
export const initMomentumSDK = () => {
  return MmtSDK.NEW({
    network: 'mainnet',
  });
};

// Создание транзакции для сбора наград
export const createClaimRewardsTx = async (
  sdk: MmtSDK,
  poolId: string,
  positionId: string,
  rewarderIds: string[]
) => {
  try {
    console.log('Creating claim rewards transaction with params:', {
      poolId,
      positionId,
      rewarderIds
    });

    const tx = new Transaction();
    
    // Добавляем вызов для сбора наград
    tx.moveCall({
      target: `${sdk.PackageId}::incentive::claim_rewards`,
      arguments: [
        tx.object(poolId),
        tx.object(positionId),
        tx.makeMoveVec({ elements: rewarderIds.filter(id => id).map(id => tx.object(id)) })
      ],
    });

    console.log('Transaction created successfully');
    return tx;
  } catch (error) {
    console.error('Error creating claim rewards transaction:', error);
    throw error;
  }
};

// Создание транзакции для сбора комиссий
export const createClaimFeesTx = async (
  sdk: MmtSDK,
  poolId: string,
  positionId: string
) => {
  try {
    console.log('Creating claim fees transaction with params:', {
      poolId,
      positionId
    });

    const tx = new Transaction();
    
    // Добавляем вызов для сбора комиссий
    tx.moveCall({
      target: `${sdk.PackageId}::pool::collect_fee`,
      arguments: [
        tx.object(poolId),
        tx.object(positionId)
      ],
    });

    console.log('Transaction created successfully');
    return tx;
  } catch (error) {
    console.error('Error creating claim fees transaction:', error);
    throw error;
  }
};

// Объединение транзакций для сбора наград и комиссий
export const createClaimAllTx = async (
  sdk: MmtSDK,
  poolId: string,
  positionId: string,
  rewarderIds: string[]
) => {
  try {
    console.log('Creating claim all transaction with params:', {
      poolId,
      positionId,
      rewarderIds
    });

    const tx = new Transaction();
    
    // Добавляем вызов для сбора комиссий
    tx.moveCall({
      target: `${sdk.PackageId}::pool::collect_fee`,
      arguments: [
        tx.object(poolId),
        tx.object(positionId)
      ],
    });

    // Добавляем вызов для сбора наград
    tx.moveCall({
      target: `${sdk.PackageId}::incentive::claim_rewards`,
      arguments: [
        tx.object(poolId),
        tx.object(positionId),
        tx.makeMoveVec({ elements: rewarderIds.filter(id => id).map(id => tx.object(id)) })
      ],
    });

    console.log('Transaction created successfully');
    return tx;
  } catch (error) {
    console.error('Error creating claim all transaction:', error);
    throw error;
  }
}; 