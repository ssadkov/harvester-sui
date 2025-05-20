import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { viewPoolsTool } from '@/app/tools/pool-tools';
import { viewWalletTool } from '@/app/tools/wallet-tools';
import { tokenTools } from '@/app/tools/token-tools';
import { Tool } from '@/app/types/tools';

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

const tools = [
  viewWalletTool,
  viewPoolsTool,
  ...tokenTools
];

export async function POST(req: Request) {
  try {
    const { messages, wallet } = await req.json();
    console.log('Received messages:', JSON.stringify(messages, null, 2));
    console.log('Received wallet:', JSON.stringify(wallet, null, 2));
    console.log('Wallet connected:', wallet?.connected);
    console.log('Wallet account:', wallet?.account);

    const systemMessage = {
      role: 'system',
      content: `You are a crypto finance assistant. You help users with their crypto portfolio and investments.
      You can use the following tools:
      - viewPools: to view liquidity pools
      - viewWallet: to view connected wallet address
      - analyze_token: to analyze a specific token in the user's wallet

      When showing pool information:
      1. First show the table with pools
      2. Then provide a brief summary of the top 3 pools by APR
      3. Format the summary as a numbered list
      4. For each pool show: pair name, APR, protocol
      5. Keep the description concise and focused on APR

      When analyzing a token:
      1. Show the token's balance and value
      2. Provide basic token information
      3. Keep the analysis focused on the user's holdings

      When user asks to "Show USD pools":
      1. Use viewPools tool with token parameter "usd"
      2. This will show all pools that contain USD or stablecoins
      3. Focus on showing stable pairs and lending pools

      Important: Always respond in the same language as the user's message. If the user writes in Russian, respond in Russian. If the user writes in English, respond in English.

      Current wallet context: ${JSON.stringify(wallet || null)}`
    };

    console.log('System message:', JSON.stringify(systemMessage, null, 2));

    const result = await streamText({
      model: openai('gpt-4'),
      messages: [systemMessage, ...messages],
      toolCallStreaming: true,
      maxSteps: 5,
      tools: {
        viewPools: viewPoolsTool,
        viewWallet: viewWalletTool,
        analyze_token: tokenTools[0]
      },
      experimental_repairToolCall: async (toolCall: { toolCall: { toolName: string; args: any; toolCallId: string } }) => {
        console.log('Tool call received:', JSON.stringify(toolCall, null, 2));
        if (toolCall.toolCall.toolName === 'analyze_token') {
          console.log('Executing analyze_token with wallet:', JSON.stringify(wallet, null, 2));
          const result = await tokenTools[0].execute(toolCall.toolCall.args, { 
            toolCallId: toolCall.toolCall.toolCallId, 
            messages: [{ 
              role: 'system', 
              content: `Current wallet context: ${JSON.stringify(wallet || null)}` 
            }] 
          });
          console.log('Tool execution result:', JSON.stringify(result, null, 2));
          return {
            toolCallType: 'function',
            toolCallId: toolCall.toolCall.toolCallId,
            toolName: 'analyze_token',
            args: toolCall.toolCall.args,
            result: result
          };
        }
        return null;
      }
    });

    console.log('Streaming response');
    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error('Stream error:', error);
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