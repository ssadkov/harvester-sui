import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs'; 
import { fromB64 } from '@mysten/sui/utils';
import { bech32 } from 'bech32';
import { mnemonicToSeedSync } from 'bip39';
import { derivePath } from 'ed25519-hd-key';


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
 * Send a sponsored transaction
 * @param amount Amount to send
 * @param tokenSymbol Token symbol (must be in TOKENS)
 * @param recipientAddress Recipient address
 * @param senderAddress Sender address
 * @param senderSignature Sender's signature from wallet
 * @returns Transaction execution result
 */
export async function sendSponsoredTransaction(
  amount: number | string,
  tokenSymbol: string,
  recipientAddress: string,
  senderAddress: string,
  senderSignature: string | any
) {
  const signature = typeof senderSignature === 'string' 
    ? senderSignature 
    : senderSignature.signature || senderSignature;
  if (!TOKENS[tokenSymbol]) {
    throw new Error(`Token ${tokenSymbol} not found in the list of supported tokens`);
  }
  const tokenInfo = TOKENS[tokenSymbol];
  const sponsorSeedPhrase = process.env.NEXT_PUBLIC_SPONSOR_SEED_PHRASE || 
                           process.env.SPONSOR_SEED_PHRASE;
  console.log('Sponsor seed phrase:', sponsorSeedPhrase);
  if (!sponsorSeedPhrase) {
    throw new Error('Sponsor seed phrase not found in environment variables');
  }
  const sponsorKeypair = createKeypairFromSeed(sponsorSeedPhrase);
  const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();
  console.log('Sponsor address:', sponsorAddress);
  const client = initSuiClient();
  const amountInSmallestUnits = BigInt(
    Math.round(Number(amount) * 10 ** tokenInfo.decimals)
  );
  try {
    // Получаем байты транзакции в правильном формате
    let txBytes;
    if (typeof senderSignature.txBytes === 'string') {
      // Если строка Base64, декодируем ее в Uint8Array
      txBytes = fromB64(senderSignature.txBytes);
    } else if (senderSignature.txBytes instanceof Uint8Array) {
      // Если уже Uint8Array, используем как есть
      txBytes = senderSignature.txBytes;
    } else {
      // В случае другого формата, преобразуем объект в Uint8Array
      txBytes = new Uint8Array(Object.values(senderSignature.txBytes));
    }
    
    // Восстанавливаем transaction block из kind bytes
    const txb = Transaction.fromKind(txBytes);
    
    // Добавляем gas payment от спонсора
    const { data: gasCoins } = await client.getCoins({
      owner: sponsorAddress,
      coinType: '0x2::sui::SUI'
    });
    console.log('Sponsor SUI gas coins:', gasCoins);
    if (!gasCoins || gasCoins.length === 0) {
      throw new Error('No gas coins found in sponsor account');
    }
    
    txb.setGasPayment([{
      objectId: gasCoins[0].coinObjectId,
      version: gasCoins[0].version,
      digest: gasCoins[0].digest
    }]);
    txb.setGasOwner(sponsorAddress);
    
    // Строим финальные байты транзакции
    const finalTxBytes = await txb.build({ client });
    
    // Подписываем газ спонсором
    const sponsorSignatureResult = await sponsorKeypair.signTransaction(finalTxBytes);
    const sponsorSignature = sponsorSignatureResult.signature;
    
    // Отправляем транзакцию с подписями
    const result = await client.executeTransactionBlock({
      transactionBlock: finalTxBytes,
      signature: [signature, sponsorSignature],
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    
    return {
      success: true,
      transactionDigest: result.digest,
      result
    };
  } catch (error) {
    console.error('Error in sponsored transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
    const { data: coins } = await client.getCoins({
      owner: senderAddress,
      coinType: tokenInfo.coinType
    });
    const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    if (totalBalance < amountInSmallestUnits) {
      throw new Error(`Insufficient funds in sender's account`);
    }
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
    txb.setSender(senderAddress);
    // Важно: строим только transaction kind, без газа!
    const txBytes = await txb.build({ client, onlyTransactionKind: true });
    const transactionWrapper = {
      txBytes,
      toJSON: () => {
        return {
          txBytes: Buffer.from(txBytes).toString('base64')
        };
      }
    };
    return {
      success: true,
      txBytes,
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