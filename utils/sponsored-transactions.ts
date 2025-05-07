import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs'; 
import { fromB64, toB64 } from '@mysten/sui/utils';

/**
 * Token information in Sui
 */
export interface TokenInfo {
  /** Coin type, e.g. "0x2::sui::SUI" for native SUI */
  coinType: string;
  /** Number of decimal places in the token */
  decimals: number;
  /** Token symbol (for display) */
  symbol: string;
}

/**
 * Popular tokens in Sui
 */
export const TOKENS: Record<string, TokenInfo> = {
  SUI: {
    coinType: '0x2::sui::SUI',
    decimals: 9,
    symbol: 'SUI'
  },
  USDC: {
    coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
    decimals: 6,
    symbol: 'USDC'
  },
  // Add other tokens as needed
};

/**
 * Initialize Sui client
 */
export function initSuiClient(network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet') {
  return new SuiClient({
    url: network === 'mainnet' 
      ? 'https://fullnode.mainnet.sui.io:443'
      : network === 'testnet'
      ? 'https://fullnode.testnet.sui.io:443'
      : 'https://fullnode.devnet.sui.io:443'
  });
}

/**
 * Create a keypair from a seed phrase
 * @param seedPhrase Mnemonic seed phrase (12 or 24 words)
 */
export function createKeypairFromSeed(seedPhrase: string): Ed25519Keypair {
  // Sui рекомендует использовать именно этот метод!
  return Ed25519Keypair.deriveKeypair(seedPhrase, "m/44'/784'/0'/0'/0'");
}

/**
 * Prepare transaction for signing by user
 * @param amount Amount to send
 * @param tokenSymbol Token symbol (must be in TOKENS)
 * @param recipientAddress Recipient address
 * @param senderAddress Sender address
 * @returns Transaction bytes for signing
 */
