import { z } from 'zod';

interface WalletAccount {
  address: string;
}

interface Wallet {
  account?: WalletAccount;
}

export interface Tool<TParams = any, TResult = any> {
  name: string;
  description: string;
  parameters: z.ZodType<TParams>;
  handler: (params: TParams, context: { wallet: Wallet }) => Promise<TResult>;
}

export interface ToolExecutionOptions {
  wallet: Wallet;
} 