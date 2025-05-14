import { tool } from 'ai';
import { z } from 'zod';

export const viewCamerasTool = tool({
  description: "view current active cameras",
  parameters: z.object({}),
  execute: async () => {
    return {
      type: 'ui',
      component: 'CameraView',
      props: {}
    };
  }
}); 