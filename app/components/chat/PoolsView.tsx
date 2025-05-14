interface Pool {
  name: string;
  protocol: string;
  tvl: number;
  apy: number;
  risk: 'low' | 'medium' | 'high';
  tokens: Record<string, number>;
}

interface PoolsViewProps {
  pools: Pool[];
}

export function PoolsView({ pools }: PoolsViewProps) {
  console.log('Rendering PoolsView with pools:', pools);

  if (!pools || pools.length === 0) {
    return <div>Нет доступных пулов</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {pools.map((pool) => (
        <div key={pool.name} className="border rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold">{pool.name}</h3>
            <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-800">
              {pool.protocol}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <div className="text-sm text-gray-500">TVL</div>
              <div className="font-medium">${(pool.tvl / 1000000).toFixed(2)}M</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">APY</div>
              <div className="font-medium text-green-600">{pool.apy}%</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-1">Распределение токенов</div>
            <div className="space-y-1">
              {Object.entries(pool.tokens).map(([symbol, percentage]) => (
                <div key={symbol} className="flex justify-between items-center">
                  <span className="text-sm">{symbol}</span>
                  <span className="text-sm font-medium">{percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">Риск</div>
            <span className={`text-sm px-2 py-1 rounded ${
              pool.risk === 'low' ? 'bg-green-100 text-green-800' :
              pool.risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {pool.risk === 'low' ? 'Низкий' :
               pool.risk === 'medium' ? 'Средний' : 'Высокий'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
} 