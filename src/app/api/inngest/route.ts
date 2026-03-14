import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { executeWorkflow } from "@/inngest/functions";

// Next.js API Routes に対してInngestのエンドポイントを公開
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
  ],
});
