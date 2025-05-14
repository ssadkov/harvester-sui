import { tool } from 'ai';
import { z } from 'zod';

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

export const viewHubTool = tool({
  description: "view the hub that contains current quick summary and actions for temperature, lights, and locks",
  parameters: z.object({}),
  execute: async () => {
    return {
      type: 'ui',
      component: 'HubView',
      props: { hub }
    };
  }
});

export const updateHubTool = tool({
  description: "update the hub with new values",
  parameters: z.object({
    hub: z.object({
      climate: z.object({
        low: z.number(),
        high: z.number(),
      }),
      lights: z.array(
        z.object({ name: z.string(), status: z.boolean() }),
      ),
      locks: z.array(
        z.object({ name: z.string(), isLocked: z.boolean() }),
      ),
    }),
  }),
  execute: async ({ hub: newHub }) => {
    hub = newHub;
    return {
      type: 'ui',
      component: 'HubView',
      props: { hub }
    };
  }
}); 