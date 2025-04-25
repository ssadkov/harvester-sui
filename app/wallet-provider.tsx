"use client";

import { ReactNode } from "react";
import { WalletProvider } from "@suiet/wallet-kit";

export function SuiWalletProvider({ children }: { children: ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