export async function prepareTransactionForSigning(
  amount: number | string,
  tokenSymbol: string,
  recipientAddress: string,
  senderAddress: string
) {
  if (!TOKENS[tokenSymbol]) {
    throw new Error(`Token ${tokenSymbol} not found in the list of supported tokens`);
  }
  
  const tokenInfo = TOKENS[tokenSymbol];
  const client = initSuiClient();
  
  const amountInSmallestUnits = BigInt(
    Math.round(Number(amount) * 10 ** tokenInfo.decimals)
  );
  
  try {
    const txb = new Transaction();
    
    // Получаем монеты пользователя
    const { data: coins } = await client.getCoins({
      owner: senderAddress,
      coinType: tokenInfo.coinType
    });
    
    if (!coins || coins.length === 0) {
      throw new Error(`No ${tokenSymbol} coins found in account`);
    }
    
    const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    
    if (totalBalance < amountInSmallestUnits) {
      throw new Error(`Insufficient funds in sender's account`);
    }
    
    // Строим транзакцию перевода
    if (totalBalance === amountInSmallestUnits) {
      txb.transferObjects(
        coins.map(coin => txb.object(coin.coinObjectId)),
        txb.pure.address(recipientAddress)
      );
    } else {
      const [coin] = txb.splitCoins(
        txb.object(coins[0].coinObjectId),
        [txb.pure.u64(amountInSmallestUnits)]
      );
      txb.transferObjects([coin], txb.pure.address(recipientAddress));
    }
    
    // Устанавливаем отправителя
    txb.setSender(senderAddress);
    
    // Строим только transaction kind, без газа
    const txBytes = await txb.build({ client, onlyTransactionKind: true });
    
    // Преобразуем в Base64
    const txBase64 = toB64(txBytes);
    
    // Создаем обертку совместимую с wallet-kit
    const transactionWrapper = {
      toJSON: async () => {
        return Promise.resolve(txBase64);
      }
    };
    
    return {
      success: true,
      txBytes,
      txBase64,
      transaction: transactionWrapper,
      amount: Number(amount),
      amountInSmallestUnits: amountInSmallestUnits.toString(),
      tokenInfo
    };
  } catch (error) {
    console.error('Error preparing transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a sponsored transaction
 * @param amount Amount to send
 * @param tokenSymbol Token symbol (must be in TOKENS)
 * @param recipientAddress Recipient address
 * @param senderAddress Sender address
 * @param senderSignatureData Sender's signature data from wallet
 * @returns Transaction execution result
 */
export async function sendSponsoredTransaction(
  amount: number | string,
  tokenSymbol: string,
  recipientAddress: string,
  senderAddress: string,
  senderSignatureData: any
) {
  console.log('Starting sponsored transaction process');
  
  try {
    if (!TOKENS[tokenSymbol]) {
      throw new Error(`Token ${tokenSymbol} not found in the list of supported tokens`);
    }
    
    console.log('Signature data type:', typeof senderSignatureData);
    console.log('Signature data:', 
      typeof senderSignatureData === 'string' 
        ? `${senderSignatureData.substring(0, 30)}... (length: ${senderSignatureData.length})` 
        : JSON.stringify(senderSignatureData).substring(0, 100) + '...');
    
    // Более надежная обработка формата подписи
    let senderSignature;
    
    if (typeof senderSignatureData === 'string') {
      senderSignature = senderSignatureData;
    } else if (senderSignatureData && senderSignatureData.signature) {
      senderSignature = senderSignatureData.signature;
    } else if (senderSignatureData && typeof senderSignatureData === 'object') {
      // Пытаемся извлечь подпись из известных форматов кошельков
      if (senderSignatureData.data) {
        senderSignature = senderSignatureData.data;
      } else if (senderSignatureData.bytes) {
        // Некоторые кошельки используют bytes
        senderSignature = senderSignatureData.bytes;
      } else {
        console.error('Неизвестный формат подписи:', senderSignatureData);
        throw new Error('Не удалось извлечь подпись из предоставленных данных');
      }
    } else {
      throw new Error('Недопустимый формат подписи');
    }
    
    console.log('Extracted sender signature type:', typeof senderSignature);
    console.log('Extracted sender signature:', 
      typeof senderSignature === 'string' 
        ? `${senderSignature.substring(0, 30)}... (length: ${senderSignature.length})` 
        : 'Not a string');
    
    // Создаем транзакцию
    const txb = new Transaction();
    
    // Получаем seed phrase для спонсора
    const sponsorSeedPhrase = process.env.NEXT_PUBLIC_SPONSOR_SEED_PHRASE || 
                             process.env.SPONSOR_SEED_PHRASE;
    
    if (!sponsorSeedPhrase) {
      throw new Error('Seed phrase спонсора не найдена в переменных окружения');
    }
    
    // Создаем keypair спонсора
    const sponsorKeypair = createKeypairFromSeed(sponsorSeedPhrase);
    const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();
    console.log('Sponsor address:', sponsorAddress);
    
    // Инициализируем клиент
    const client = initSuiClient();
    
    // Конвертируем сумму
    const tokenInfo = TOKENS[tokenSymbol];
    const amountInSmallestUnits = BigInt(
      Math.round(Number(amount) * 10 ** tokenInfo.decimals)
    );
    
    console.log('Amount in smallest units:', amountInSmallestUnits.toString());
    
    // Получаем монеты отправителя
    const { data: senderCoins } = await client.getCoins({
      owner: senderAddress,
      coinType: tokenInfo.coinType
    });
    
    if (!senderCoins || senderCoins.length === 0) {
      throw new Error(`Монеты ${tokenSymbol} не найдены на счете отправителя`);
    }
    
    console.log('Found sender coins:', senderCoins.length);
    
    // Проверяем баланс
    const totalBalance = senderCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    if (totalBalance < amountInSmallestUnits) {
      throw new Error(`Недостаточно средств на счете отправителя`);
    }
    
    console.log('Total balance:', totalBalance.toString());
    
    // Получаем монеты спонсора для газа
    const { data: sponsorCoins } = await client.getCoins({
      owner: sponsorAddress,
      coinType: '0x2::sui::SUI'
    });
    
    if (!sponsorCoins || sponsorCoins.length === 0) {
      throw new Error('На счете спонсора не найдены монеты для оплаты газа');
    }
    
    console.log('Found sponsor coins:', sponsorCoins.length);
    
    // Строим транзакцию перевода
    if (totalBalance === amountInSmallestUnits) {
      txb.transferObjects(
        senderCoins.map(coin => txb.object(coin.coinObjectId)),
        txb.pure.address(recipientAddress)
      );
    } else {
      const [coin] = txb.splitCoins(
        txb.object(senderCoins[0].coinObjectId),
        [txb.pure.u64(amountInSmallestUnits)]
      );
      txb.transferObjects([coin], txb.pure.address(recipientAddress));
    }
    
    // Устанавливаем отправителя и газ
    txb.setSender(senderAddress);
    txb.setGasOwner(sponsorAddress);
    txb.setGasPayment([{
      objectId: sponsorCoins[0].coinObjectId,
      version: sponsorCoins[0].version,
      digest: sponsorCoins[0].digest
    }]);
    
    // Устанавливаем явный бюджет газа
    const txBytes = await txb.build({ 
      client
    });
    
    console.log('Transaction built successfully, bytes length:', txBytes.length);
    
    // Обеспечиваем правильный формат подписи отправителя
    // Это, вероятно, место, где возникает ошибка DataView
    let finalSenderSignature;
    
    try {
      // Пытаемся правильно форматировать подпись
      if (typeof senderSignature === 'string') {
        // Обрабатываем подписи в формате base64
        if (senderSignature.includes('==')) {
          try {
            // Проверяем, это base64, который нужно декодировать
            const decoded = fromB64(senderSignature);
            console.log('Successfully decoded base64 signature');
            finalSenderSignature = senderSignature; // Оставляем оригинал, если он уже правильно отформатирован
          } catch (e) {
            console.log('Not valid base64, using as is');
            finalSenderSignature = senderSignature;
          }
        } 
        // Обрабатываем hex подписи
        else if (senderSignature.startsWith('0x')) {
          finalSenderSignature = senderSignature;
        } 
        // Добавляем hex префикс, если отсутствует
        else {
          finalSenderSignature = `0x${senderSignature}`;
        }
      } else {
        throw new Error('Подпись отправителя должна быть строкой');
      }
      
      console.log('Final sender signature format:', 
        finalSenderSignature.substring(0, 30) + '... (length: ' + finalSenderSignature.length + ')');
      
    } catch (error) {
      console.error('Error processing sender signature:', error);
      throw new Error('Не удалось обработать подпись отправителя');
    }
    
    // Спонсор подписывает транзакцию
    const sponsorSignatureResult = await sponsorKeypair.signTransaction(txBytes);
    const sponsorSignature = sponsorSignatureResult.signature;
    
    console.log('Transaction signed by sponsor, signature length:', sponsorSignature.length);
    
    // Проверка формата подписи спонсора
    const finalSponsorSignature = sponsorSignature.startsWith('0x') 
      ? sponsorSignature 
      : `0x${sponsorSignature}`;
    
    console.log('Signature formats - Sender:', 
      finalSenderSignature.startsWith('0x') ? 'Hex (0x)' : 'Other',
      'Sponsor:', finalSponsorSignature.startsWith('0x') ? 'Hex (0x)' : 'Other');
    
    // Выполняем транзакцию с обеими подписями
    try {
      console.log('Executing transaction with signatures...');
      
      const result = await client.executeTransactionBlock({
        transactionBlock: txBytes,
        signature: [finalSenderSignature, finalSponsorSignature],
        options: {
          showEffects: true,
          showEvents: true,
        },
      });
      
      console.log('Transaction executed successfully:', result.digest);
      
      return {
        success: true,
        transactionDigest: result.digest,
        result
      };
    } catch (error) {
      console.error('Error executing transaction block:', error);
      
      // Пробуем альтернативный формат подписи - иногда это может помочь
      if (error instanceof Error && 
          (error.message.includes('DataView') || error.message.includes('bounds'))) {
        console.log('Trying alternative signature format...');
        
        // Пробуем декодировать base64, если это возможно
        try {
          let altSenderSignature = finalSenderSignature;
          
          // Если подпись в формате base64, преобразуем в бинарный массив
          if (finalSenderSignature.includes('==')) {
            const binaryData = fromB64(finalSenderSignature);
            altSenderSignature = `0x${Buffer.from(binaryData).toString('hex')}`;
          }
          
          console.log('Trying with alternative sender signature format');
          
          const retryResult = await client.executeTransactionBlock({
            transactionBlock: txBytes,
            signature: [altSenderSignature, finalSponsorSignature],
            options: {
              showEffects: true,
              showEvents: true,
            },
          });
          
          console.log('Transaction executed successfully with alternative format:', retryResult.digest);
          
          return {
            success: true,
            transactionDigest: retryResult.digest,
            result: retryResult
          };
        } catch (retryError) {
          console.error('Alternative format also failed:', retryError);
          throw error; // Выбрасываем исходную ошибку
        }
      }
      
      throw error; // Перебрасываем ошибку дальше
    }
  } catch (error) {
    console.error('Error in sponsored transaction:', error);
    
    // Предоставляем более подробную информацию об ошибке
    let errorMessage = 'Unknown error';
    let errorDetails = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        stack: error.stack,
      };
      
      // Специальная обработка ошибок DataView
      if (error.message.includes('DataView') || error.message.includes('bounds')) {
        errorMessage = 'Binary data format error: ' + error.message;
        console.error('This is likely an issue with signature format or transaction bytes');
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      details: errorDetails
    };
  }
}