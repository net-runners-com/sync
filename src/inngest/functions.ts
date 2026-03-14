import { inngest } from "./client";
import { generateTextWithAI } from "@/lib/ai";
import { postToSNS } from "@/lib/sns";
import { prisma } from "@/lib/prisma";

export const executeWorkflow = inngest.createFunction(
  { id: "execute-workflow" },
  { event: "app/workflow.execute" },
  async ({ event, step }) => {
    const { workflowId, userId } = event.data;

    // ステップ1: DBからワークフロー取得
    const workflow = await step.run("get-workflow-config", async () => {
      const wf = await prisma.workflow.findUnique({ where: { id: workflowId } });
      if (!wf) throw new Error(`Workflow ${workflowId} not found`);
      return wf;
    });

    // ステップ2: テキスト生成ノードを実行
    const generatedContent = await step.run("generate-ai-content", async () => {
      // ノード一覧からTextAiNodeを探す
      const nodes = (workflow.nodes as any[]);
      const textNode = nodes.find((n: any) => n.type === "textAi");
      const prompt = textNode?.data?.customPrompt || "最新のAIニュースを100文字でSNS向けに要約して";
      const model = textNode?.data?.model || "meta-llama/llama-3.3-70b-instruct:free";

      console.log(`[Workflow: ${workflowId}] テキスト生成中... モデル: ${model}`);
      const text = await generateTextWithAI(prompt, model);
      return { text, imageUrl: null };
    });

    // ステップ3: SNS投稿（モック）
    const postResult = await step.run("post-to-sns", async () => {
      const result = await postToSNS(
        userId as string,
        "twitter",
        generatedContent.text as string,
        generatedContent.imageUrl
      );
      console.log(`[UserId: ${userId}] SNS投稿結果:`, result);
      return result;
    });

    return { message: "Workflow completed", generatedText: generatedContent.text, result: postResult };
  }
);

