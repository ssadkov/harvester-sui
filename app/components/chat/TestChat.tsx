'use client';

import { useChat } from 'ai/react';
import { useWallet, ConnectButton } from '@suiet/wallet-kit';
import { CameraView } from '@/components/camera-view';
import { HubView } from '@/components/hub-view';
import { UsageView } from '@/components/usage-view';
import { PoolsView } from './PoolsView';
import { WalletView } from './WalletView';
import { Wallet } from 'lucide-react';

export default function TestChat() {
  const wallet = useWallet();
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    onFinish: (message) => {
      console.log('Chat finished:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  const renderToolResult = (result: any) => {
    console.log('Tool result:', result);
    if (typeof result === 'object' && result.type === 'ui') {
      switch (result.component) {
        case 'CameraView':
          return <CameraView {...result.props} />;
        case 'HubView':
          return <HubView {...result.props} />;
        case 'UsageView':
          return <UsageView {...result.props} />;
        case 'PoolsView':
          return <PoolsView {...result.props} />;
        case 'WalletView':
          return <WalletView {...result.props} />;
        default:
          return <div>Неизвестный компонент: {result.component}</div>;
      }
    }
    return <div>{JSON.stringify(result)}</div>;
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Wallet status */}
      <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
        <Wallet className="h-4 w-4 text-emerald-500" />
        {wallet.connected && wallet.account ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {wallet.account.address.substring(0, 6)}...{wallet.account.address.substring(wallet.account.address.length - 4)}
            </span>
            <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs px-2 py-0.5 rounded-full">
              Подключен
            </span>
            <button
              onClick={() => wallet.disconnect()}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Отключить
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Подключите кошелек</span>
            <ConnectButton label="Подключить" />
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1">
        {messages.map(message => {
          console.log('Message:', message);
          return (
            <div key={message.id} className="mb-4">
              <div className="font-bold">{message.role}:</div>
              {message.parts?.map((part, index) => {
                console.log('Message part:', part);
                switch (part.type) {
                  case 'text':
                    return <div key={index}>{part.text}</div>;
                  case 'tool-invocation':
                    return (
                      <div key={index} className="mt-2">
                        <div className="text-sm text-gray-500">
                          {part.toolInvocation.state === 'partial-call' && 
                            `Подготовка к вызову инструмента ${part.toolInvocation.toolName}...`}
                          {part.toolInvocation.state === 'call' && 
                            `Выполняется ${part.toolInvocation.toolName}...`}
                          {part.toolInvocation.state === 'result' && 
                            renderToolResult(part.toolInvocation.result)}
                        </div>
                      </div>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          );
        })}
      </div>

      {/* Chat input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Введите сообщение..."
          className="flex-1 p-2 border rounded"
        />
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
          Отправить
        </button>
      </form>
    </div>
  );
} 