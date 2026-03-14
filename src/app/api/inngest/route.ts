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
