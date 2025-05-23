import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import Image from 'next/image';

interface SupplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenSymbol: string;
  apr: number;
  balance: number;
  tokenIcon: string;
  price?: number;
}

export function SupplyModal({ isOpen, onClose, tokenSymbol, apr, balance, tokenIcon, price = 0 }: SupplyModalProps) {
  const [amount, setAmount] = useState<string>('');

  const handlePercentageClick = (percentage: number) => {
    const calculatedAmount = (balance * percentage / 100).toFixed(6);
    setAmount(calculatedAmount);
  };

  // Функция для форматирования числа
  const formatNumber = (num: number) => {
    const isBTCorETH = tokenSymbol.toUpperCase().endsWith('BTC') || tokenSymbol.toUpperCase().endsWith('ETH');
    return num.toFixed(isBTCorETH ? 6 : 2);
  };

  // Функция для форматирования суммы в долларах
  const formatUSD = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  // Функция для расчета потенциального дохода в месяц
  const calculateMonthlyIncome = (amount: number, apr: number) => {
    return (amount * apr / 100) / 12;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {tokenIcon ? (
              <div className="w-6 h-6 relative rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <Image
                  src={tokenIcon}
                  alt={tokenSymbol}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <span className="text-xs font-medium text-zinc-500">
                  {tokenSymbol[0]}
                </span>
              </div>
            )}
            <DialogTitle>Supply {tokenSymbol}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">APR</span>
            <span className="text-sm font-medium text-green-600">{apr.toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Balance</span>
            <div className="text-right">
              <span className="text-sm font-medium">{formatNumber(balance)} {tokenSymbol}</span>
              {price > 0 && (
                <div className="text-xs text-zinc-500">{formatUSD(balance * price)}</div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1"
              />
              <span className="text-sm text-zinc-500">{tokenSymbol}</span>
            </div>
            {price > 0 && amount && (
              <div className="flex justify-between text-xs text-zinc-500">
                <div>{formatUSD(parseFloat(amount) * price)}</div>
                <div>
                  Potential income: {formatUSD(calculateMonthlyIncome(parseFloat(amount) * price, apr))} per month
                </div>
              </div>
            )}
            <div className="flex justify-between space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handlePercentageClick(25)}
              >
                25%
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handlePercentageClick(50)}
              >
                50%
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handlePercentageClick(75)}
              >
                75%
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handlePercentageClick(100)}
              >
                MAX
              </Button>
            </div>
          </div>
          <Button 
            className="w-full"
            onClick={() => {
              // TODO: Implement deposit
              console.log('Deposit amount:', amount);
              onClose();
            }}
          >
            Supply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 