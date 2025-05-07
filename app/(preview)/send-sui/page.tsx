"use client";

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { 
  prepareTransactionForSigning,
  sendSponsoredTransaction 
} from '@/utils/sponsored-transactions';

export default function SendTransactionPage() {
  const wallet = useWallet();
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [useSponsorship, setUseSponsorship] = useState(false);
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
      // Используем разные подходы в зависимости от выбора спонсирования
      if (useSponsorship) {
        // Спонсорская транзакция
        console.log('Отправляем спонсорскую транзакцию...');
        
        // Подготавливаем транзакцию для подписи
        const prepResult = await prepareTransactionForSigning(
          amount,
          'SUI',
          recipientAddress,
          wallet.account.address
        );

        if (!prepResult.success || !prepResult.transaction) {
          throw new Error(prepResult.error || 'Не удалось подготовить транзакцию');
        }

        // Запрашиваем подпись от кошелька пользователя
        // При подготовке спонсорской транзакции
        const userSignature = await wallet.signTransaction({
            transaction: {
            toJSON: async () => {
                // Если prepResult.transaction уже имеет txBytes
                if (prepResult.transaction.txBytes) {
                // Возвращаем Base64 строку из байтов транзакции
                return Promise.resolve(Buffer.from(prepResult.transaction.txBytes).toString('base64'));
                } else if (prepResult.txBytes) {
                // Используем txBytes напрямую, если transaction.txBytes не доступен
                return Promise.resolve(Buffer.from(prepResult.txBytes).toString('base64'));
                }
                // Если ничего не доступно, возвращаем ошибку
                return Promise.reject(new Error('Транзакция не содержит данных'));
            }
            }
        });

        if (!userSignature) {
          throw new Error('Не удалось получить подпись от кошелька');
        }

        // Отправляем спонсорскую транзакцию
        const result = await sendSponsoredTransaction(
          amount,
          'SUI',
          recipientAddress,
          wallet.account.address,
          userSignature.signature
        );

        if (!result.success) {
          throw new Error(result.error || 'Ошибка при отправке спонсорской транзакции');
        }

        setTxResult(result);
      } else {
        // Обычная транзакция
        console.log('Отправляем обычную транзакцию...');
        
        // Создаем транзакцию
        const tx = new Transaction();
        
        // Конвертируем сумму в наименьшие единицы (Mist для SUI)
        const amountInMist = BigInt(Math.round(Number(amount) * 10 ** 9)); // 9 десятичных знаков для SUI
        
        // Используем tx.gas для создания и отправки монеты
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
      }
      
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

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="useSponsorship" 
              checked={useSponsorship}
              onCheckedChange={(checked) => setUseSponsorship(checked === true)}
            />
            <Label 
              htmlFor="useSponsorship" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Использовать спонсора (бесплатная отправка)
            </Label>
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
            {isLoading ? 'Отправка...' : useSponsorship ? 'Отправить бесплатно' : 'Отправить SUI'}
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