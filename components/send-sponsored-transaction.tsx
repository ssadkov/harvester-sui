"use client";

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  TOKENS, 
  prepareTransactionForSigning, 
  sendSponsoredTransaction 
} from '@/utils/sponsored-transactions';
import { SendIcon } from 'lucide-react';

export function SendSponsoredTransaction() {
  const wallet = useWallet();
  const [amount, setAmount] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('SUI');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txResult, setTxResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimal point
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(value);
  };

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipientAddress(e.target.value);
  };

  const handleTokenChange = (value: string) => {
    setTokenSymbol(value);
  };

  const handleSendTransaction = async () => {
    if (!wallet.connected || !wallet.account) {
      setError('Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!recipientAddress || !recipientAddress.startsWith('0x')) {
      setError('Please enter a valid recipient address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxResult(null);

    try {
      // Prepare transaction for signing
      const prepResult = await prepareTransactionForSigning(
        amount,
        tokenSymbol,
        recipientAddress,
        wallet.account.address
      );

      if (!prepResult.success || !prepResult.txBytes) {
        throw new Error(prepResult.error || 'Failed to prepare transaction');
      }

      // Get signature from user's wallet
      const userSignature = await wallet.signTransaction({
        transaction: prepResult.txBytes,
      });

      if (!userSignature) {
        throw new Error('Failed to get signature from wallet');
      }

      // Send sponsored transaction
      const result = await sendSponsoredTransaction(
        amount,
        tokenSymbol,
        recipientAddress,
        wallet.account.address,
        userSignature.signature
      );

      setTxResult(result);

      if (result.success) {
        // Clear form after successful transaction
        setAmount('');
        setRecipientAddress('');
      } else {
        setError(result.error || 'An error occurred while sending the transaction');
      }
    } catch (err) {
      console.error('Error sending transaction:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-md">
      <h2 className="text-lg font-medium mb-4 text-zinc-900 dark:text-zinc-100">
        Send Tokens (Sponsored Transaction)
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Amount
          </label>
          <div className="flex space-x-2">
            <Input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.0"
              className="flex-grow"
            />
            <Select value={tokenSymbol} onValueChange={handleTokenChange}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Token" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TOKENS).map(([symbol, info]) => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Recipient Address
          </label>
          <Input
            type="text"
            value={recipientAddress}
            onChange={handleRecipientChange}
            placeholder="0x..."
          />
        </div>

        {error && (
          <div className="text-sm text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded">
            {error}
          </div>
        )}

        {txResult?.success && (
          <div className="text-sm text-green-500 p-2 bg-green-50 dark:bg-green-900/20 rounded">
            Transaction sent successfully!
            <div className="mt-1 text-xs break-all">
              ID: {txResult.transactionDigest}
            </div>
          </div>
        )}

        <Button
          onClick={handleSendTransaction}
          disabled={isLoading || !wallet.connected}
          className="w-full flex items-center justify-center gap-2"
        >
          {isLoading ? 'Sending...' : 'Send'}
          {!isLoading && <SendIcon className="h-4 w-4" />}
        </Button>
      </div>

      {wallet.connected ? (
        <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Wallet connected: {wallet.account?.address.substring(0, 6)}...{wallet.account?.address.substring(wallet.account.address.length - 4)}
        </div>
      ) : (
        <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Connect your wallet to send a transaction
        </div>
      )}
    </div>
  );
}