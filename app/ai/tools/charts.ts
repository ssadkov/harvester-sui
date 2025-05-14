import { jsonSchema } from 'ai';

interface PieChartToken {
  symbol: string;
  value: number;
}

export const showPieChartTool = {
  parameters: jsonSchema({
    type: 'object',
    properties: {
      tokens: {
        type: 'array',
        description: 'Список токенов с их значениями',
        items: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            value: { type: 'number' }
          },
          required: ['symbol', 'value']
        }
      }
    },
    required: ['tokens']
  }),
  async execute({ tokens }: { tokens: PieChartToken[] }) {
    return {
      type: 'showPieChart',
      tokens
    };
  }
}; 