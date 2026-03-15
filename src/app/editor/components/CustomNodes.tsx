import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react';
import {
  Clock, MessageSquare, Image as ImageIcon, Twitter, Instagram,
  Smartphone, GitBranch, Video, BarChart3, Facebook, Trash2, Upload,
  X as XIcon, Calendar, PenTool, Database, LogIn, Box, FileText, Music, MessageCircle, Loader2
} from 'lucide-react';
import { toast } from "sonner";

const NodeHeader = ({ icon: Icon, title, gradient, nodeId }: { icon: any, title: string, gradient: string, nodeId: string }) => {
  const { setNodes } = useReactFlow();

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== nodeId));
  };

  return (
    <div className={`bg-gradient-to-r ${gradient} px-4 py-2.5 flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-white" />
        <span className="font-bold text-sm text-white">{title}</span>
      </div>
      <button
        onClick={onDelete}
        className="text-white/70 hover:text-white hover:bg-white dark:bg-slate-900/20 p-1 rounded transition-colors"
        title="ノードを削除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

// --- Group Node & Sticky Note (Utility Nodes) ---

// --- トリガーノード ---
export const TriggerNode = memo(({ id, data }: { id: string, data: any }) => {
  const { updateNodeData } = useReactFlow();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { scheduledAt: e.target.value });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <NodeHeader icon={Clock} title="トリガー" gradient="from-blue-500 to-blue-600" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">実行スケジュール設定</label>
          <input 
            type="datetime-local" 
            className="nodrag w-full text-xs p-2 border border-blue-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-400 font-medium"
            value={data.scheduledAt || ""}
            onChange={handleDateChange}
          />
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md border border-slate-100 dark:border-slate-800">
          設定された日時に実行キューへ追加されます。
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white" />
    </div>
  );
});
TriggerNode.displayName = 'TriggerNode';

// --- AI処理ノード: テキスト生成 ---
export const TextAiNode = memo(({ id, data }: { id: string, data: any }) => {
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [promptMode, setPromptMode] = useState<'text' | 'json'>(data.promptMode || 'text');
  const [prompt, setPrompt] = useState(data.customPrompt || '');
  const [jsonPrompt, setJsonPrompt] = useState(data.jsonPrompt || '{\n  "instruction": "",\n  "context": ""\n}');
  const [model, setModel] = useState(data.model || 'openai/gpt-4o-mini');

  const handleRun = async () => {
    const finalPrompt = promptMode === 'json' ? jsonPrompt : prompt;
    if (!finalPrompt.trim()) return;
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', prompt: finalPrompt, model }),
      });
      const data = await res.json();
      if (data.error) setOutput(`⚠ ${data.error}`);
      else setOutput(data.result);
    } catch {
      setOutput('⚠ エラーが発生しました');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-purple-500 rounded-xl shadow-lg min-w-[300px] max-w-[340px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white" />
      <NodeHeader icon={MessageSquare} title="テキスト生成 AI" gradient="from-purple-500 to-purple-600" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">モデル (OpenRouter)</label>
          <select className="nodrag w-full text-xs p-1.5 border border-purple-200 rounded-md bg-purple-50 text-purple-700 focus:outline-none focus:border-purple-500 cursor-pointer font-medium"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="meta-llama/llama-3.3-70b-instruct:free">🆓 Llama 3.3 70B (Meta)</option>
            <option value="google/gemma-3-27b-it:free">🆓 Gemma 3 27B (Google)</option>
            <option value="mistralai/mistral-small-3.1-24b-instruct:free">🆓 Mistral Small 3.1 24B</option>
            <option value="openai/gpt-oss-120b:free">🆓 GPT OSS 120B (OpenAI)</option>
            <option value="qwen/qwen3-coder:free">🆓 Qwen3 Coder 480B</option>
            <option value="nousresearch/hermes-3-llama-3.1-405b:free">🆓 Hermes 3 405B (Nous)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">プロンプト</label>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
              <button
                onClick={() => setPromptMode('text')}
                className={`text-[9px] px-2 py-0.5 rounded-sm font-bold transition-colors ${promptMode === 'text' ? 'bg-white dark:bg-slate-900 text-purple-700 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
              >
                TEXT
              </button>
              <button
                onClick={() => setPromptMode('json')}
                className={`text-[9px] px-2 py-0.5 rounded-sm font-bold transition-colors ${promptMode === 'json' ? 'bg-white dark:bg-slate-900 text-purple-700 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
              >
                JSON
              </button>
            </div>
          </div>
          {promptMode === 'text' ? (
            <textarea placeholder="AIへの指示を具体的に入力..."
              className="nodrag w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-purple-500 resize-none h-20"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          ) : (
            <textarea placeholder='{"key": "value"}'
              className="nodrag w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-purple-500 resize-none h-20 font-mono bg-slate-50 dark:bg-slate-950"
              value={jsonPrompt}
              onChange={(e) => setJsonPrompt(e.target.value)}
            />
          )}
        </div>
        <button
          onClick={handleRun}
          disabled={running || (promptMode === 'text' ? !prompt.trim() : !jsonPrompt.trim())}
          className="w-full text-xs py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-md font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          {running ? (
            <><span className="animate-spin h-3 w-3 border-b-2 border-white rounded-full inline-block" />生成中...</>
          ) : '▶ この場でテスト実行'}
        </button>
        {output && (
          <div className="bg-purple-50 border border-purple-200 rounded-md p-2 text-[11px] text-slate-700 dark:text-slate-200 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {output}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white" />
    </div>
  );
});
TextAiNode.displayName = 'TextAiNode';


// --- AI処理ノード: 画像生成 ---
export const ImageAiNode = memo(({ id, data }: { id: string, data: any }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-fuchsia-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-fuchsia-400 !border-2 !border-white" />
      <NodeHeader icon={ImageIcon} title="画像生成 AI" gradient="from-fuchsia-500 to-pink-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{data.label || 'DALL-E 3 生成'}</div>

        <div className="border-2 border-dashed border-fuchsia-200 rounded-md p-3 flex flex-col items-center justify-center gap-2 bg-fuchsia-50/50 cursor-pointer hover:bg-fuchsia-50 transition-colors">
          <Upload size={16} className="text-fuchsia-400" />
          <span className="text-[10px] text-fuchsia-600 font-medium text-center">
            参照画像を追加<br/>(i2i / ControlNet)
          </span>
        </div>

        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">モデル</label>
          <select className="nodrag w-full text-xs p-1.5 border border-fuchsia-200 rounded-md bg-fuchsia-50 text-fuchsia-700 focus:outline-none focus:border-fuchsia-400 cursor-pointer font-medium"
            defaultValue={data.model || 'dall-e-3'}
            onChange={(e) => {}}
          >
            <option value="dall-e-3">🎨 DALL-E 3</option>
            <option value="sd3">🎨 Stable Diffusion 3</option>
            <option value="midjourney">🎨 Midjourney (API)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">サイズ</label>
          <select className="nodrag w-full text-xs p-1.5 border border-fuchsia-200 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-fuchsia-400 cursor-pointer"
            defaultValue={data.size || '1024x1024'}
            onChange={(e) => {}}
          >
            <option value="1024x1024">1024x1024 (1:1)</option>
            <option value="1024x1792">1024x1792 (9:16 - Instagram/TikTok)</option>
            <option value="1792x1024">1792x1024 (16:9 - YouTube)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">カスタムプロンプト</label>
          <textarea placeholder="画像の詳細な作成指示を入力..."
            className="nodrag w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-fuchsia-500 resize-none h-16"
            defaultValue={data.customPrompt || ''}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-fuchsia-500 !border-2 !border-white" />
    </div>
  );
});
ImageAiNode.displayName = 'ImageAiNode';

// --- AI処理ノード: 動画生成 ---
export const VideoAiNode = memo(({ id, data }: { id: string, data: any }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-rose-400 !border-2 !border-white" />
      <NodeHeader icon={Video} title="動画生成 AI" gradient="from-rose-500 to-orange-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{data.label || 'Runway Gen-3'}</div>

        <div className="border-2 border-dashed border-rose-200 rounded-md p-3 flex flex-col items-center justify-center gap-2 bg-rose-50/50 cursor-pointer hover:bg-rose-50 transition-colors">
          <Upload size={16} className="text-rose-400" />
          <span className="text-[10px] text-rose-600 font-medium text-center">
            開始/終了画像を追加<br/>(Image to Video)
          </span>
        </div>

        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">エンジン</label>
          <select className="nodrag w-full text-xs p-1.5 border border-rose-200 rounded-md bg-rose-50 text-rose-700 focus:outline-none focus:border-rose-400 cursor-pointer font-medium"
            defaultValue={data.engine || 'runway-gen3'}
            onChange={(e) => {}}
          >
            <option value="runway-gen3">🎬 Runway Gen-3 Alpha</option>
            <option value="luma-dream">🎬 Luma Dream Machine</option>
            <option value="haiper">🎬 Haiper API</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">カスタムプロンプト</label>
          <textarea placeholder="カメラワークや被写体の動きを入力..."
            className="nodrag w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-rose-500 resize-none h-16"
            defaultValue={data.customPrompt || ''}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-rose-500 !border-2 !border-white" />
    </div>
  );
});
VideoAiNode.displayName = 'VideoAiNode';

// --- 分析ノード ---
export const AnalyzerNode = memo(({ id, data }: { id: string, data: any }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-teal-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-teal-400 !border-2 !border-white" />
      <NodeHeader icon={BarChart3} title="インサイト分析" gradient="from-teal-500 to-emerald-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{data.label || '感情・競合分析'}</div>

        {/* URL / ユーザーID 入力UI */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">ターゲット (ユーザーID等)</label>
          <input type="text"
            placeholder="@elonmusk, #topic"
            className="nodrag w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-teal-500"
            defaultValue={data.target || ''}
            onChange={(e) => {
               // ここは簡易モック。本来は onNodesChange等を使って状態管理します
            }}
          />
        </div>

        <div className="bg-teal-50 p-2 rounded-md text-xs text-teal-700 border border-teal-200 font-medium">
          📊 タイプ: {data.analysisType || '感情スコア'}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white" />
    </div>
  );
});
AnalyzerNode.displayName = 'AnalyzerNode';

// --- 条件分岐ノード (If/Else) ---
export const IfElseNode = memo(({ id, data }: { id: string, data: any }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-xl shadow-lg min-w-[280px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white" />
      <NodeHeader icon={GitBranch} title="条件分岐 (If/Else)" gradient="from-amber-500 to-yellow-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{data.label || '条件を設定'}</div>
        <div className="bg-amber-50 p-2 rounded-md text-xs text-amber-800 border border-amber-200 font-mono">
          {data.condition || 'score > 0.7'}
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-green-600 font-bold flex items-center gap-1">✅ True</span>
          <span className="text-red-500 font-bold flex items-center gap-1">❌ False</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-white"
        style={{ left: '70%' }}
      />
    </div>
  );
});
IfElseNode.displayName = 'IfElseNode';

// --- アクションノード: SNS投稿 ---
export const SocialActionNode = memo(({ id, data }: { id: string, data: any }) => {
  const { setNodes } = useReactFlow();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [accounts, setAccounts] = useState<{accountId: string; accountName?: string; hasToken: boolean}[]>([]);
  const isConnected = accounts.length > 0;

  useEffect(() => {
    const checkConnection = async () => {
      setCheckingAuth(true);
      try {
        const res = await fetch('/api/user/social-accounts');
        if (res.ok) {
          const d = await res.json();
          // Instagram は facebook で判定、 X (Twitter) は twitter で判定
          const providerKey = data.platform === 'instagram' ? 'facebook' : data.platform === 'x' ? 'twitter' : data.platform;
          const providerAccounts = d.accounts?.[providerKey] || [];
          setAccounts(providerAccounts);
          
          // data.accountIdが未設定で、有効なアカウントがあれば初期設定
          if (!data.accountId && providerAccounts.length > 0) {
            setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, accountId: providerAccounts[0].accountId } } : n));
          }
        }
      } catch {}
      setCheckingAuth(false);
    };
    checkConnection();
  }, [data.platform, data.accountId, id, setNodes]);

  const getIcon = () => {
    switch (data.platform) {
      case 'x': return Twitter;
      case 'instagram': return Instagram;
      case 'facebook': return Facebook;
      case 'threads': return MessageCircle; // Threadsの代用
      default: return Smartphone;
    }
  };

  const getGradient = () => {
    switch (data.platform) {
      case 'x': 
      case 'threads': return 'from-slate-700 to-slate-900';
      case 'instagram': return 'from-pink-500 to-purple-600';
      case 'facebook': return 'from-blue-600 to-blue-800';
      default: return 'from-slate-500 to-slate-700';
    }
  };

  const getBorderColor = () => {
    switch (data.platform) {
      case 'x':
      case 'threads': return 'border-slate-800';
      case 'instagram': return 'border-pink-500';
      case 'facebook': return 'border-blue-600';
      default: return 'border-slate-400';
    }
  };

  return (
    <>
      <div className={`bg-white dark:bg-slate-900 border-2 ${getBorderColor()} rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl`}>
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white" />
        <NodeHeader icon={getIcon()} title={`SNS投稿: ${data.platformName || (data.platform === 'threads' ? 'Threads' : 'X (Twitter)')}`} gradient={getGradient()} nodeId={id} />
        <div className="p-4 flex flex-col gap-3">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{data.label || 'テキストと画像を投稿'}</div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">投稿タイプ</label>
            <select
              className={`nodrag w-full text-xs p-1.5 border ${getBorderColor()} rounded-md focus:outline-none cursor-pointer font-medium bg-slate-50 dark:bg-slate-950`}
              defaultValue={data.postType || 'feed'}
              onChange={(e) => setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, postType: e.target.value } } : n))}
            >
              {data.platform === 'x' ? (
                <>
                  <option value="tweet">ツイート</option>
                  <option value="thread">スレッド</option>
                  <option value="quote">引用ツイート</option>
                </>
              ) : data.platform === 'threads' ? (
                <>
                  <option value="thread">Threads 投稿</option>
                </>
              ) : data.platform === 'facebook' ? (
                <>
                  <option value="feed">フィード投稿</option>
                  <option value="story">ストーリーズ</option>
                  <option value="reels">リール</option>
                  <option value="event">イベント</option>
                </>
              ) : data.platform === 'instagram' ? (
                <>
                  <option value="feed">フィード投稿</option>
                  <option value="story">ストーリーズ</option>
                  <option value="reels">リール</option>
                </>
              ) : (
                <option value="post">標準投稿</option>
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">連携アカウントを選択</label>
            {checkingAuth ? (
              <div className="text-xs text-slate-400 py-1">確認中...</div>
            ) : accounts.length > 0 ? (
              <select
                className={`nodrag w-full text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none cursor-pointer font-medium bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200`}
                value={data.accountId || accounts[0].accountId}
                onChange={(e) => setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, accountId: e.target.value } } : n))}
              >
                {accounts.map(acc => (
                  <option key={acc.accountId} value={acc.accountId}>
                    {acc.accountName || `アカウント (${acc.accountId})`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center justify-between text-xs border border-red-200 dark:border-red-900/50 rounded p-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400">
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  連携がありません
                </span>
                <button
                   className="text-blue-600 hover:text-blue-800 underline"
                   onClick={() => toast.info("設定画面からアカウントを連携してください")}
                >
                  設定へ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* プレビューモーダル */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm shadow-2xl"
          onClick={(e) => {
            e.stopPropagation();
            setIsPreviewOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[400px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-100 ${
              (data.platform === 'x' || data.platform === 'threads') ? 'bg-slate-900 text-white' :
              data.platform === 'instagram' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' :
              'bg-blue-600 text-white'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {React.createElement(getIcon(), { size: 16 })}
                <span>{data.platformName || (data.platform === 'threads' ? 'Threads' : 'X (Twitter)')} プレビュー</span>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="hover:bg-white dark:bg-slate-900/20 p-1 rounded transition-colors">
                <XIcon size={18} />
              </button>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-950">
              {/* モックプレビュー画面 */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">👤</div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">Sync Bot</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">@sync_ai · 10分前</div>
                  </div>
                </div>
                <div className="text-sm text-slate-800 dark:text-slate-100 mb-3 whitespace-pre-wrap">
                  AIが自動生成した【サンプルテキスト】です！✨\n\n最新のトレンドに合わせて文章と画像を生成し、最適なタイミングで各プラットフォームへ投稿します。
                </div>
                <div className="w-full h-40 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs">
                  [ Generated Image / Video Placeholder ]
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
SocialActionNode.displayName = 'SocialActionNode';

// --- 新規追加: 投稿生成AIノード ---
export const PostGenerationAiNode = memo(({ id, data }: { id: string, data: any }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white" />
      <NodeHeader icon={PenTool} title="投稿生成 AI" gradient="from-indigo-500 to-indigo-600" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{data.label || 'ターゲット層向けに投稿作成'}</div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">ターゲットSNS</label>
          <select className="nodrag w-full text-xs p-1.5 border border-indigo-200 rounded-md bg-indigo-50 text-indigo-700 focus:outline-none focus:border-indigo-400 cursor-pointer font-medium"
            defaultValue={data.targetPlatform || 'instagram'}
            onChange={(e) => {}}
          >
            <option value="x">X (Twitter)</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
        <textarea placeholder="口調やフォーマットの指示（例：絵文字多め、Z世代風）"
          className="nodrag w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-md mt-1 focus:outline-none focus:border-indigo-500 resize-none h-16"
          defaultValue={data.promptStyle || ''}
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white" />
    </div>
  );
});
PostGenerationAiNode.displayName = 'PostGenerationAiNode';
// --- AI出力プレビューノード ---
export const PreviewNode = memo(({ id, data }: { id: string, data: any }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-xl shadow-lg min-w-[280px] max-w-[320px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white" />
      <NodeHeader icon={ImageIcon} title="AI出力プレビュー" gradient="from-emerald-500 to-teal-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{data.label || '生成結果の確認'}</div>

        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 min-h-[120px] flex flex-col items-center justify-center text-slate-400 text-xs text-center break-words">
          {data.previewContent ? (
            <div className="w-full text-left flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">生成テキスト</span>
                <button
                  onClick={() => {}}
                  className="text-[10px] text-blue-500 hover:text-blue-600 font-medium px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50"
                >
                  編集を確定
                </button>
              </div>
              <textarea className="nodrag w-full text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 focus:outline-none focus:border-emerald-500 resize-y min-h-[100px]"
                defaultValue={data.previewContent}
                onChange={(e) => {}}
              />
            </div>
          ) : data.previewImageUrl ? (
            <img src={data.previewImageUrl} alt="Preview" className="rounded-md max-w-full h-auto" />
          ) : data.previewVideoUrl ? (
            <video src={data.previewVideoUrl} controls className="rounded-md max-w-full h-auto" />
          ) : (
            <span>上のノードを実行すると<br/>ここに結果が表示されます</span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white" />
    </div>
  );
});
PreviewNode.displayName = 'PreviewNode';

// --- 新規追加: Google Driveノード ---
export const DriveNode = memo(({ id, data }: { id: string, data: any }) => {
  const [isConnected, setIsConnected] = useState<boolean>(data.isAuthenticated ?? false);
  const [checkingAuth, setCheckingAuth] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      setCheckingAuth(true);
      try {
        const res = await fetch('/api/user/google-accounts'); // 仮のAPIエンドポイント
        if (res.ok) {
          const d = await res.json();
          setIsConnected(d.accounts?.googleDrive?.hasToken ?? false);
        }
      } catch {}
      setCheckingAuth(false);
    };
    checkConnection();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-green-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-green-400 !border-2 !border-white" />
      <NodeHeader icon={Database} title="Google Drive/Sheets" gradient="from-green-500 to-emerald-600" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{data.label || 'データを保存・取得'}</div>
        {checkingAuth ? (
          <div className="mt-1 text-center text-xs text-slate-400 py-2">確認中...</div>
        ) : (
          <div className="mt-3 flex items-center justify-between text-xs border border-slate-200 dark:border-slate-700 rounded p-2 bg-slate-50 dark:bg-slate-950">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-400"}`}></span>
              {isConnected ? "連携済み" : "未連携"}
            </span>
            {!isConnected && (
              <button
                className="text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => toast.info("設定画面からGoogleアカウントを連携してください")}
              >
                連携する
              </button>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">アクション</label>
          <select className="nodrag w-full text-xs p-1.5 border border-green-200 rounded-md bg-green-50 text-green-700 focus:outline-none focus:border-green-400 cursor-pointer font-medium"
            defaultValue={data.action || 'read-sheet'}
            onChange={(e) => {}}
          >
            <option value="read-sheet">スプレッドシートから取得</option>
            <option value="write-sheet">スプレッドシートへ追記</option>
            <option value="upload-drive">Driveへファイル保存</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">ファイルURL / ID</label>
          <input type="text" 
            placeholder="https://docs.google.com/..." 
            className="nodrag w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-green-500"
            defaultValue={data.fileUrl || ''}
          />
        </div>
        
        {!data.isAuthenticated && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
              <span>⚠️ アカウントへの連携が必要です</span>
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm">
              <LogIn size={14} />
              Google アカウントで連携
            </button>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-green-500 !border-2 !border-white" />
    </div>
  );
});
DriveNode.displayName = 'DriveNode';

// --- 新規追加: Google Calendarトリガーノード ---
export const GoogleCalendarNode = memo(({ id, data }: { id: string, data: any }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-blue-400 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <NodeHeader icon={Calendar} title="Google Calendar" gradient="from-blue-400 to-indigo-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{data.label || '指定イベントで実行開始'}</div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">フックするイベント条件</label>
          <select className="nodrag w-full text-xs p-1.5 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:outline-none focus:border-blue-400 cursor-pointer font-medium"
            defaultValue={data.eventTrigger || 'event-start'}
            onChange={(e) => {}}
          >
            <option value="event-start">📅 予定の開始時刻</option>
            <option value="event-end">📅 予定の終了時刻</option>
            <option value="event-created">📅 新規予定が作成された時</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">カレンダー / キーワード指定</label>
          <input type="text" 
            placeholder="例: 会議, #sns, 重要な予定" 
            className="nodrag w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-blue-400"
            defaultValue={data.keyword || ''}
          />
        </div>
        
        {!data.isAuthenticated && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
              <span>⚠️ カレンダーへのアクセス許可が必要です</span>
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm">
              <LogIn size={14} />
              Google アカウントで連携
            </button>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white" />
    </div>
  );
});
GoogleCalendarNode.displayName = 'GoogleCalendarNode';


// --- 新規追加: Google Docsノード ---
export const GoogleDocsNode = memo(({ id, data }: { id: string, data: any }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-emerald-400 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white" />
      <NodeHeader icon={FileText} title="Google Docs" gradient="from-emerald-400 to-teal-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{data.label || 'ドキュメント操作'}</div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">アクション</label>
          <select className="nodrag w-full text-xs p-1.5 border border-emerald-200 rounded-md bg-emerald-50 text-emerald-700 focus:outline-none focus:border-emerald-400 cursor-pointer font-medium"
            defaultValue={data.action || 'create-doc'}
          >
            <option value="create-doc">新規作成・追記</option>
            <option value="read-doc">ドキュメントを読み取り</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">ドキュメントURL / ID</label>
          <input type="text" 
            placeholder="新規作成時は空欄" 
            className="nodrag w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-emerald-400"
            defaultValue={data.fileUrl || ''}
          />
        </div>
        {!data.isAuthenticated && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
              <span>⚠️ アカウントへの連携が必要です</span>
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm">
              <LogIn size={14} />
              Google アカウント連携
            </button>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white" />
    </div>
  );
});
GoogleDocsNode.displayName = 'GoogleDocsNode';

// --- 新規追加: noteノード ---
export const NoteNode = memo(({ id, data }: { id: string, data: any }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl relative">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white" />
      <NodeHeader icon={FileText} title="noteに投稿" gradient="from-emerald-500 to-green-600" nodeId={id} />
      <div className="absolute top-2 right-10 bg-slate-800 text-white text-[8px] px-1.5 py-0.5 rounded font-bold shadow-sm">
        Coming Soon
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{data.label || 'note記事作成'}</div>
        <div className="opacity-70">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">タイトル</label>
            <input type="text" 
              placeholder="生成されたタイトル" 
              className="nodrag w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-md cursor-not-allowed bg-slate-50 dark:bg-slate-950"
              disabled
            />
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">ハッシュタグ</label>
            <input type="text" 
              placeholder="#note #AI" 
              className="nodrag w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-md cursor-not-allowed bg-slate-50 dark:bg-slate-950"
              disabled
            />
          </div>
        </div>
        <div className="mt-1 flex flex-col gap-2">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700 text-center">
            公式APIが未公開のため、準備中です
          </div>
        </div>
      </div>
    </div>
  );
});
NoteNode.displayName = 'NoteNode';

// --- 新規追加: TikTokノード ---
export const TiktokNode = memo(({ id, data }: { id: string, data: any }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl relative">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white" />
      <NodeHeader icon={Music} title="TikTokに投稿" gradient="from-slate-800 to-slate-900" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{data.label || 'ショート動画を投稿'}</div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">投稿タイプ</label>
          <select className="nodrag w-full text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer font-medium"
            defaultValue={data.postType || 'video'}
          >
            <option value="video">ショート動画投稿</option>
            <option value="photo">フォトモード（画像複数）</option>
          </select>
        </div>
        
        {!data.isAuthenticated && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="text-[10px] text-red-500 font-semibold bg-red-50 p-1.5 rounded border border-red-100 text-center">
              未連携: TikTokアカウントが必要です
            </div>
            <button className="w-full bg-slate-900 hover:bg-black text-white py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm">
              <LogIn size={14} />
              設定から連携する
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
TiktokNode.displayName = 'TiktokNode';

// --- 新規追加: カスタムノード (API由来の動的ノード) ---
export const DynamicCustomNode = memo(({ id, data }: { id: string, data: any }) => {
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  
  // Sidebarのドラッグイベントで渡された customNodeId と config を使用
  const config = data.config || { inputs: [], outputs: [], type: "AI_PROMPT" };
  const inputs = config.inputs || [];
  const outputs = config.outputs || [];
  
  // 各入力フォームのステート管理
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // アイコンの選定
  let IconComponent = Box;
  // (データモデル側でicon文字列を持っていれば判定を入れるが、現行React Flowのdataにicon文字列が欠けるのでデフォルトBox)

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    try {
      if (config.type === "AI_PROMPT") {
        // AIプロンプトの場合: 変数展開を行う
        let finalPrompt = config.systemPrompt || "";
        inputs.forEach((input: any) => {
          const val = inputValues[input.id] || "";
          finalPrompt = finalPrompt.replace(new RegExp(`{{\\s*${input.name}\\s*}}`, 'g'), val);
        });
        
        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'text', prompt: finalPrompt, model: "openai/gpt-4o-mini" }),
        });
        const respData = await res.json();
        if (respData.error) setOutput(`⚠ ${respData.error}`);
        else setOutput(respData.result);

      } else {
        // API等その他の場合（準備中）
        setOutput("⚠ このノードタイプは現在サポートされていません");
      }
    } catch (e) {
      setOutput("⚠ エラーが発生しました");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-purple-400 rounded-xl shadow-lg min-w-[280px] max-w-[340px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white" />
      <NodeHeader icon={IconComponent} title={data.label || 'カスタムノード'} gradient="from-purple-400 to-purple-600" nodeId={id} />
      
      <div className="p-4 flex flex-col gap-3">
        {/* 入力フォーム群の構築 */}
        {inputs.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">入力パラメータ</label>
            {inputs.map((input: any) => (
              <input
                key={input.id}
                type={input.type === 'number' ? 'number' : 'text'}
                placeholder={`${input.name} を入力`}
                value={inputValues[input.id] || ''}
                onChange={(e) => setInputValues({ ...inputValues, [input.id]: e.target.value })}
                className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 focus:outline-none focus:border-purple-400"
              />
            ))}
          </div>
        )}

        {/* 実行ボタン */}
        <button 
          onClick={handleRun}
          disabled={running}
          className="w-full mt-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-2 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 shadow-sm disabled:opacity-50"
        >
          {running ? "実行中..." : "実行テスト"}
        </button>

        {/* 出力結果の表示 */}
        {output && (
          <div className="mt-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-2.5">
            <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex justify-between items-center">
              <span>{outputs[0]?.name || '出力結果'}</span>
              <span className="bg-white dark:bg-slate-900 px-1 border border-slate-200 dark:border-slate-700 rounded text-[9px]">Text</span>
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap max-h-32 overflow-y-auto">
              {output}
            </div>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white" />
    </div>
  );
});
DynamicCustomNode.displayName = 'DynamicCustomNode';

// ============================================================
// --- ユーザー入力ノード群 ---
// ============================================================

// --- テキスト入力ノード ---
export const TextInputNode = memo(({ id, data }: { id: string, data: any }) => {
  const [text, setText] = useState(data.text || '');

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-sky-400 rounded-xl shadow-lg min-w-[280px] max-w-[340px] overflow-hidden transition-shadow hover:shadow-xl">
      <NodeHeader icon={MessageSquare} title="テキスト入力" gradient="from-sky-400 to-blue-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">投稿するテキスト内容</label>
        <textarea placeholder="ここに投稿するテキストを直接入力してください..."
          className="nodrag w-full text-sm p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-sky-400 resize-none h-28 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            data.text = e.target.value;
          }}
        />
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{text.length} 文字</span>
          {text.length > 280 && (
            <span className="text-amber-500 font-semibold">⚠ X(Twitter)は280文字以内推奨</span>
          )}
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-sky-400 !border-2 !border-white" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-sky-400 !border-2 !border-white" />
    </div>
  );
});
TextInputNode.displayName = 'TextInputNode';

