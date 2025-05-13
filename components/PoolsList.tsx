import { ProcessedPool, formatApr, formatTvl } from '@/utils/poolUtils';
import Image from 'next/image';

interface PoolsListProps {
  pools: ProcessedPool[];
}

const protocolIcons: { [key: string]: string } = {
  bluefin: 'https://bluefin.io/images/square.png',
  navi: 'https://app.naviprotocol.io/favicon.png',
  momentum: 'https://app.mmt.finance/assets/images/momentum-logo-sq.svg',
  scallop: 'https://app.scallop.io/images/logo-192.png',
};

export function PoolsList({ pools }: PoolsListProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Токены</th>
            <th className="px-4 py-2 text-left">Протокол</th>
            <th className="px-4 py-2 text-left">Тип</th>
            <th className="px-4 py-2 text-right">APR</th>
            <th className="px-4 py-2 text-right">TVL</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((pool, index) => (
            <tr key={index} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">
                {pool.tokens.join(' / ')}
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  {protocolIcons[pool.protocol.toLowerCase()] && (
                    <Image
                      src={protocolIcons[pool.protocol.toLowerCase()]}
                      alt={pool.protocol}
                      width={20}
                      height={20}
                      className="rounded"
                    />
                  )}
                  <span className="capitalize">{pool.protocol}</span>
                </div>
              </td>
              <td className="px-4 py-2 capitalize">
                {pool.type}
              </td>
              <td className="px-4 py-2 text-right font-medium text-green-600">
                {formatApr(pool.totalApr)}
              </td>
              <td className="px-4 py-2 text-right">
                {formatTvl(pool.tvl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 