interface Pool {
  name: string;
  protocol: string;
  tvl: number;
  apy: number;
  risk: 'low' | 'medium' | 'high';
  tokens: Array<{
    symbol: string;
    percentage: number;
  }>;
}

interface PoolsViewProps {
  pools: Pool[];
}

export function PoolsView({ pools }: PoolsViewProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Доступные пулы</h3>
      <div className="grid gap-4">
        {pools.map((pool, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{pool.name}</h4>
                <p className="text-sm text-gray-500">{pool.protocol}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-600">{pool.apy.toFixed(2)}% APY</p>
                <p className="text-sm text-gray-500">TVL: ${pool.tvl.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-sm">
                <span className="font-medium">Токены:</span>{' '}
                {pool.tokens.map(t => `${t.symbol} (${t.percentage}%)`).join(' + ')}
              </p>
              <p className="text-sm">
                <span className="font-medium">Риск:</span>{' '}
                <span className={
                  pool.risk === 'low' ? 'text-green-600' :
                  pool.risk === 'medium' ? 'text-yellow-600' :
                  'text-red-600'
                }>
                  {pool.risk}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 