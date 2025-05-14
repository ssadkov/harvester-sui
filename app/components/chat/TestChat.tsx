'use client';

import { useChat } from 'ai/react';
import { CameraView } from '@/components/camera-view';
import { HubView } from '@/components/hub-view';
import { UsageView } from '@/components/usage-view';
import { PoolsView } from './PoolsView';

export default function TestChat() {
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
        default:
          return <div>Неизвестный компонент: {result.component}</div>;
      }
    }
    return <div>{JSON.stringify(result)}</div>;
  };

  const renderToolState = (state: string, toolName: string) => {
    console.log('Tool state:', state, toolName);
    switch (state) {
      case 'partial-call':
        return (
          <div className="text-sm text-gray-500">
            Подготовка к вызову инструмента {toolName}...
          </div>
        );
      case 'call':
        return (
          <div className="text-sm text-gray-500">
            Выполняется {toolName}...
          </div>
        );
      case 'result':
        return null;
      default:
        return <div className="text-sm text-gray-500">Неизвестное состояние: {state}</div>;
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex-1">
        {messages.map(message => {
          console.log('Message:', message);
          return (
            <div key={message.id} className="mb-4">
              <div className="font-bold">{message.role}:</div>
              {message.content}
              {message.parts?.map((part, index) => {
                console.log('Message part:', part);
                if (part.type === 'tool-invocation') {
                  return (
                    <div key={index} className="mt-2">
                      {renderToolState(part.toolInvocation.state, part.toolInvocation.toolName)}
                      {part.toolInvocation.state === 'result' && (
                        <div className="mt-2">
                          {renderToolResult(part.toolInvocation.result)}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          );
        })}
      </div>
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