'use client';

import { useChat } from 'ai/react';
import { useWallet, ConnectButton } from '@suiet/wallet-kit';
import { CameraView } from '@/components/camera-view';
import { UsageView } from '@/components/usage-view';
import { PoolsView } from './PoolsView';
import { WalletView } from './WalletView';
import { Wallet, SendIcon, Menu, SendHorizonal } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

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

  const [showAssetPanel, setShowAssetPanel] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const renderToolResult = (result: any) => {
    console.log('Tool result:', result);
    if (typeof result === 'object' && result.type === 'ui') {
      switch (result.component) {
        case 'CameraView':
          return <CameraView {...result.props} />;
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
    <div className="flex min-h-screen w-full bg-white dark:bg-zinc-900">
      <h1 className="text-2xl font-bold mb-4 px-6 pt-6">Test Chat</h1>
      {/* Overlay для мобильного drawer */}
      {isMobileView && showAssetPanel && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setShowAssetPanel(false)}
        />
      )}

      {/* Asset panel - mobile drawer/fullscreen + desktop sidebar */}
      <AnimatePresence>
        {showAssetPanel && (
          <motion.div
            initial={{ x: isMobileView ? '-100%' : 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobileView ? '-100%' : 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={
              isMobileView
                ? "fixed top-0 left-0 w-full h-full z-50 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto"
                : "border-r border-zinc-200 dark:border-zinc-700 h-full bg-white dark:bg-zinc-800 z-10 overflow-y-auto"
            }
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="h-4 w-4 text-emerald-500" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Активы</h2>
              </div>
              
              {/* Wallet status */}
              <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                {wallet.connected && wallet.account ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {wallet.account.address.substring(0, 6)}...{wallet.account.address.substring(wallet.account.address.length - 4)}
                      </span>
                      <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs px-2 py-0.5 rounded-full">
                        Подключен
                      </span>
                    </div>
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

              {/* Placeholder для будущих компонентов */}
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Общий баланс</h3>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">$0.00</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex flex-col justify-between gap-4 flex-grow pb-20 relative">
        {/* Chat messages */}
        <div
          ref={messagesContainerRef}
          className="flex flex-col gap-3 w-full items-center px-4"
        >
          {messages.length === 0 && (
            <motion.div className="h-[350px] px-4 w-full md:w-[500px] md:px-0 pt-20">
              <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700 shadow-lg">
                <div className="flex flex-row justify-center items-center mb-2">
                  <Image
                    src="/android-chrome-512x512.png"
                    alt="SUI Harvester AI Logo"
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                </div>
                <p className="text-center text-zinc-900 dark:text-zinc-50 text-base leading-relaxed">
                  SUI Harvester AI - an intelligent assistant that analyzes and manages your liquidity in the SUI ecosystem. Connect your wallet and let our AI optimize your DeFi operations for maximum yield and efficient asset management.
                </p>
              </div>
            </motion.div>
          )}
          {messages.map(message => (
            <div key={message.id} className={`flex w-full md:max-w-[500px] ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
              }`}>
                {message.parts?.map((part, index) => {
                  switch (part.type) {
                    case 'text':
                      return <div key={index} className="text-sm">{part.text}</div>;
                    case 'tool-invocation':
                      return (
                        <div key={index} className="mt-2">
                          <div className="text-sm">
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
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        <div className="p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 relative items-center">
            <div className="flex w-full md:max-w-[500px] max-w-[calc(100dvw-32px)] shadow-lg">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Send a message..."
                className="flex-grow rounded-l-md bg-zinc-100 px-2 py-1.5 outline-none dark:bg-zinc-700 text-zinc-800 dark:text-zinc-300"
              />
              <Button
                type="submit"
                variant="default"
                size="icon"
                className="rounded-none border-r-0"
              >
                <SendHorizonal className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="default"
                size="icon"
                className="rounded-l-none"
                onClick={() => setShowAssetPanel(prev => !prev)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 