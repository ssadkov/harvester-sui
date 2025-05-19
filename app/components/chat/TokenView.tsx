import React from 'react';
import { formatTokenBalance, formatUSDValue } from '@/app/utils/format';

interface TokenData {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  usdPrice: string;
  portfolioPercentage?: number;
  iconUrl?: string;
}

interface TokenViewProps {
  message: string;
  token: TokenData | null;
}

export function TokenView({ message, token }: TokenViewProps) {
  if (!token) {
    return <div className="text-sm text-zinc-500">{message}</div>;
  }

  const balance = formatTokenBalance(token.balance, token.decimals);
  const value = formatUSDValue(token.usdPrice);
  const percentage = token.portfolioPercentage ? `${token.portfolioPercentage.toFixed(2)}%` : 'N/A';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {token.iconUrl ? (
          <img src={token.iconUrl} alt={token.symbol} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <span className="text-sm font-medium text-zinc-500">{token.symbol[0]}</span>
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{token.symbol}</h3>
          <p className="text-sm text-zinc-500">{token.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-zinc-500">Balance</p>
          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {balance} {token.symbol}
          </p>
          <p className="text-sm text-zinc-500">{value}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-zinc-500">Portfolio Share</p>
          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{percentage}</p>
        </div>
      </div>
    </div>
  );
} 