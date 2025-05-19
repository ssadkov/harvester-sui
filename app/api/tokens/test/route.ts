import { NextResponse } from 'next/server';

// Моковые данные для тестирования
const mockTokens = {
  SUI: {
    symbol: 'SUI',
    name: 'SUI',
    balance: '1000.00',
    decimals: 9,
    usdPrice: '1.25',
    portfolioPercentage: 25.5,
    iconUrl: 'https://raw.githubusercontent.com/sui-foundation/sui-foundation/main/sui-logo.png'
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether',
    balance: '5000.00',
    decimals: 6,
    usdPrice: '1.00',
    portfolioPercentage: 50.0,
    iconUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    balance: '2500.00',
    decimals: 6,
    usdPrice: '1.00',
    portfolioPercentage: 25.0,
    iconUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const address = searchParams.get('address');

    if (!symbol || !address) {
      return NextResponse.json(
        { error: 'Missing required parameters: symbol and address' },
        { status: 400 }
      );
    }

    const token = mockTokens[symbol as keyof typeof mockTokens];

    if (!token) {
      return NextResponse.json(
        { error: `Token ${symbol} not found in wallet` },
        { status: 404 }
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error in test tokens API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 