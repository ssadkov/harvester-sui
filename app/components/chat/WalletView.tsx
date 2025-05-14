'use client';

import { useWallet } from '@suiet/wallet-kit';
import { Wallet } from 'lucide-react';

interface WalletViewProps {
  message: string;
}

export function WalletView({ message }: WalletViewProps) {
  const wallet = useWallet();

  if (!wallet.connected || !wallet.account) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <Wallet className="h-4 w-4" />
          <span>Кошелек не подключен</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Wallet className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{message}</span>
      </div>
      <div className="mt-2">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Адрес кошелька:</div>
        <div className="mt-1 font-mono text-sm bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
          {wallet.account.address}
        </div>
      </div>
    </div>
  );
} 