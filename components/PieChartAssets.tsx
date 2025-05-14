"use client";

import { PieChart, Pie, Tooltip } from "recharts";
import { formatTokenBalance, formatUSDValue } from '@/app/utils/format';

interface TokenBalance {
  symbol: string;
  balance: string;
  decimals: number;
  value: number;
}

interface PieChartAssetsProps {
  tokenBalances: TokenBalance[];
}

export function PieChartAssets({ tokenBalances }: PieChartAssetsProps) {
  // Считаем общую сумму
  const totalValue = tokenBalances.reduce((sum, t) => sum + t.value, 0);
  // Фильтруем токены >10%, остальные в 'Others'
  const mainTokens = tokenBalances.filter(t => t.value / totalValue > 0.1);
  const othersTokens = tokenBalances.filter(t => t.value / totalValue <= 0.1);
  const othersValue = othersTokens.reduce((sum, t) => sum + t.value, 0);
  // Sapphire цвета для секторов
  const sapphireColors = [
    'hsl(221.2, 83.2%, 53.3%)',
    'hsl(212, 95%, 68%)',
    'hsl(216, 92%, 60%)',
    'hsl(210, 98%, 78%)',
    'hsl(212, 97%, 87%)',
  ];
  const othersCount = othersTokens.length;
  const chartData = [
    ...mainTokens.map((token, index) => ({
      symbol: token.symbol,
      value: token.value,
      fill: sapphireColors[index % sapphireColors.length],
      decimals: token.decimals,
      balance: token.balance,
    })),
    ...(othersValue > 0
      ? [{ symbol: 'Others', value: othersValue, fill: sapphireColors[4], decimals: 0, balance: '0', othersCount }]
      : []),
  ];
  // Подписи с тикером и процентом
  const renderLabel = ({ symbol, percent }: any) => {
    if (percent < 0.05) return null;
    if (symbol === 'Others') return 'Others';
    return `${symbol}: ${(percent * 100).toFixed(0)}%`;
  };
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const t = payload[0].payload;
      if (t.symbol === 'Others') {
        return (
          <div className="bg-background border rounded-lg p-2 shadow-lg">
            <p className="text-sm font-medium">Others: {t.othersCount} tokens</p>
            <p className="text-sm text-muted-foreground">
              {formatUSDValue(t.value)}
            </p>
          </div>
        );
      }
      return (
        <div className="bg-background border rounded-lg p-2 shadow-lg">
          <p className="text-sm font-medium">{t.symbol}</p>
          <p className="text-sm text-muted-foreground">
            {formatUSDValue(t.value)}
          </p>
          <p className="text-xs text-zinc-500">
            {formatTokenBalance(t.balance, t.decimals)} {t.symbol}
          </p>
        </div>
      );
    }
    return null;
  };
  return (
    <div className="mx-auto aspect-square max-h-[400px] min-w-[400px]">
      <PieChart width={400} height={400}>
        <Tooltip content={<CustomTooltip />} />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="symbol"
          cx="50%"
          cy="50%"
          outerRadius={140}
          paddingAngle={4}
          label={renderLabel}
          labelLine={true}
        />
      </PieChart>
    </div>
  );
} 