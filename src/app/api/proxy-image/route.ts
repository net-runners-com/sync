import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    // Cloudflare R2 のプライベートURLを検知した場合はS3Clientで取得する
    if (url.includes("r2.cloudflarestorage.com") && process.env.R2_ACCOUNT_ID) {
      const s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        },
      });

      const urlPath = url.split("r2.cloudflarestorage.com/")[1];
      const parts = urlPath.split("/");
      const bucketName = parts[0];
      const key = parts.slice(1).join("/");

      const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
      const response = await s3Client.send(command);

      if (!response.Body) {
        throw new Error("Empty body from R2");
      }
      
      const byteArray = await response.Body.transformToByteArray();
      const contentType = response.ContentType || "image/jpeg";
      
      return new NextResponse(Buffer.from(byteArray), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // その他の外部URLに対する通常のProxy処理 (CORS回避用)
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch external image: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Image proxy error:", error);
    return new NextResponse(`Failed to proxy image: ${error.message}`, { status: 500 });
  }
}
