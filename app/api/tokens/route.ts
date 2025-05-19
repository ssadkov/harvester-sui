import { NextResponse } from 'next/server';
import { fetchTokenBalances, calculateTotalPortfolioValue } from '@/app/actions/balance-actions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const address = searchParams.get('address');

    console.log('Token API request:', { symbol, address });

    if (!symbol || !address) {
      return NextResponse.json(
        { error: 'Missing required parameters: symbol and address' },
        { status: 400 }
      );
    }

    // Получаем балансы токенов
    console.log('Fetching token balances for address:', address);
    const tokenBalances = await fetchTokenBalances(address);
    console.log('Received token balances:', tokenBalances);

    // Ищем токен по символу среди всех токенов
    const token = Object.values(tokenBalances).find(t => t.symbol === symbol);
    console.log('Found token:', token);

    if (!token) {
      return NextResponse.json(
        { error: `Token ${symbol} not found in wallet` },
        { status: 404 }
      );
    }

    // Вычисляем общую стоимость портфеля
    const totalValue = await calculateTotalPortfolioValue(tokenBalances);
    const tokenValue = parseFloat(token.balance) * parseFloat(token.usdPrice || '0');
    const portfolioPercentage = totalValue > 0 ? (tokenValue / totalValue) * 100 : 0;

    const response = {
      token: {
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        decimals: token.decimals,
        usdPrice: token.usdPrice || '0',
        portfolioPercentage,
        iconUrl: token.iconUrl ?? undefined
      }
    };
    console.log('Sending response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in tokens API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 