// --- 画像入力ノード ---
export const ImageInputNode = memo(({ id, data }: { id: string, data: any }) => {
  const { updateNodeData } = useReactFlow();
  const [imageUrl, setImageUrl] = useState(data.imageUrl || '');
  const [preview, setPreview] = useState(data.imageUrl || '');
  const [uploading, setUploading] = useState(false);

  const applyUrl = (url: string) => {
    setPreview(url);
    setImageUrl(url);
    updateNodeData(id, { imageUrl: url });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result.url) {
        applyUrl(result.url);
        toast.success("画像をアップロードしました");
      } else {
        throw new Error(result.error || "アップロードに失敗しました");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-violet-400 rounded-xl shadow-lg min-w-[280px] max-w-[340px] overflow-hidden transition-shadow hover:shadow-xl">
      <NodeHeader icon={ImageIcon} title="画像入力" gradient="from-violet-400 to-purple-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">画像ファイルアップロード</label>
        <div className="flex flex-col gap-2">
          <input 
            type="file" 
            accept="image/*"
            className="nodrag text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 dark:file:bg-slate-800 dark:file:text-violet-400 dark:hover:file:bg-slate-700"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          {uploading && <span className="text-xs text-violet-500 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> アップロード中...</span>}
        </div>
        
        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase mt-1">または外部URLを指定</label>
        <div className="flex gap-2">
          <input type="text"
            placeholder="https://example.com/image.jpg"
            className="nodrag flex-1 text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-violet-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onBlur={() => applyUrl(imageUrl)}
            disabled={uploading}
          />
          <button
            onClick={() => applyUrl(imageUrl)}
            disabled={uploading}
            className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
          >
            適用
          </button>
        </div>
        {preview ? (
          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <img
              src={preview}
              alt="preview"
              className="w-full h-full object-cover"
              onError={() => setPreview('')}
            />
          </div>
        ) : (
          <div className="w-full h-32 rounded-lg border-2 border-dashed border-violet-200 dark:border-violet-800 flex items-center justify-center text-violet-400 text-xs">
            <div className="text-center">
              <ImageIcon size={24} className="mx-auto mb-1 opacity-50" />
              <span>プレビュー</span>
            </div>
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-violet-400 !border-2 !border-white" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-violet-400 !border-2 !border-white" />
    </div>
  );
});
ImageInputNode.displayName = 'ImageInputNode';

// --- 動画入力ノード ---
export const VideoInputNode = memo(({ id, data }: { id: string, data: any }) => {
  const { updateNodeData } = useReactFlow();
  const [videoUrl, setVideoUrl] = useState(data.videoUrl || '');
  const [preview, setPreview] = useState(data.videoUrl || '');
  const [uploading, setUploading] = useState(false);

  const applyUrl = (url: string) => {
    setPreview(url);
    setVideoUrl(url);
    updateNodeData(id, { videoUrl: url });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result.url) {
        applyUrl(result.url);
        toast.success("動画をアップロードしました");
      } else {
        throw new Error(result.error || "アップロードに失敗しました");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-orange-400 rounded-xl shadow-lg min-w-[280px] max-w-[340px] overflow-hidden transition-shadow hover:shadow-xl">
      <NodeHeader icon={Video} title="動画入力" gradient="from-orange-400 to-red-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">動画ファイルアップロード</label>
        <div className="flex flex-col gap-2">
          <input 
            type="file" 
            accept="video/*"
            className="nodrag text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-slate-800 dark:file:text-orange-400 dark:hover:file:bg-slate-700"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          {uploading && <span className="text-xs text-orange-500 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> アップロード中...</span>}
        </div>

        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase mt-1">または外部URLを指定</label>
        <div className="flex gap-2">
          <input type="text"
            placeholder="https://example.com/video.mp4"
            className="nodrag flex-1 text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-orange-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            onBlur={() => applyUrl(videoUrl)}
            disabled={uploading}
          />
          <button
            onClick={() => applyUrl(videoUrl)}
            disabled={uploading}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
          >
            適用
          </button>
        </div>
        {preview ? (
          <video
            src={preview}
            controls
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 max-h-40"
            onError={() => setPreview('')}
          />
        ) : (
          <div className="w-full h-24 rounded-lg border-2 border-dashed border-orange-200 dark:border-orange-800 flex items-center justify-center text-orange-400 text-xs">
            <div className="text-center">
              <Video size={24} className="mx-auto mb-1 opacity-50" />
              <span>プレビュー</span>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {['TikTok', 'Instagram リール', 'YouTube Shorts'].map(p => (
            <span key={p} className="text-[10px] bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-700">{p}</span>
          ))}
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-orange-400 !border-2 !border-white" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-orange-400 !border-2 !border-white" />
    </div>
  );
});
VideoInputNode.displayName = 'VideoInputNode';

// =============================================
// グループノード — ノードを囲む視覚的グループ
// =============================================
export const GroupNode = memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
  const { setNodes } = useReactFlow();
  const [label, setLabel] = useState(data?.label || 'グループ');
  const [editing, setEditing] = useState(false);
  const [color, setColor] = useState(data?.color || 'blue');

  const colors: Record<string, { border: string; bg: string; headerBg: string; dot: string }> = {
    blue:   { border: 'border-blue-400',   bg: 'bg-blue-50/30 dark:bg-blue-950/20',    headerBg: 'bg-blue-400',   dot: 'bg-blue-400' },
    purple: { border: 'border-purple-400', bg: 'bg-purple-50/30 dark:bg-purple-950/20', headerBg: 'bg-purple-400', dot: 'bg-purple-400' },
    green:  { border: 'border-green-400',  bg: 'bg-green-50/30 dark:bg-green-950/20',  headerBg: 'bg-green-400',  dot: 'bg-green-400' },
    orange: { border: 'border-orange-400', bg: 'bg-orange-50/30 dark:bg-orange-950/20', headerBg: 'bg-orange-400', dot: 'bg-orange-400' },
    rose:   { border: 'border-rose-400',   bg: 'bg-rose-50/30 dark:bg-rose-950/20',    headerBg: 'bg-rose-400',   dot: 'bg-rose-400' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={`relative w-full h-full rounded-2xl border-2 border-dashed ${c.border} ${c.bg}`}>
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        lineClassName={`!border-2 ${c.border}`}
        handleClassName="!w-3 !h-3 !rounded-full !border-2 !border-white !shadow"
      />
      <div className={`absolute top-0 left-0 right-0 h-8 ${c.headerBg} rounded-t-2xl flex items-center justify-between px-3`}>
        {editing ? (
          <input autoFocus
            className="nodrag bg-white/30 text-white placeholder-white/70 text-xs font-semibold rounded px-1 outline-none w-full"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={() => {
              setEditing(false);
              setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, label } } : n));
            }}
            onKeyDown={e => { if (e.key === 'Enter') setEditing(false); }}
          />
        ) : (
          <span
            className="text-white text-xs font-semibold cursor-text select-none"
            onDoubleClick={() => setEditing(true)}
          >
            {label}
          </span>
        )}
        <div className="flex items-center gap-1">
          {Object.keys(colors).map(k => (
            <button
              key={k}
              onClick={() => {
                setColor(k);
                setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, color: k } } : n));
              }}
              className={`w-3 h-3 rounded-full ${colors[k].dot} border-2 ${color === k ? 'border-white' : 'border-white/40'} hover:scale-110 transition-transform`}
            />
          ))}
          <button
            onClick={() => setNodes(ns => ns.filter(n => n.id !== id))}
            className="ml-1 text-white/70 hover:text-white text-xs leading-none"
          >✕</button>
        </div>
      </div>
    </div>
  );
});
GroupNode.displayName = 'GroupNode';

