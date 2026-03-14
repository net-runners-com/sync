import { Inngest } from "inngest";

// クライアントを作成し、アプリケーション名を指定
// ローカルでのテスト時にエラーが出ないよう eventKey のフォールバックを設定
export const inngest = new Inngest({ 
  id: "snssync-ai"
});
