import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { executeWorkflow, scheduledWorkflowRunner } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
    scheduledWorkflowRunner,
  ],
});
// Force recompile Sun Mar 22 06:41:56 PDT 2026
