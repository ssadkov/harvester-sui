export interface ProcessedPool {
  pool_id: string | null;
  token1: string;
  token2: string | null;
  totalApr: number;
  reward1: string | null;
  reward2: string | null;
  reward1Apr: number | null;
  reward2Apr: number | null;
  protocol: string;
  type: string;
  tvl: number;
  volume_24: string;
  fees_24: string;
  tokens: string[];
} 