// =============================================
// Sticky Note — キャンバスに貼る付箋メモ
// =============================================
export const StickyNoteNode = memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
  const { setNodes } = useReactFlow();
  const [text, setText] = useState(data?.text || '');
  const [color, setColor] = useState(data?.color || 'yellow');

  const colors: Record<string, { bg: string; border: string; header: string; textarea: string }> = {
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/40',  border: 'border-yellow-300', header: 'bg-yellow-200 dark:bg-yellow-800', textarea: 'bg-yellow-50 dark:bg-yellow-900/20' },
    green:  { bg: 'bg-green-50 dark:bg-green-900/40',   border: 'border-green-300',  header: 'bg-green-200 dark:bg-green-800',  textarea: 'bg-green-50 dark:bg-green-900/20' },
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/40',     border: 'border-blue-300',   header: 'bg-blue-200 dark:bg-blue-800',   textarea: 'bg-blue-50 dark:bg-blue-900/20' },
    pink:   { bg: 'bg-pink-50 dark:bg-pink-900/40',     border: 'border-pink-300',   header: 'bg-pink-200 dark:bg-pink-800',   textarea: 'bg-pink-50 dark:bg-pink-900/20' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/40', border: 'border-purple-300', header: 'bg-purple-200 dark:bg-purple-800', textarea: 'bg-purple-50 dark:bg-purple-900/20' },
  };
  const c = colors[color] || colors.yellow;
  const colorDots: Record<string, string> = {
    yellow: 'bg-yellow-400', green: 'bg-green-400', blue: 'bg-blue-400', pink: 'bg-pink-400', purple: 'bg-purple-400'
  };

  return (
    <div className={`relative rounded-xl border-2 shadow-md ${c.bg} ${c.border} flex flex-col overflow-hidden`} style={{ minWidth: 200, minHeight: 150 }}>
      <NodeResizer
        minWidth={160}
        minHeight={120}
        isVisible={selected}
        lineClassName={`!border-2 ${c.border}`}
        handleClassName="!w-3 !h-3 !rounded-full !border-2 !border-white !shadow"
      />
      <div className={`flex items-center justify-between px-3 py-1.5 ${c.header}`}>
        <span className="text-xs font-bold text-slate-600 dark:text-slate-200 select-none">📝 メモ</span>
        <div className="flex items-center gap-1">
          {Object.keys(colors).map(k => (
            <button
              key={k}
              onClick={() => {
                setColor(k);
                setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, color: k } } : n));
              }}
              className={`w-3 h-3 rounded-full ${colorDots[k]} border-2 ${color === k ? 'border-slate-600' : 'border-white/60'} hover:scale-110 transition-transform`}
            />
          ))}
          <button
            onClick={() => setNodes(ns => ns.filter(n => n.id !== id))}
            className="ml-1 text-slate-400 hover:text-slate-600 text-xs leading-none"
          >✕</button>
        </div>
      </div>
      <textarea
        className={`flex-1 p-3 text-sm text-slate-700 dark:text-slate-200 resize-none outline-none ${c.textarea} placeholder-slate-400`}
        placeholder="メモを入力..."
        value={text}
        onChange={e => {
          setText(e.target.value);
          setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, text: e.target.value } } : n));
        }}
        style={{ minHeight: 80 }}
      />
    </div>
  );
});
StickyNoteNode.displayName = 'StickyNoteNode';
