"use client";

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SendIcon } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';

export default function SendTransactionPage() {
  const wallet = useWallet();
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txResult, setTxResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimal point
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(value);
  };

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipientAddress(e.target.value);
  };

  const handleSendTransaction = async () => {
    if (!wallet.connected || !wallet.account) {
      setError('Пожалуйста, подключите кошелек');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Пожалуйста, введите корректную сумму');
      return;
    }

    if (!recipientAddress || !recipientAddress.startsWith('0x')) {
      setError('Пожалуйста, введите корректный адрес получателя');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxResult(null);

    try {
      // Создаем транзакцию
      const tx = new Transaction();
      
      // Конвертируем сумму в наименьшие единицы (Mist для SUI)
      const amountInMist = BigInt(Math.round(Number(amount) * 10 ** 9)); // 9 десятичных знаков для SUI
      
      // Используем tx.gas для создания и отправки монеты
      // tx.gas автоматически ссылается на монету, используемую для оплаты газа
      const [coin] = tx.splitCoins(
        tx.gas, 
        [tx.pure.u64(amountInMist)]
      );
      
      // Передаем созданную монету получателю
      tx.transferObjects(
        [coin], 
        tx.pure.address(recipientAddress)
      );

      // Подписываем и выполняем транзакцию
      const result = await wallet.signAndExecuteTransaction({
        transaction: tx
      });

      console.log('Transaction result:', result);
      setTxResult(result);
      
      // Очистка формы после успешной транзакции
      setAmount('');
      setRecipientAddress('');
    } catch (err) {
      console.error('Ошибка отправки транзакции:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Отправка токенов SUI</CardTitle>
          <CardDescription>
            Отправляйте токены на любой адрес
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Сумма SUI</Label>
            <Input
              id="amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">Адрес получателя</Label>
            <Input
              id="recipient"
              type="text"
              value={recipientAddress}
              onChange={handleRecipientChange}
              placeholder="0x..."
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded">
              {error}
            </div>
          )}

          {txResult && (
            <div className="text-sm text-green-500 p-2 bg-green-50 dark:bg-green-900/20 rounded">
              Транзакция успешно отправлена!
              <div className="mt-1 text-xs break-all">
                ID: {txResult.digest}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            onClick={handleSendTransaction}
            disabled={isLoading || !wallet.connected}
            className="w-full flex items-center justify-center gap-2"
          >
            {isLoading ? 'Отправка...' : 'Отправить SUI'}
            {!isLoading && <SendIcon className="h-4 w-4" />}
          </Button>

          {!wallet.connected ? (
            <div className="text-xs text-center text-zinc-500 dark:text-zinc-400">
              Подключите кошелек для отправки транзакции
            </div>
          ) : (
            <div className="text-xs text-center text-zinc-500 dark:text-zinc-400">
              Кошелек подключен: {wallet.account?.address.substring(0, 6)}...{wallet.account?.address.substring(wallet.account.address.length - 4)}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}