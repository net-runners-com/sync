import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTextWithAI } from "@/lib/ai";
import { postToSNS } from "@/lib/sns";
// ワークフローを直接実行する（Inngest不要のシンプルモード）
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId } = await request.json();

    if (!workflowId) {
      return NextResponse.json({ error: "workflowId is required" }, { status: 400 });
    }

    // DBからワークフロー取得
    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const nodes = (workflow.nodes as any[]) || [];

    // テキスト入力ノードまたはAIノードからコンテンツを取得
    const textInputNode = nodes.find((n: any) => n.type === "textInputNode");
    const textAiNode = nodes.find((n: any) => n.type === "textAiNode");

    let generatedText: string | null = null;

    if (textInputNode?.data?.text) {
      // ユーザーが直接入力したテキストを使用
      generatedText = textInputNode.data.text;
    } else if (textAiNode) {
      // AIでテキスト生成
      const prompt = textAiNode.data?.customPrompt || "最新のAIニュースを100文字でSNS向けに要約して";
      const model = textAiNode.data?.model || "meta-llama/llama-3.3-70b-instruct:free";
      generatedText = await generateTextWithAI(prompt, model);
    } else {
      generatedText = "Syncワークフローからの自動投稿です。";
    }

    // 画像入力ノードから画像URLを取得
    const imageInputNode = nodes.find((n: any) => n.type === "imageInputNode");
    const imageUrl = imageInputNode?.data?.imageUrl || null;

    // SNSノードを特定して投稿
    const snsNodes = nodes.filter(
      (n: any) => n.type === "socialActionNode" || n.type === "snsAction"
    );

    const results = [];

    if (snsNodes.length === 0) {
      // SNSノードがない場合はテスト実行として生成テキストだけ返す
      await prisma.executionLog.create({
        data: {
          workflowId,
          status: "SUCCESS",
          finishedAt: new Date(),
          details: { generatedText, message: "SNSノードなし: テキスト生成のみ実行" },
        },
      });

      return NextResponse.json({
        success: true,
        message: "SNSノードなし: テキスト生成のみ実行しました",
        generatedText,
      });
    }

    for (const snsNode of snsNodes) {
      const platform = snsNode.data?.platform;
      const snsPlatform = platform === "x" ? "twitter" : platform;

      if (!snsPlatform || !["twitter", "facebook", "instagram"].includes(snsPlatform)) {
        results.push({ platform, success: false, error: "未対応のプラットフォーム" });
        continue;
      }

      const result = await postToSNS(
        session.user.id,
        snsPlatform as "twitter" | "facebook" | "instagram",
        generatedText || "",
        imageUrl
      );
      results.push(result);
    }

    // 実行ログを保存
    const allSuccess = results.every((r) => r.success);
    await prisma.executionLog.create({
      data: {
        workflowId,
        status: allSuccess ? "SUCCESS" : "FAILED",
        finishedAt: new Date(),
        details: { generatedText, postResults: results },
      },
    });

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? "ワークフローを実行しました" : "一部の投稿に失敗しました",
      generatedText,
      results,
    });
  } catch (error: any) {
    console.error("Workflow Execution Error:", error);
    return NextResponse.json(
      { error: "実行に失敗しました: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
