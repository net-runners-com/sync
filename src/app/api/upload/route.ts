import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Cloudflare R2 クライアントの初期化
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
    }

    // ファイル情報を取得
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split(".").pop() || "";
    // 一意のファイル名を生成
    const uniqueFilename = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!bucketName) {
      return NextResponse.json({ error: "R2_BUCKET_NAMEが設定されていません" }, { status: 500 });
    }

    // R2へのアップロードパラメータを設定
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFilename,
      Body: buffer,
      ContentType: file.type,
    });

    // R2へファイルをアップロード
    await s3Client.send(command);

    // パブリックURLを生成して返却 (R2_PUBLIC_URLの再確認)
    const publicUrlBase = process.env.R2_PUBLIC_URL;
    if (!publicUrlBase) {
       return NextResponse.json({ error: "R2_PUBLIC_URLが設定されていません" }, { status: 500 });
    }

    const fileUrl = `${publicUrlBase.replace(/\/$/, "")}/${uniqueFilename}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error("R2 Upload Error:", error);
    return NextResponse.json({ error: "アップロードに失敗しました", details: error.message }, { status: 500 });
  }
}
