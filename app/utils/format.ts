export function formatTokenBalance(balance: string, decimals: number): string {
  try {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.000001) return num.toExponential(2);
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    if (num < 100) return num.toFixed(2);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch (error) {
    console.error('Error formatting token balance:', error);
    return '0';
  }
}

export function formatUSDValue(value: string | number): string {
  try {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  } catch (error) {
    console.error('Error formatting USD value:', error);
    return '$0.00';
  }
} 