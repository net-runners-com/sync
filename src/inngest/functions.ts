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

    // ステップ0: 実行ログ (RUNNING) を先に作成
    const logId = await step.run("create-running-log", async () => {
      const log = await prisma.executionLog.create({
        data: {
          workflowId,
          status: "RUNNING",
          details: { message: "実行開始" },
        },
      });
      return log.id;
    });

    try {
      // ステップ1: DBからワークフロー取得
      const workflow = await step.run("get-workflow-config", async () => {
        const wf = await prisma.workflow.findUnique({ where: { id: workflowId } });
        if (!wf) throw new Error(`Workflow ${workflowId} not found`);
        return wf;
      });

      const nodesRaw = (workflow.nodes as any[]) || [];
      const edges = (workflow.edges as any[]) || [];

      // 接続されているノードIDのみを実行対象にする
      const connectedNodeIds = new Set<string>();
      edges.forEach((edge: any) => {
        if (edge.source) connectedNodeIds.add(edge.source);
        if (edge.target) connectedNodeIds.add(edge.target);
      });
      const nodes = nodesRaw.filter((node: any) => connectedNodeIds.has(node.id) || nodesRaw.length === 1);

      // ステップ2: テキスト・画像・動画の取得とAI生成
      const generatedContent = await step.run("generate-ai-content", async () => {
        const textInputNode = nodes.find((n: any) => n.type === "textInputNode");
        const textAiNode = nodes.find((n: any) => n.type === "textAiNode" || n.type === "textAi");

        let generatedText: string | null = null;
        if (textInputNode?.data?.text) {
          generatedText = textInputNode.data.text;
        } else if (textAiNode) {
          const prompt = textAiNode.data?.customPrompt || "最新のAIニュースを100文字でSNS向けに要約して";
          const model = textAiNode.data?.model || "openai/gpt-4o-mini";
          console.log(`[Workflow: ${workflowId}] テキスト生成中... モデル: ${model}`);
          generatedText = await generateTextWithAI(prompt, model);
        } else {
          generatedText = "Syncワークフローからの自動投稿です。";
        }

        const imageInputNode = nodes.find((n: any) => n.type === "imageInputNode");
        const imageUrl = imageInputNode?.data?.imageUrl || null;

        const videoInputNode = nodes.find((n: any) => n.type === "videoInputNode");
        const videoUrl = videoInputNode?.data?.videoUrl || null;

        return { text: generatedText, imageUrl, videoUrl };
      });

      // ステップ3: SNSノードを特定して投稿
      const postResult = await step.run("post-to-sns", async () => {
        const snsNodes = nodes.filter(
          (n: any) => n.type === "socialActionNode" || n.type === "socialAction" || n.type === "snsAction"
        );

        const results: any[] = [];
        if (snsNodes.length === 0) {
          return [{ platform: "none", success: true, message: "SNSノードなし: コンテンツ生成のみ完了" }];
        }

        for (const snsNode of snsNodes) {
          const platform = snsNode.data?.platform || "twitter";
          const snsPlatform = platform === "x" ? "twitter" : platform;

          if (!["twitter", "facebook", "instagram", "threads"].includes(snsPlatform)) {
            results.push({ platform: snsPlatform, success: false, error: `未対応のプラットフォーム: ${snsPlatform}` });
            continue;
          }

          // ツリー投稿かどうか
          const threadTexts = snsNode.data?.postType === "thread" && snsNode.data?.threadTexts?.length > 0
            ? snsNode.data.threadTexts as string[]
            : undefined;

          // メディアURL: ノードの手動入力 or 画像/動画ノードのURL
          const mediaUrl = snsNode.data?.mediaUrl || generatedContent.imageUrl || generatedContent.videoUrl || null;

          try {
            const result = await postToSNS(
              userId as string,
              snsPlatform as "twitter" | "facebook" | "instagram" | "threads",
              generatedContent.text as string,
              mediaUrl,
              snsNode.data?.accountId,
              threadTexts
            );
            results.push({ ...result, platform: snsPlatform });
          } catch (snsErr: any) {
            results.push({ platform: snsPlatform, success: false, error: snsErr.message });
          }
        }
        return results;
      });

      // ステップ4: 実行ログを SUCCESS / FAILED で更新
      await step.run("update-execution-log", async () => {
        const allSuccess = Array.isArray(postResult) ? postResult.every((r: any) => r.success) : (postResult as any).success;
        const failedItems = Array.isArray(postResult) ? postResult.filter((r: any) => !r.success) : [];

        await prisma.executionLog.update({
          where: { id: logId },
          data: {
            status: allSuccess ? "SUCCESS" : "FAILED",
            finishedAt: new Date(),
            details: {
              generatedText: generatedContent.text,
              postResult,
              ...(failedItems.length > 0 ? {
                errorSummary: failedItems.map((f: any) => `${f.platform}: ${f.error}`).join(" / ")
              } : {}),
            },
          },
        });
      });

      return { message: "Workflow completed", generatedText: generatedContent.text, result: postResult };

    } catch (fatalErr: any) {
      // 予期せぬエラー: ログをFAILEDに更新
      await prisma.executionLog.update({
        where: { id: logId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          details: { error: fatalErr.message || "予期せぬエラーが発生しました" },
        },
      }).catch(() => {});
      throw fatalErr;
    }
  }
);

// =============================================
// スケジュール実行関数 (Cron / 定期実行)
// =============================================
export const scheduledWorkflowRunner = inngest.createFunction(
  { id: "scheduled-workflow-runner" },
  { event: "app/workflow.scheduled" }, // 毎分チェック(後でcronに戻す場合は要検証)
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
