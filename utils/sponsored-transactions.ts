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
  // Sui recommends using this method!
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
    
    // Get user's coins
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
    
    // Build transfer transaction
    txb.transferObjects(
      coins.map(coin => txb.object(coin.coinObjectId)),
      txb.pure.address(recipientAddress)
    );
    
    // Set sender
    txb.setSender(senderAddress);
    
    // Build only transaction kind, without gas
    const txBytes = await txb.build({ client, onlyTransactionKind: true });
    
    // Convert to Base64
    const txBase64 = toB64(txBytes);
    
    // Create a wrapper compatible with wallet-kit
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
    
    // More reliable signature handling
    let senderSignature;
    
    if (typeof senderSignatureData === 'string') {
      senderSignature = senderSignatureData;
    } else if (senderSignatureData && senderSignatureData.signature) {
      senderSignature = senderSignatureData.signature;
    } else if (senderSignatureData && typeof senderSignatureData === 'object') {
      // Try to extract signature from known wallet formats
      if (senderSignatureData.data) {
        senderSignature = senderSignatureData.data;
      } else if (senderSignatureData.bytes) {
        // Some wallets use bytes
        senderSignature = senderSignatureData.bytes;
      } else {
        console.error('Unknown signature format:', senderSignatureData);
        throw new Error('Unable to extract signature from provided data');
      }
    } else {
      throw new Error('Invalid signature format');
    }
    
    console.log('Extracted sender signature type:', typeof senderSignature);
    console.log('Extracted sender signature:', 
      typeof senderSignature === 'string' 
        ? `${senderSignature.substring(0, 30)}... (length: ${senderSignature.length})` 
        : 'Not a string');
    
    // Create transaction
    const txb = new Transaction();
    
    // Get seed phrase for sponsor
    const sponsorSeedPhrase = process.env.NEXT_PUBLIC_SPONSOR_SEED_PHRASE || 
                             process.env.SPONSOR_SEED_PHRASE;
    
    if (!sponsorSeedPhrase) {
      throw new Error('Sponsor seed phrase not found in environment variables');
    }
    
    // Create sponsor keypair
    const sponsorKeypair = createKeypairFromSeed(sponsorSeedPhrase);
    const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();
    console.log('Sponsor address:', sponsorAddress);
    
    // Initialize client
    const client = initSuiClient();
    
    // Convert amount
    const tokenInfo = TOKENS[tokenSymbol];
    const amountInSmallestUnits = BigInt(
      Math.round(Number(amount) * 10 ** tokenInfo.decimals)
    );
    
    console.log('Amount in smallest units:', amountInSmallestUnits.toString());
    
    // Get sender's coins
    const { data: senderCoins } = await client.getCoins({
      owner: senderAddress,
      coinType: tokenInfo.coinType
    });
    
    if (!senderCoins || senderCoins.length === 0) {
      throw new Error(`${tokenSymbol} coins not found on sender's account`);
    }
    
    console.log('Found sender coins:', senderCoins.length);
    
    // Check balance
    const totalBalance = senderCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    if (totalBalance < amountInSmallestUnits) {
      throw new Error(`Insufficient funds on sender's account`);
    }
    
    console.log('Total balance:', totalBalance.toString());
    
    // Get sponsor coins for gas
    const { data: sponsorCoins } = await client.getCoins({
      owner: sponsorAddress,
      coinType: '0x2::sui::SUI'
    });
    
    if (!sponsorCoins || sponsorCoins.length === 0) {
      throw new Error('Sponsor coins not found on sponsor account');
    }
    
    console.log('Found sponsor coins:', sponsorCoins.length);
    
    // Build transfer transaction
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
    
    // Set sender and gas
    txb.setSender(senderAddress);
    txb.setGasOwner(sponsorAddress);
    txb.setGasPayment([{
      objectId: sponsorCoins[0].coinObjectId,
      version: sponsorCoins[0].version,
      digest: sponsorCoins[0].digest
    }]);
    
    // Set explicit gas budget
    const txBytes = await txb.build({ 
      client
    });
    
    console.log('Transaction built successfully, bytes length:', txBytes.length);
    
    // Ensure correct sender signature format
    // This is likely where the DataView error occurs
    let finalSenderSignature;
    
    try {
      // Try to format signature correctly
      if (typeof senderSignature === 'string') {
        // Handle base64 signatures
        if (senderSignature.includes('==')) {
          try {
            // Check if it's base64 that needs to be decoded
            const decoded = fromB64(senderSignature);
            console.log('Successfully decoded base64 signature');
            finalSenderSignature = senderSignature; // Keep original if already correctly formatted
          } catch (e) {
            console.log('Not valid base64, using as is');
            finalSenderSignature = senderSignature;
          }
        } 
        // Handle hex signature
        else if (senderSignature.startsWith('0x')) {
          finalSenderSignature = senderSignature;
        } 
        // Add hex prefix if missing
        else {
          finalSenderSignature = `0x${senderSignature}`;
        }
      } else {
        throw new Error('Sender signature must be a string');
      }
      
      console.log('Final sender signature format:', 
        finalSenderSignature.substring(0, 30) + '... (length: ' + finalSenderSignature.length + ')');
      
    } catch (error) {
      console.error('Error processing sender signature:', error);
      throw new Error('Unable to process sender signature');
    }
    
    // Sponsor signs transaction
    const sponsorSignatureResult = await sponsorKeypair.signTransaction(txBytes);
    const sponsorSignature = sponsorSignatureResult.signature;
    
    console.log('Transaction signed by sponsor, signature length:', sponsorSignature.length);
    
    // Check sponsor signature format
    const finalSponsorSignature = sponsorSignature.startsWith('0x') 
      ? sponsorSignature 
      : `0x${sponsorSignature}`;
    
    console.log('Signature formats - Sender:', 
      finalSenderSignature.startsWith('0x') ? 'Hex (0x)' : 'Other',
      'Sponsor:', finalSponsorSignature.startsWith('0x') ? 'Hex (0x)' : 'Other');
    
    // Execute transaction with both signatures
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
      
      // Try alternative signature format - sometimes this can help
      if (error instanceof Error && 
          (error.message.includes('DataView') || error.message.includes('bounds'))) {
        console.log('Trying alternative signature format...');
        
        // Try to decode base64 if possible
        try {
          let altSenderSignature = finalSenderSignature;
          
          // If signature is base64, convert to binary array
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
          throw error; // Throw original error
        }
      }
      
      throw error; // Throw error further
    }
  } catch (error) {
    console.error('Error in sponsored transaction:', error);
    
    // Provide more detailed information about the error
    let errorMessage = 'Unknown error';
    let errorDetails = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        stack: error.stack,
      };
      
      // Special handling for DataView errors
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