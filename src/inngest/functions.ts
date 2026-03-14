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

    // ステップ2: テキスト生成ノードを実行
    const generatedContent = await step.run("generate-ai-content", async () => {
      const nodes = (workflow.nodes as any[]);
      const textNode = nodes.find((n: any) => n.type === "textAi");
      const prompt = textNode?.data?.customPrompt || "最新のAIニュースを100文字でSNS向けに要約して";
      const model = textNode?.data?.model || "meta-llama/llama-3.3-70b-instruct:free";

      console.log(`[Workflow: ${workflowId}] テキスト生成中... モデル: ${model}`);
      const text = await generateTextWithAI(prompt, model);
      return { text, imageUrl: null };
    });

    // ステップ3: SNSノードを特定して投稿
    const postResult = await step.run("post-to-sns", async () => {
      const nodes = (workflow.nodes as any[]);
      // SNSノード（SocialActionNode）を探す
      const snsNode = nodes.find(
        (n: any) => n.type === "socialAction" || n.type === "snsAction"
      );
      const platform = snsNode?.data?.platform || "twitter";

      const result = await postToSNS(
        userId as string,
        platform as "twitter" | "facebook" | "instagram",
        generatedContent.text as string,
        generatedContent.imageUrl
      );
      console.log(`[UserId: ${userId}] SNS投稿結果:`, result);
      return result;
    });

    // ステップ4: 実行ログを保存
    await step.run("save-execution-log", async () => {
      await prisma.executionLog.create({
        data: {
          workflowId,
          status: postResult.success ? "SUCCESS" : "FAILED",
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
  // 毎分チェック（本番ではより細かい粒度で設定可）
  { cron: "* * * * *" },
  async ({ step }) => {
    // 実行すべきスケジュールワークフローを取得
    const now = new Date();

    const workflows = await step.run("get-scheduled-workflows", async () => {
      return prisma.workflow.findMany({
        where: {
          isScheduled: true,
          // nextRunAt が現在時刻以前のものを取得
          nextRunAt: {
            lte: now,
          },
        },
        select: {
          id: true,
          userId: true,
          schedule: true,
          nextRunAt: true,
        },
      });
    });

    if (workflows.length === 0) {
      return { message: "No scheduled workflows to run" };
    }

    // 各ワークフローのイベントをキューに送信
    await step.run("trigger-workflows", async () => {
      for (const wf of workflows) {
        // ワークフロー実行イベントを送信
        await inngest.send({
          name: "app/workflow.execute",
          data: { workflowId: wf.id, userId: wf.userId },
        });

        // 次回実行時刻を計算して更新
        let nextRunAt: Date | null = null;
        if (wf.schedule) {
          // cron表記の場合は次回を計算（簡易実装: 1日後）
          // 本番では cron-parser 等のライブラリを使う
          nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }

        await prisma.workflow.update({
          where: { id: wf.id },
          data: {
            nextRunAt,
          },
        });
      }

      return { triggeredCount: workflows.length };
    });

    return { message: `Triggered ${workflows.length} scheduled workflows` };
  }
);
