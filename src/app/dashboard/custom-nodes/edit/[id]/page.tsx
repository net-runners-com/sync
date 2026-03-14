"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Settings, Box, Play, Layout, AlignLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NodeInput {
  id: string;
  name: string;
  type: "text" | "image" | "number";
}

interface NodeOutput {
  id: string;
  name: string;
  type: "text" | "image" | "json";
}

interface NodeConfig {
  inputs: NodeInput[];
  outputs: NodeOutput[];
  type: "AI_PROMPT" | "API_REQUEST";
  systemPrompt?: string; // AIノード用
  apiUrl?: string;       // APIノード用
}

interface CustomNode {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  isPublic: boolean;
  config: NodeConfig;
}

export default function CustomNodeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  
  const [node, setNode] = useState<CustomNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNode();
  }, [unwrappedParams.id]);

  const fetchNode = async () => {
    try {
      const res = await fetch(`/api/custom-nodes/${unwrappedParams.id}`);
      if (!res.ok) {
        if (res.status === 404) router.push("/dashboard/custom-nodes");
        throw new Error("Fetch failed");
      }
      const data = await res.json();
      
      // Config の初期値補完
      const config = data.config || {};
      data.config = {
        inputs: config.inputs || [],
        outputs: config.outputs || [{ id: "out-1", name: "Result", type: "text" }],
        type: config.type || "AI_PROMPT",
        systemPrompt: config.systemPrompt || "あなたは優秀なアシスタントです。入力パラメータを元に回答を生成してください。",
        apiUrl: config.apiUrl || "",
      };
      
      setNode(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!node) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/custom-nodes/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: node.name,
          description: node.description,
          icon: node.icon,
          config: node.config,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("保存しました");
    } catch (error) {
      console.error(error);
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const addInput = () => {
    if (!node) return;
    const newInputs = [...node.config.inputs, { id: `in-${Date.now()}`, name: "New Input", type: "text" as const }];
    setNode({ ...node, config: { ...node.config, inputs: newInputs } });
  };

  const removeInput = (id: string) => {
    if (!node) return;
    setNode({ ...node, config: { ...node.config, inputs: node.config.inputs.filter(i => i.id !== id) } });
  };

  if (loading || !node) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 text-slate-400">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard/custom-nodes")}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              カスタムノードビルダー
            </h1>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors shadow-sm"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          保存する
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          
          {/* 基本設定 */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Settings className="text-slate-400" size={20} />
              基本設定
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ノード名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={node.name}
                  onChange={(e) => setNode({ ...node, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">説明</label>
                <textarea
                  value={node.description || ""}
                  onChange={(e) => setNode({ ...node, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                  placeholder="このノードが何を行うのか説明を入力..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">アイコン</label>
                <div className="flex gap-3">
                  {["Box", "Play", "AlignLeft", "Layout"].map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNode({ ...node, icon })}
                      className={`p-3 rounded-xl border-2 transition-colors ${
                        node.icon === icon 
                          ? "border-purple-500 bg-purple-50 text-purple-600" 
                          : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {icon === "Box" && <Box size={24} />}
                      {icon === "Play" && <Play size={24} />}
                      {icon === "AlignLeft" && <AlignLeft size={24} />}
                      {icon === "Layout" && <Layout size={24} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 入出力パラメータ */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6">入出力定義</h2>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-700 text-sm">入力 (Inputs)</h3>
                  <button onClick={addInput} className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium bg-purple-50 px-2 py-1 rounded-lg">
                    <Plus size={12} /> 追加
                  </button>
                </div>
                {node.config.inputs.length === 0 ? (
                  <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-xl text-center border border-dashed border-slate-200">入力はありません</p>
                ) : (
                  <div className="space-y-3">
                    {node.config.inputs.map((input, idx) => (
                      <div key={input.id} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <input
                          type="text"
                          value={input.name}
                          onChange={(e) => {
                            const newInputs = [...node.config.inputs];
                            newInputs[idx].name = e.target.value;
                            setNode({ ...node, config: { ...node.config, inputs: newInputs }});
                          }}
                          className="flex-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm"
                          placeholder="変数名 (例: inputText)"
                        />
                        <select
                          value={input.type}
                          onChange={(e) => {
                            const newInputs = [...node.config.inputs];
                            newInputs[idx].type = e.target.value as any;
                            setNode({ ...node, config: { ...node.config, inputs: newInputs }});
                          }}
                          className="bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-sm w-28"
                        >
                          <option value="text">Text</option>
                          <option value="image">Image</option>
                          <option value="number">Number</option>
                        </select>
                        <button onClick={() => removeInput(input.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 text-sm mb-3">出力 (Outputs)</h3>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 px-2">{node.config.outputs[0]?.name || "Result"}</span>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-md">Text</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">※現在は単一のテキスト出力のみサポートされています</p>
              </div>
            </section>

            {/* ロジック構成 */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6">内部ロジック</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ノードタイプ</label>
                <select
                  value={node.config.type}
                  onChange={(e) => setNode({ ...node, config: { ...node.config, type: e.target.value as "AI_PROMPT" | "API_REQUEST" } })}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="AI_PROMPT">AIテキストプロンプト処理</option>
                  <option value="API_REQUEST">外部APIリクエスト (予定)</option>
                </select>
              </div>

              {node.config.type === "AI_PROMPT" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                    システムプロンプト
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    ユーザーが実行時に提供した値（Input）に対して、このノードのAIが背後でどのように振る舞うかを定義します。
                  </p>
                  <textarea
                    value={node.config.systemPrompt}
                    onChange={(e) => setNode({ ...node, config: { ...node.config, systemPrompt: e.target.value } })}
                    rows={8}
                    className="w-full px-4 py-3 bg-slate-900 text-green-400 font-mono text-sm border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="あなたは翻訳家です..."
                  />
                  <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl p-3">
                    <p className="text-xs text-purple-700 font-medium mb-1">💡 変数の使い方</p>
                    <p className="text-xs text-purple-600">
                      入力として定義した <code className="bg-purple-100 px-1 rounded">{"{{"}</code> と <code className="bg-purple-100 px-1 rounded">{"}}"}</code> で囲まれた変数は、後ほどエディタ上で値が展開されます。
                      <br/>例: <code>「{"{{"}{node.config.inputs[0]?.name || 'inputText'}{"}}"}」を英語に翻訳して</code>
                    </p>
                  </div>
                </div>
              )}

              {node.config.type === "API_REQUEST" && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Box size={32} className="mb-3 opacity-50" />
                  <p className="font-medium">APIサポートは準備中です</p>
                  <p className="text-xs mt-1">外部連携機能のリリースをお待ちください</p>
                </div>
              )}
            </section>
          </div>
          
        </div>
      </main>
    </div>
  );
}
