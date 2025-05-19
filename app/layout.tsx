import "./globals.css";
import { Metadata } from "next";
import { Toaster } from "sonner";
import { AI } from "./actions";
import { SuiWalletProvider } from "@/app/wallet-provider"; // путь зависит от твоей структуры
import { Analytics } from '@vercel/analytics/react';
import "@suiet/wallet-kit/style.css";

export const metadata: Metadata = {
  title: "SUI Harvester AI",
  description: "Yield farming AI aggregator for SUI",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome-512x512',
        url: '/android-chrome-512x512.png',
      },
    ],
  },
  manifest: '/site.webmanifest',
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
