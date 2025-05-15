"use client";

import { PieChart, Pie, Tooltip, Legend } from "recharts";
import { formatUSDValue } from '@/app/utils/format';

interface ProtocolBalance {
  protocol: string;
  value: number;
  icon?: string;
}

interface ProtocolPieChartProps {
  protocolBalances: ProtocolBalance[];
}

export function ProtocolPieChart({ protocolBalances }: ProtocolPieChartProps) {
  // Фильтруем протоколы с нулевым балансом
  const activeProtocols = protocolBalances.filter(p => p.value > 0);
  
  // Цвета для секторов
  const protocolColors = {
    'Wallet': 'hsl(221.2, 83.2%, 53.3%)', // синий
    'Scallop': 'hsl(142.1, 76.2%, 36.3%)', // зеленый
    'Momentum': 'hsl(262.1, 83.3%, 57.8%)', // фиолетовый
    'Bluefin': 'hsl(32.1, 94.6%, 44.3%)', // оранжевый
  };

  const chartData = activeProtocols.map(protocol => ({
    name: protocol.protocol,
    value: protocol.value,
    fill: protocolColors[protocol.protocol as keyof typeof protocolColors] || 'hsl(0, 0%, 50%)',
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-2 shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatUSDValue(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Кастомный label для вывода названия и процента сбоку
  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 16;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return (
      <text x={x} y={y} fill="#444" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12">
        {name}: {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  return (
    <div className="flex justify-center items-center gap-20 max-h-[400px] min-w-[400px]">
      <PieChart width={400} height={400}>
        <Tooltip content={<CustomTooltip />} />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={140}
          paddingAngle={4}
          labelLine={false}
        />
        <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
      </PieChart>
    </div>
  );
} 