import { generateTextWithAI } from "@/lib/ai";
import { postToSNS } from "@/lib/sns";
import { prisma } from "@/lib/prisma";

export async function runWorkflow(workflowId: string, userId: string) {
  // ステップ0: 実行ログ (RUNNING) を作成
  const log = await prisma.executionLog.create({
    data: {
      workflowId,
      status: "RUNNING",
      details: { message: "実行開始" },
    },
  });
  const logId = log.id;

  try {
    // ステップ1: DBからワークフロー取得
    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

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
      generatedText = "";
    }

    const imageInputNode = nodes.find((n: any) => n.type === "imageInputNode");
    const imageUrl = imageInputNode?.data?.imageUrl || null;

    const videoInputNode = nodes.find((n: any) => n.type === "videoInputNode");
    const videoUrl = videoInputNode?.data?.videoUrl || null;

    const generatedContent = { text: generatedText, imageUrl, videoUrl };

    // ステップ3: SNSノードを特定して投稿
    const snsNodes = nodes.filter(
      (n: any) => n.type === "socialActionNode" || n.type === "socialAction" || n.type === "snsAction"
    );

    const postResult: any[] = [];
    if (snsNodes.length === 0) {
      postResult.push({ platform: "none", success: true, message: "SNSノードなし: コンテンツ生成のみ完了" });
    } else {
      for (const snsNode of snsNodes) {
        const platform = snsNode.data?.platform || "twitter";
        const snsPlatform = platform === "x" ? "twitter" : platform;

        if (!["twitter", "facebook", "instagram", "threads"].includes(snsPlatform)) {
          postResult.push({ platform: snsPlatform, success: false, error: `未対応のプラットフォーム: ${snsPlatform}` });
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
            userId,
            snsPlatform as "twitter" | "facebook" | "instagram" | "threads",
            generatedContent.text as string,
            mediaUrl,
            snsNode.data?.accountId,
            threadTexts
          );
          postResult.push({ ...result, platform: snsPlatform });
        } catch (snsErr: any) {
          postResult.push({ platform: snsPlatform, success: false, error: snsErr.message });
        }
      }
    }

    // ステップ4: 実行ログを SUCCESS / FAILED で更新
    const allSuccess = postResult.every((r: any) => r.success);
    const failedItems = postResult.filter((r: any) => !r.success);

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

    return { success: true, message: "Workflow completed", generatedText: generatedContent.text, result: postResult };

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
