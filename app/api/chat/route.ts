import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { viewCamerasTool } from '@/app/tools/camera-tools';
import { viewHubTool, updateHubTool } from '@/app/tools/hub-tools';
import { viewUsageTool } from '@/app/tools/usage-tools';
import { viewPoolsTool } from '@/app/tools/pool-tools';
import { viewWalletTool } from '@/app/tools/wallet-tools';

// Разрешаем стриминг ответов до 30 секунд
const maxDuration = 30;

// Состояние хаба
let hub = {
  climate: {
    low: 23,
    high: 25,
  },
  lights: [
    { name: "patio", status: true },
    { name: "kitchen", status: false },
    { name: "garage", status: true },
  ],
  locks: [{ name: "back door", isLocked: true }],
};

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
      system: `Ты - ассистент по крипто финансам. Ты помогаешь пользователям с их крипто портфелем и инвестициями.
      Ты можешь использовать следующие инструменты:
      - viewCameras: для просмотра камер
      - viewHub: для просмотра состояния хаба
      - updateHub: для обновления состояния хаба
      - viewUsage: для просмотра использования ресурсов
      - viewPools: для просмотра пулов ликвидности
      - viewWallet: для просмотра адреса подключенного кошелька`,
      tools: {
        viewCameras: viewCamerasTool,
        viewHub: viewHubTool,
        updateHub: updateHubTool,
        viewUsage: viewUsageTool,
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