export const tokenTool = {
  name: 'token',
  description: 'Analyze a specific token in the user\'s wallet',
  parameters: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'The symbol of the token to analyze (e.g., SUI, USDT, DEEP)'
      }
    },
    required: ['symbol']
  },
  handler: async ({ symbol }: { symbol: string }) => {
    // TODO: Implement token analysis logic
    return {
      type: 'ui',
      component: 'TokenView',
      props: {
        token: {
          symbol,
          name: symbol,
          balance: '0',
          decimals: 9,
          usdPrice: '0'
        }
      }
    };
  }
}; 