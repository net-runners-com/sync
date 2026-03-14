import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { 
  Clock, MessageSquare, Image as ImageIcon, Twitter, Instagram, 
  Smartphone, GitBranch, Video, BarChart3, Facebook, Trash2, Upload,
  X as XIcon, Calendar, PenTool, Database, LogIn, Box, FileText, Music
} from 'lucide-react';

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
        className="text-white/70 hover:text-white hover:bg-white/20 p-1 rounded transition-colors"
        title="ノードを削除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

// --- トリガーノード ---
export const TriggerNode = memo(({ id, data }: { id: string, data: any }) => {
  return (
    <div className="bg-white border-2 border-blue-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <NodeHeader icon={Clock} title="トリガー" gradient="from-blue-500 to-blue-600" nodeId={id} />
      <div className="p-4 flex flex-col gap-2">
        <div className="text-sm font-medium text-slate-700">{data.label || '毎日 12:00'}</div>
        <div className="text-xs text-slate-400">Cron: 0 12 * * *</div>
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
  const [model, setModel] = useState(data.model || 'meta-llama/llama-3.3-70b-instruct:free');

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
    <div className="bg-white border-2 border-purple-500 rounded-xl shadow-lg min-w-[300px] max-w-[340px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white" />
      <NodeHeader icon={MessageSquare} title="テキスト生成 AI" gradient="from-purple-500 to-purple-600" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">モデル (OpenRouter)</label>
          <select
            className="w-full text-xs p-1.5 border border-purple-200 rounded-md bg-purple-50 text-purple-700 focus:outline-none focus:border-purple-500 cursor-pointer font-medium"
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
            <label className="text-[10px] text-slate-500 font-semibold uppercase">プロンプト</label>
            <div className="flex bg-slate-100 p-0.5 rounded-md">
              <button 
                onClick={() => setPromptMode('text')}
                className={`text-[9px] px-2 py-0.5 rounded-sm font-bold transition-colors ${promptMode === 'text' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                TEXT
              </button>
              <button 
                onClick={() => setPromptMode('json')}
                className={`text-[9px] px-2 py-0.5 rounded-sm font-bold transition-colors ${promptMode === 'json' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                JSON
              </button>
            </div>
          </div>
          {promptMode === 'text' ? (
            <textarea
              placeholder="AIへの指示を具体的に入力..."
              className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 resize-none h-20"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          ) : (
            <textarea
              placeholder='{"key": "value"}'
              className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 resize-none h-20 font-mono bg-slate-50"
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
          <div className="bg-purple-50 border border-purple-200 rounded-md p-2 text-[11px] text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
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
    <div className="bg-white border-2 border-fuchsia-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-fuchsia-400 !border-2 !border-white" />
      <NodeHeader icon={ImageIcon} title="画像生成 AI" gradient="from-fuchsia-500 to-pink-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700">{data.label || 'DALL-E 3 生成'}</div>
        
        <div className="border-2 border-dashed border-fuchsia-200 rounded-md p-3 flex flex-col items-center justify-center gap-2 bg-fuchsia-50/50 cursor-pointer hover:bg-fuchsia-50 transition-colors">
          <Upload size={16} className="text-fuchsia-400" />
          <span className="text-[10px] text-fuchsia-600 font-medium text-center">
            参照画像を追加<br/>(i2i / ControlNet)
          </span>
        </div>
        
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">モデル</label>
          <select 
            className="w-full text-xs p-1.5 border border-fuchsia-200 rounded-md bg-fuchsia-50 text-fuchsia-700 focus:outline-none focus:border-fuchsia-400 cursor-pointer font-medium"
            defaultValue={data.model || 'dall-e-3'}
            onChange={(e) => {}}
          >
            <option value="dall-e-3">🎨 DALL-E 3</option>
            <option value="sd3">🎨 Stable Diffusion 3</option>
            <option value="midjourney">🎨 Midjourney (API)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">サイズ</label>
          <select 
            className="w-full text-xs p-1.5 border border-fuchsia-200 rounded-md bg-white text-slate-700 focus:outline-none focus:border-fuchsia-400 cursor-pointer"
            defaultValue={data.size || '1024x1024'}
            onChange={(e) => {}}
          >
            <option value="1024x1024">1024x1024 (1:1)</option>
            <option value="1024x1792">1024x1792 (9:16 - Instagram/TikTok)</option>
            <option value="1792x1024">1792x1024 (16:9 - YouTube)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">カスタムプロンプト</label>
          <textarea 
            placeholder="画像の詳細な作成指示を入力..." 
            className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-fuchsia-500 resize-none h-16"
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
    <div className="bg-white border-2 border-rose-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-rose-400 !border-2 !border-white" />
      <NodeHeader icon={Video} title="動画生成 AI" gradient="from-rose-500 to-orange-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700">{data.label || 'Runway Gen-3'}</div>

        <div className="border-2 border-dashed border-rose-200 rounded-md p-3 flex flex-col items-center justify-center gap-2 bg-rose-50/50 cursor-pointer hover:bg-rose-50 transition-colors">
          <Upload size={16} className="text-rose-400" />
          <span className="text-[10px] text-rose-600 font-medium text-center">
            開始/終了画像を追加<br/>(Image to Video)
          </span>
        </div>

        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">エンジン</label>
          <select 
            className="w-full text-xs p-1.5 border border-rose-200 rounded-md bg-rose-50 text-rose-700 focus:outline-none focus:border-rose-400 cursor-pointer font-medium"
            defaultValue={data.engine || 'runway-gen3'}
            onChange={(e) => {}}
          >
            <option value="runway-gen3">🎬 Runway Gen-3 Alpha</option>
            <option value="luma-dream">🎬 Luma Dream Machine</option>
            <option value="haiper">🎬 Haiper API</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">カスタムプロンプト</label>
          <textarea 
            placeholder="カメラワークや被写体の動きを入力..." 
            className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-rose-500 resize-none h-16"
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
    <div className="bg-white border-2 border-teal-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-teal-400 !border-2 !border-white" />
      <NodeHeader icon={BarChart3} title="インサイト分析" gradient="from-teal-500 to-emerald-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700">{data.label || '感情・競合分析'}</div>
        
        {/* URL / ユーザーID 入力UI */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">ターゲット (ユーザーID等)</label>
          <input 
            type="text" 
            placeholder="@elonmusk, #topic" 
            className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-500"
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
    <div className="bg-white border-2 border-amber-500 rounded-xl shadow-lg min-w-[280px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white" />
      <NodeHeader icon={GitBranch} title="条件分岐 (If/Else)" gradient="from-amber-500 to-yellow-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700">{data.label || '条件を設定'}</div>
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(data.isAuthenticated ?? false);
  const [checkingAuth, setCheckingAuth] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      setCheckingAuth(true);
      try {
        const res = await fetch('/api/user/social-accounts');
        if (res.ok) {
          const d = await res.json();
          // Instagram も Facebook トークンで認証するため facebook を確認
          const providerKey = data.platform === 'instagram' ? 'facebook' : data.platform;
          setIsConnected(d.accounts?.[providerKey]?.hasToken ?? false);
        }
      } catch {}
      setCheckingAuth(false);
    };
    checkConnection();
  }, [data.platform]);

  const getIcon = () => {
    switch (data.platform) {
      case 'x': return Twitter;
      case 'instagram': return Instagram;
      case 'facebook': return Facebook;
      default: return Smartphone;
    }
  };

  const getGradient = () => {
    switch (data.platform) {
      case 'x': return 'from-slate-700 to-slate-900';
      case 'instagram': return 'from-pink-500 to-purple-600';
      case 'facebook': return 'from-blue-600 to-blue-800';
      default: return 'from-slate-500 to-slate-700';
    }
  };

  const getBorderColor = () => {
    switch (data.platform) {
      case 'x': return 'border-slate-800';
      case 'instagram': return 'border-pink-500';
      case 'facebook': return 'border-blue-600';
      default: return 'border-slate-400';
    }
  };

  return (
    <>
      <div className={`bg-white border-2 ${getBorderColor()} rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl`}>
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white" />
        <NodeHeader icon={getIcon()} title={`SNS投稿: ${data.platformName || 'X (Twitter)'}`} gradient={getGradient()} nodeId={id} />
        <div className="p-4 flex flex-col gap-3">
          <div className="text-sm font-medium text-slate-700">{data.label || 'テキストと画像を投稿'}</div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 font-semibold uppercase">投稿タイプ</label>
            <select
              className={`w-full text-xs p-1.5 border ${getBorderColor()} rounded-md focus:outline-none cursor-pointer font-medium bg-slate-50`}
              defaultValue={data.postType || 'feed'}
              onChange={(e) => {}}
            >
              {data.platform === 'x' ? (
                <>
                  <option value="tweet">ツイート</option>
                  <option value="thread">スレッド</option>
                  <option value="quote">引用ツイート</option>
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
          
          {checkingAuth ? (
            <div className="mt-1 text-center text-xs text-slate-400 py-2">確認中...</div>
          ) : isConnected ? (
            <button 
              className="w-full mt-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 border border-slate-200 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsPreviewOpen(true);
              }}
            >
              プレビューを確認
            </button>
          ) : (
            <div className="mt-1 flex flex-col gap-2">
              <div className="text-[10px] text-red-500 font-semibold bg-red-50 p-1.5 rounded border border-red-100 text-center">
                未連携: {data.platformName || 'SNS'}との連携が必要です
              </div>
              <button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // 設定ページへ遷移して連携させる
                  window.open('/dashboard/settings', '_blank');
                }}
              >
                <LogIn size={14} />
                設定から連携する
              </button>
            </div>
          )}
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
            className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-100 ${
              data.platform === 'x' ? 'bg-slate-900 text-white' : 
              data.platform === 'instagram' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 
              'bg-blue-600 text-white'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {React.createElement(getIcon(), { size: 16 })}
                <span>{data.platformName || 'X (Twitter)'} プレビュー</span>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                <XIcon size={18} />
              </button>
            </div>
            
            <div className="p-5 bg-slate-50">
              {/* モックプレビュー画面 */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">👤</div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">Sync Bot</div>
                    <div className="text-xs text-slate-500">@sync_ai · 10分前</div>
                  </div>
                </div>
                <div className="text-sm text-slate-800 mb-3 whitespace-pre-wrap">
                  AIが自動生成した【サンプルテキスト】です！✨\n\n最新のトレンドに合わせて文章と画像を生成し、最適なタイミングで各プラットフォームへ投稿します。
                </div>
                <div className="w-full h-40 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
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
    <div className="bg-white border-2 border-indigo-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white" />
      <NodeHeader icon={PenTool} title="投稿生成 AI" gradient="from-indigo-500 to-indigo-600" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700">{data.label || 'ターゲット層向けに投稿作成'}</div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">ターゲットSNS</label>
          <select 
            className="w-full text-xs p-1.5 border border-indigo-200 rounded-md bg-indigo-50 text-indigo-700 focus:outline-none focus:border-indigo-400 cursor-pointer font-medium"
            defaultValue={data.targetPlatform || 'instagram'}
            onChange={(e) => {}}
          >
            <option value="x">X (Twitter)</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
        <textarea 
          placeholder="口調やフォーマットの指示（例：絵文字多め、Z世代風）" 
          className="w-full text-xs p-2 border border-slate-200 rounded-md mt-1 focus:outline-none focus:border-indigo-500 resize-none h-16"
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
    <div className="bg-white border-2 border-emerald-500 rounded-xl shadow-lg min-w-[280px] max-w-[320px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white" />
      <NodeHeader icon={ImageIcon} title="AI出力プレビュー" gradient="from-emerald-500 to-teal-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700">{data.label || '生成結果の確認'}</div>
        
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[120px] flex flex-col items-center justify-center text-slate-400 text-xs text-center break-words">
          {data.previewContent ? (
            <div className="w-full text-left flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-slate-500 font-semibold">生成テキスト</span>
                <button 
                  onClick={() => {}} 
                  className="text-[10px] text-blue-500 hover:text-blue-600 font-medium px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50"
                >
                  編集を確定
                </button>
              </div>
              <textarea 
                className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded p-2 focus:outline-none focus:border-emerald-500 resize-y min-h-[100px]"
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
  return (
    <div className="bg-white border-2 border-green-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-green-400 !border-2 !border-white" />
      <NodeHeader icon={Database} title="Google Drive/Sheets" gradient="from-green-500 to-emerald-600" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700">{data.label || 'データを保存・取得'}</div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">アクション</label>
          <select 
            className="w-full text-xs p-1.5 border border-green-200 rounded-md bg-green-50 text-green-700 focus:outline-none focus:border-green-400 cursor-pointer font-medium"
            defaultValue={data.action || 'read-sheet'}
            onChange={(e) => {}}
          >
            <option value="read-sheet">スプレッドシートから取得</option>
            <option value="write-sheet">スプレッドシートへ追記</option>
            <option value="upload-drive">Driveへファイル保存</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">ファイルURL / ID</label>
          <input 
            type="text" 
            placeholder="https://docs.google.com/..." 
            className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-green-500"
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
    <div className="bg-white border-2 border-blue-400 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <NodeHeader icon={Calendar} title="Google Calendar" gradient="from-blue-400 to-indigo-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700">{data.label || '指定イベントで実行開始'}</div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">フックするイベント条件</label>
          <select 
            className="w-full text-xs p-1.5 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:outline-none focus:border-blue-400 cursor-pointer font-medium"
            defaultValue={data.eventTrigger || 'event-start'}
            onChange={(e) => {}}
          >
            <option value="event-start">📅 予定の開始時刻</option>
            <option value="event-end">📅 予定の終了時刻</option>
            <option value="event-created">📅 新規予定が作成された時</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">カレンダー / キーワード指定</label>
          <input 
            type="text" 
            placeholder="例: 会議, #sns, 重要な予定" 
            className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-400"
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
    <div className="bg-white border-2 border-emerald-400 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white" />
      <NodeHeader icon={FileText} title="Google Docs" gradient="from-emerald-400 to-teal-500" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700">{data.label || 'ドキュメント操作'}</div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">アクション</label>
          <select 
            className="w-full text-xs p-1.5 border border-emerald-200 rounded-md bg-emerald-50 text-emerald-700 focus:outline-none focus:border-emerald-400 cursor-pointer font-medium"
            defaultValue={data.action || 'create-doc'}
          >
            <option value="create-doc">新規作成・追記</option>
            <option value="read-doc">ドキュメントを読み取り</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">ドキュメントURL / ID</label>
          <input 
            type="text" 
            placeholder="新規作成時は空欄" 
            className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-emerald-400"
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
    <div className="bg-white border-2 border-emerald-500 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl relative">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white" />
      <NodeHeader icon={FileText} title="noteに投稿" gradient="from-emerald-500 to-green-600" nodeId={id} />
      <div className="absolute top-2 right-10 bg-slate-800 text-white text-[8px] px-1.5 py-0.5 rounded font-bold shadow-sm">
        Coming Soon
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700">{data.label || 'note記事作成'}</div>
        <div className="opacity-70">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 font-semibold uppercase">タイトル</label>
            <input 
              type="text" 
              placeholder="生成されたタイトル" 
              className="w-full text-xs p-2 border border-slate-200 rounded-md cursor-not-allowed bg-slate-50"
              disabled
            />
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <label className="text-[10px] text-slate-500 font-semibold uppercase">ハッシュタグ</label>
            <input 
              type="text" 
              placeholder="#note #AI" 
              className="w-full text-xs p-2 border border-slate-200 rounded-md cursor-not-allowed bg-slate-50"
              disabled
            />
          </div>
        </div>
        <div className="mt-1 flex flex-col gap-2">
          <div className="text-[10px] text-slate-500 font-semibold bg-slate-100 p-1.5 rounded border border-slate-200 text-center">
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
    <div className="bg-white border-2 border-slate-900 rounded-xl shadow-lg min-w-[260px] overflow-hidden transition-shadow hover:shadow-xl relative">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white" />
      <NodeHeader icon={Music} title="TikTokに投稿" gradient="from-slate-800 to-slate-900" nodeId={id} />
      <div className="p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-700">{data.label || 'ショート動画を投稿'}</div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">投稿タイプ</label>
          <select 
            className="w-full text-xs p-1.5 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none cursor-pointer font-medium"
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
          body: JSON.stringify({ type: 'text', prompt: finalPrompt, model: "meta-llama/llama-3.3-70b-instruct:free" }),
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
    <div className="bg-white border-2 border-purple-400 rounded-xl shadow-lg min-w-[280px] max-w-[340px] overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white" />
      <NodeHeader icon={IconComponent} title={data.label || 'カスタムノード'} gradient="from-purple-400 to-purple-600" nodeId={id} />
      
      <div className="p-4 flex flex-col gap-3">
        {/* 入力フォーム群の構築 */}
        {inputs.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-500 font-semibold uppercase">入力パラメータ</label>
            {inputs.map((input: any) => (
              <input
                key={input.id}
                type={input.type === 'number' ? 'number' : 'text'}
                placeholder={`${input.name} を入力`}
                value={inputValues[input.id] || ''}
                onChange={(e) => setInputValues({ ...inputValues, [input.id]: e.target.value })}
                className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-purple-400"
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
          <div className="mt-2 bg-slate-50 border border-slate-200 rounded-md p-2.5">
            <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex justify-between items-center">
              <span>{outputs[0]?.name || '出力結果'}</span>
              <span className="bg-white px-1 border border-slate-200 rounded text-[9px]">Text</span>
            </div>
            <div className="text-xs text-slate-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
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
