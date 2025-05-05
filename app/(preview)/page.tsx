"use client";

import { ReactNode, useRef, useState } from "react";
import { useActions } from "ai/rsc";
import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { motion, AnimatePresence } from "framer-motion";
import { MasonryIcon, VercelIcon } from "@/components/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SendHorizonal, Menu, DollarSign } from "lucide-react";
import { ConnectButton, useWallet } from '@suiet/wallet-kit';
import { fetchScallopBalance } from "@/app/actions/balance-actions";
import ReactMarkdown from 'react-markdown';


export default function Home() {
  const { sendMessage } = useActions();
  const wallet = useWallet();

  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Array<ReactNode>>([]);
  const [showActionButtons, setShowActionButtons] = useState(false);
  const [balanceData, setBalanceData] = useState<{
    formatted: string;
    raw: any;
  } | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  // Обновляем предлагаемые действия, добавив опцию проверки баланса Scallop
  const suggestedActions = [
    { title: "Check", label: "Scallop Balance", action: "check-scallop-balance" },
    { title: "Show me", label: "my smart home hub", action: "Show me my smart home hub" },
    {
      title: "How much",
      label: "electricity have I used this month?",
      action: "Show electricity usage",
    },
    {
      title: "How much",
      label: "water have I used this month?",
      action: "Show water usage",
    },
  ];

  // Функция для отправки баланса Scallop в чат
  const sendScallopBalanceToChat = async () => {
    if (!wallet.connected || !wallet.account) {
      alert("Please connect your wallet first");
      return;
    }

    setIsLoadingBalance(true);

    // Добавляем сообщение пользователя
    setMessages((messages) => [
      ...messages,
      <Message key={messages.length} role="user" content="Check my Scallop balance" />,
    ]);

    try {
      const userAddress = wallet.account.address;
      
      // Создаем временное сообщение о загрузке
      setMessages((messages) => [
        ...messages,
        <Message key={messages.length} role="assistant" content="Fetching your Scallop balance..." />,
      ]);

      // Получаем данные баланса
      const balanceData = await fetchScallopBalance(userAddress);
      
      // Удаляем временное сообщение о загрузке (последнее сообщение)
      setMessages((messages) => messages.slice(0, -1));

      // Добавляем форматированный ответ
      setMessages((messages) => [
        ...messages,
        <Message 
          key={messages.length} 
          role="assistant" 
          content={balanceData.formatted} 
        />,
      ]);
    } catch (error) {
      console.error("Error fetching balance:", error);
      
      // Удаляем временное сообщение о загрузке (последнее сообщение)
      setMessages((messages) => messages.slice(0, -1));
      
      // Добавляем сообщение об ошибке
      setMessages((messages) => [
        ...messages,
        <Message 
          key={messages.length} 
          role="assistant" 
          content={`Sorry, I couldn't fetch your Scallop balance. Error: ${error instanceof Error ? error.message : "Unknown error"}`} 
        />,
      ]);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Функция для выполнения действия и скрытия кнопок
  const handleActionClick = async (action: string) => {
    setShowActionButtons(false);
    
    // Обработка специального действия для проверки баланса Scallop
    if (action === "check-scallop-balance") {
      await sendScallopBalanceToChat();
      return;
    }
    
    setMessages((messages) => [
      ...messages,
      <Message key={messages.length} role="user" content={action} />,
    ]);
    const response: ReactNode = await sendMessage(action);
    setMessages((messages) => [...messages, response]);
  };

  // Функция для переключения видимости меню действий
  const toggleActionButtons = () => {
    setShowActionButtons(!showActionButtons);
  };

  // Функция для запроса баланса пользователя через server action
  const checkUserBalance = async () => {
    if (!wallet.connected || !wallet.account) {
      alert("Please connect your wallet first");
      return;
    }

    setIsLoadingBalance(true);
    setBalanceData(null);

    try {
      const userAddress = wallet.account.address;
      // Используем server action для запроса баланса
      const data = await fetchScallopBalance(userAddress);
      setBalanceData(data);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalanceData({
        formatted: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
        raw: { error: error instanceof Error ? error.message : "Unknown error occurred" }
      });
    } finally {
      setIsLoadingBalance(false);
    }
  };

  return (
    <div className="flex flex-row justify-center pb-20 h-dvh bg-white dark:bg-zinc-900">
      {/* Верхняя правая область с кнопками */}
      <div className="fixed top-4 right-4 z-10 flex flex-col gap-2">
        <ConnectButton />
        
        {/* Кнопка проверки баланса */}
        <Button 
          onClick={checkUserBalance}
          variant="outline"
          disabled={isLoadingBalance || !wallet.connected}
          className="flex items-center gap-2 bg-white dark:bg-zinc-800 shadow-md"
        >
          {isLoadingBalance ? 'Loading...' : 'Check Scallop Balance'}
          <DollarSign className="h-4 w-4" />
        </Button>
        
        {/* Отображение данных о балансе */}
        {balanceData && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 shadow-lg mt-2 max-w-xs text-sm overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Scallop Portfolio</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowRawData(!showRawData)}
                className="text-xs h-6 px-2"
              >
                {showRawData ? 'Show Summary' : 'Show Raw'}
              </Button>
            </div>
            
            {showRawData ? (
              <pre className="whitespace-pre-wrap overflow-x-auto text-xs text-zinc-700 dark:text-zinc-300">
                {JSON.stringify(balanceData.raw, null, 2)}
              </pre>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {balanceData.formatted}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between gap-4">
        <div
          ref={messagesContainerRef}
          className="flex flex-col gap-3 h-full w-dvw items-center overflow-y-scroll"
        >
          {messages.length === 0 && (
            <motion.div className="h-[350px] px-4 w-full md:w-[500px] md:px-0 pt-20">
              <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700 shadow-lg">
                <p className="flex flex-row justify-center gap-4 items-center text-zinc-900 dark:text-zinc-50">
                  <VercelIcon size={16} />
                  <span>+</span>
                  <MasonryIcon />
                </p>
                <p>
                SUI Harvester AI - an intelligent assistant that analyzes and manages your liquidity in the SUI ecosystem. Connect your wallet and let our AI optimize your DeFi operations for maximum yield and efficient asset management.
                </p>
              </div>
            </motion.div>
          )}
          {messages.map((message) => message)}
          <div ref={messagesEndRef} />
        </div>

        {/* Центральные кнопки действий, показываются только когда showActionButtons=true */}
        <AnimatePresence>
          {showActionButtons && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 flex items-center justify-center z-20"
              style={{ pointerEvents: 'none' }}
            >
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 grid grid-cols-2 gap-4"
                   style={{ pointerEvents: 'auto' }}>
                {suggestedActions.map((action, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    onClick={() => handleActionClick(action.action)}
                    className="text-left border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-300 rounded-lg p-4 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex flex-col"
                  >
                    <span className="font-medium">{action.title}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid sm:grid-cols-2 gap-2 w-full px-4 md:px-0 mx-auto md:max-w-[500px] mb-4">
          {messages.length === 0 &&
            suggestedActions.map((action, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.01 * index }}
                key={index}
                className={index > 1 ? "hidden sm:block" : "block"}
              >
                <button
                  onClick={async () => {
                    // Обработка специального действия для проверки баланса
                    if (action.action === "check-scallop-balance") {
                      await sendScallopBalanceToChat();
                      return;
                    }
                    
                    setMessages((messages) => [
                      ...messages,
                      <Message
                        key={messages.length}
                        role="user"
                        content={action.action}
                      />,
                    ]);
                    const response: ReactNode = await sendMessage(
                      action.action,
                    );
                    setMessages((messages) => [...messages, response]);
                  }}
                  className="w-full text-left border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded-lg p-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex flex-col shadow-md"
                >
                  <span className="font-medium">{action.title}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {action.label}
                  </span>
                </button>
              </motion.div>
            ))}
        </div>

        <form
          className="flex flex-col gap-2 relative items-center"
          onSubmit={async (event) => {
            event.preventDefault();

            // Проверка на специальные команды для баланса Scallop
            if (input.toLowerCase().includes("scallop balance") || 
                input.toLowerCase().includes("check balance") ||
                input.toLowerCase().includes("my balance")) {
              await sendScallopBalanceToChat();
              setInput("");
              return;
            }

            setMessages((messages) => [
              ...messages,
              <Message key={messages.length} role="user" content={input} />,
            ]);
            setInput("");

            const response: ReactNode = await sendMessage(input);
            setMessages((messages) => [...messages, response]);
          }}
        >
          <div className="flex w-full md:max-w-[500px] max-w-[calc(100dvw-32px)] shadow-lg">
            <input
              ref={inputRef}
              className="flex-grow rounded-l-md bg-zinc-100 px-2 py-1.5 outline-none dark:bg-zinc-700 text-zinc-800 dark:text-zinc-300"
              placeholder="Send a message..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <Button
              type="submit"
              variant="default"
              size="icon"
              className="rounded-none border-r-0"
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
            
            {/* Кнопка меню теперь всегда видна */}
            <Button
              type="button"
              variant="default"
              size="icon"
              className="rounded-l-none"
              onClick={toggleActionButtons}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}