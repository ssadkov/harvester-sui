import { tool } from 'ai';
import { z } from 'zod';

export const viewUsageTool = tool({
  description: "view current usage for electricity, water, or gas",
  parameters: z.object({
    type: z.enum(["electricity", "water", "gas"]),
  }),
  execute: async ({ type }) => {
    return {
      type: 'ui',
      component: 'UsageView',
      props: { type }
    };
  }
}); 