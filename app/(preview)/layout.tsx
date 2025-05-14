import "./globals.css";
import { Metadata } from "next";
import { Toaster } from "sonner";
import { AI } from "./actions";
import { SuiWalletProvider } from "@/app/wallet-provider"; // путь зависит от твоей структуры
import { Analytics } from '@vercel/analytics/react';
import "@suiet/wallet-kit/style.css";



export const metadata: Metadata = {
  metadataBase: new URL("https://ai-sdk-preview-rsc-genui.vercel.dev"),
  title: "SUI Harvester AI",
  description: "Yield farming AI aggregator for SUI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-center" richColors />
        <SuiWalletProvider>
          <AI>{children}</AI>
        </SuiWalletProvider>
        <Analytics />
      </body>
    </html>
  );
}
