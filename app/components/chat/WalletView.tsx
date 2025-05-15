'use client';

import { useWallet } from '@suiet/wallet-kit';
import { Wallet, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WalletViewProps {
  message: string;
}

export function WalletView({ message }: WalletViewProps) {
  const wallet = useWallet();

  const copyToClipboard = async () => {
    if (wallet.account?.address) {
      await navigator.clipboard.writeText(wallet.account.address);
    }
  };

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

  const address = wallet.account.address;

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Wallet className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{message}</span>
      </div>
      <div className="mt-2">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Адрес кошелька:</div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 font-mono text-sm bg-zinc-100 dark:bg-zinc-800 p-2 rounded break-all">
            {address}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyToClipboard}
            className="h-8 w-8"
            title="Копировать адрес"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Это публичный адрес, на него вы можете получать средства на блокчейне SUI
        </div>
      </div>
    </div>
  );
} 