import { tool } from 'ai';
import { z } from 'zod';

export const viewWalletTool = tool({
  description: 'Показать адрес подключенного кошелька',
  parameters: z.object({}),
  execute: async () => {
    return {
      type: 'ui',
      component: 'WalletView',
      props: {
        message: 'Информация о кошельке'
      }
    };
  }
}); 