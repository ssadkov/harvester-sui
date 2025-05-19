import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { viewPoolsTool } from '@/app/tools/pool-tools';
import { viewWalletTool } from '@/app/tools/wallet-tools';

// Разрешаем стриминг ответов до 30 секунд
const maxDuration = 30;

// Моковые данные для пулов
const mockPools = [
  {
    name: "SUI-ETH LP",
    protocol: "Cetus",
    tvl: 1500000,
    apy: 12.5,
    risk: "low",
    tokens: [
      { symbol: "SUI", percentage: 50 },
      { symbol: "ETH", percentage: 50 }
    ]
  },
  {
    name: "BTC-USDC LP",
    protocol: "DeepBook",
    tvl: 2500000,
    apy: 8.2,
    risk: "medium",
    tokens: [
      { symbol: "BTC", percentage: 50 },
      { symbol: "USDC", percentage: 50 }
    ]
  }
];

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    console.log('Received messages:', messages);

    const result = await streamText({
      model: openai('gpt-4'),
      messages,
      toolCallStreaming: true,
      maxSteps: 5,
      system: `You are a crypto finance assistant. You help users with their crypto portfolio and investments.
      You can use the following tools:
      - viewPools: to view liquidity pools
      - viewWallet: to view connected wallet address

      When showing pool information:
      1. First show the table with pools
      2. Then provide a brief summary of the top 3 pools by APR
      3. Format the summary as a numbered list
      4. For each pool show: pair name, APR, protocol
      5. Keep the description concise and focused on APR

      Important: Always respond in the same language as the user's message. If the user writes in Russian, respond in Russian. If the user writes in English, respond in English.`,
      tools: {
        viewPools: viewPoolsTool,
        viewWallet: viewWalletTool,
      },
    });

    console.log('Streaming response');
    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        if (error instanceof Error) return error.message;
        return 'An error occurred';
      }
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 