import { inngest } from "./client";
import { generateTextWithAI } from "@/lib/ai";
import { postToSNS } from "@/lib/sns";
import { prisma } from "@/lib/prisma";

// =============================================
// ワークフロー実行関数 (イベントトリガー)
// =============================================
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

    const nodes = (workflow.nodes as any[]) || [];

    // ステップ2: テキスト・画像・動画の取得とAI生成
    const generatedContent = await step.run("generate-ai-content", async () => {
      // テキスト
      const textInputNode = nodes.find((n: any) => n.type === "textInputNode");
      const textAiNode = nodes.find((n: any) => n.type === "textAiNode" || n.type === "textAi");

      let generatedText: string | null = null;
      if (textInputNode?.data?.text) {
        generatedText = textInputNode.data.text;
      } else if (textAiNode) {
        const prompt = textAiNode.data?.customPrompt || "最新のAIニュースを100文字でSNS向けに要約して";
        const model = textAiNode.data?.model || "meta-llama/llama-3.3-70b-instruct:free";
        console.log(`[Workflow: ${workflowId}] テキスト生成中... モデル: ${model}`);
        generatedText = await generateTextWithAI(prompt, model);
      } else {
        generatedText = "Syncワークフローからの自動投稿です。";
      }

      // 画像・動画
      const imageInputNode = nodes.find((n: any) => n.type === "imageInputNode");
      const imageUrl = imageInputNode?.data?.imageUrl || null;

      const videoInputNode = nodes.find((n: any) => n.type === "videoInputNode");
      const videoUrl = videoInputNode?.data?.videoUrl || null;

      return { text: generatedText, imageUrl, videoUrl };
    });

    // ステップ3: SNSノードを特定して投稿
    const postResult = await step.run("post-to-sns", async () => {
      // SNSノード（SocialActionNodeなど）を探す
      const snsNodes = nodes.filter(
        (n: any) => n.type === "socialActionNode" || n.type === "socialAction" || n.type === "snsAction"
      );
      
      const results = [];
      if (snsNodes.length === 0) {
        return { success: true, message: "SNSノードなし: コンテンツ生成のみ完了", generatedContent };
      }

      for (const snsNode of snsNodes) {
        const platform = snsNode.data?.platform || "twitter";
        const snsPlatform = platform === "x" ? "twitter" : platform;

        if (!snsPlatform || !["twitter", "facebook", "instagram"].includes(snsPlatform)) {
          results.push({ platform: snsPlatform, success: false, error: "未対応のプラットフォーム" });
          continue;
        }

        const result = await postToSNS(
          userId as string,
          snsPlatform as "twitter" | "facebook" | "instagram",
          generatedContent.text as string,
          generatedContent.imageUrl
          // todo: Video upload if needed by postToSNS in the future
        );
        results.push(result);
      }
      return results;
    });

    // ステップ4: 実行ログを保存
    await step.run("save-execution-log", async () => {
      const isArray = Array.isArray(postResult);
      const allSuccess = isArray ? postResult.every((r: any) => r.success) : postResult.success;

      await prisma.executionLog.create({
        data: {
          workflowId,
          status: allSuccess ? "SUCCESS" : "FAILED",
          finishedAt: new Date(),
          details: {
            generatedText: generatedContent.text,
            postResult,
          },
        },
      });
    });

    return { message: "Workflow completed", generatedText: generatedContent.text, result: postResult };
  }
);

// =============================================
// スケジュール実行関数 (Cron / 定期実行)
// =============================================
export const scheduledWorkflowRunner = inngest.createFunction(
  { id: "scheduled-workflow-runner" },
  { cron: "* * * * *" }, // 毎分チェック
  async ({ step }) => {
    const now = new Date();

    const workflows = await step.run("get-scheduled-workflows", async () => {
      return prisma.workflow.findMany({
        where: {
          isScheduled: true,
          nextRunAt: { lte: now },
        },
        select: { id: true, userId: true, schedule: true, nextRunAt: true },
      });
    });

    if (workflows.length === 0) {
      return { message: "No scheduled workflows to run" };
    }

    await step.run("trigger-workflows", async () => {
      for (const wf of workflows) {
        await inngest.send({
          name: "app/workflow.execute",
          data: { workflowId: wf.id, userId: wf.userId },
        });

        let nextRunAt: Date | null = null;
        if (wf.schedule) {
          nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 簡易実装: 1日後
        }

        await prisma.workflow.update({
          where: { id: wf.id },
          data: { nextRunAt },
        });
      }

      return { triggeredCount: workflows.length };
    });

    return { message: `Triggered ${workflows.length} scheduled workflows` };
  }
);
