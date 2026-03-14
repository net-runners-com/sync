"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Clock, MessageSquare, Image as ImageIcon, Twitter, Instagram, 
  PackageOpen, GitBranch, Video, BarChart3, Facebook, Calendar, PenTool, Database, Box, Play, AlignLeft, Layout,
  ChevronDown, ChevronRight, FileText, Music
} from "lucide-react";

interface CustomNode {
  id: string;
  name: string;
  icon: string | null;
  config: any;
}

export default function Sidebar() {
  const [customNodes, setCustomNodes] = useState<CustomNode[]>([]);
  
  const [openSections, setOpenSections] = useState({
    input: true,
    trigger: true,
    ai: true,
    data: true,
    logic: true,
    sns: true,
    custom: true
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    // 自分のおよび公開されているカスタムノード一覧を取得
    const fetchNodes = async () => {
      try {
        const res = await fetch("/api/market/workflows"); 
        // Note: 実際は自分＋Publicのカスタムノード取得用のAPIを叩くべきだが、一旦 /api/custom-nodes は自身のみ取得する仕様になっているので、全て取得できるAPIを新設するか一旦自分のものだけ取得します。
        // ここでは自分のカスタムノード + Publicという要件のため、新設したAPI等の仕様に基づき一旦 /api/custom-nodes を叩きます。
        const resCustom = await fetch("/api/custom-nodes");
        if (resCustom.ok) {
          const data = await resCustom.json();
          setCustomNodes(data);
        }
      } catch (e) {
        console.error("Failed to fetch custom nodes", e);
      }
    };
    fetchNodes();
  }, []);
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string, specialData: any = {}) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label, ...specialData }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-72 border-r bg-white dark:bg-slate-950 p-4 border-slate-200 dark:border-slate-800 flex flex-col shadow-sm z-10 overflow-y-auto">
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
          S
        </div>
        <div>
          <span className="font-bold text-lg text-slate-800 dark:text-slate-100 block leading-tight">Sync</span>
          <span className="text-[10px] text-slate-400">ワークフローエディタ</span>
        </div>
      </div>

      <div className="flex-1 space-y-5">
        {/* ユーザー入力 */}
        <div>
          <button 
            onClick={() => toggleSection('input')}
            className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-2 hover:text-slate-600 transition-colors"
          >
            <span>ユーザー入力</span>
            {openSections.input ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {openSections.input && (
            <div className="grid gap-1.5">
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-sky-200 hover:bg-sky-50 hover:border-sky-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'textInputNode', 'テキスト入力')}
              >
                <MessageSquare size={15} className="text-sky-500" />
                テキスト入力
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-violet-200 hover:bg-violet-50 hover:border-violet-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'imageInputNode', '画像入力')}
              >
                <ImageIcon size={15} className="text-violet-500" />
                画像入力
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-orange-200 hover:bg-orange-50 hover:border-orange-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'videoInputNode', '動画入力')}
              >
                <Video size={15} className="text-orange-500" />
                動画入力
              </Button>
            </div>
          )}
        </div>

        {/* トリガー */}
        <div>
          <button 
            onClick={() => toggleSection('trigger')}
            className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-2 hover:text-slate-600 transition-colors"
          >
            <span>トリガー</span>
            {openSections.trigger ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {openSections.trigger && (
            <div className="grid gap-1.5">
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-blue-200 hover:bg-blue-50 hover:border-blue-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'triggerNode', 'スケジュール')}
              >
                <Clock size={15} className="text-blue-500" />
                スケジュール
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-blue-200 hover:bg-blue-50 hover:border-blue-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'triggerNode', 'WebHook受信')}
              >
                <PackageOpen size={15} className="text-blue-500" />
                WebHook受信
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-blue-300 hover:bg-blue-50 hover:border-blue-500 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'calendarNode', 'Google Calendar')}
              >
                <Calendar size={15} className="text-blue-600" />
                Google Calendar
              </Button>
            </div>
          )}
        </div>
        
        {/* AI / 処理 */}
        <div>
          <button 
            onClick={() => toggleSection('ai')}
            className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-2 hover:text-slate-600 transition-colors"
          >
            <span>AI / 処理</span>
            {openSections.ai ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {openSections.ai && (
            <div className="grid gap-1.5">
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-purple-200 hover:bg-purple-50 hover:border-purple-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'textAiNode', 'テキスト生成')}
              >
                <MessageSquare size={15} className="text-purple-500" />
                テキスト生成 (LLM)
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'postGenNode', '投稿生成 AI')}
              >
                <PenTool size={15} className="text-indigo-500" />
                投稿生成 (自動)
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-fuchsia-200 hover:bg-fuchsia-50 hover:border-fuchsia-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'imageAiNode', '画像生成')}
              >
                <ImageIcon size={15} className="text-fuchsia-500" />
                画像生成 (DALL-E)
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-rose-200 hover:bg-rose-50 hover:border-rose-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'videoAiNode', '動画生成')}
              >
                <Video size={15} className="text-rose-500" />
                動画生成 (Runway)
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-teal-200 hover:bg-teal-50 hover:border-teal-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'analyzerNode', '感情分析')}
              >
                <BarChart3 size={15} className="text-teal-500" />
                感情・トレンド分析
              </Button>
            </div>
          )}
        </div>

        {/* データ連携 */}
        <div>
          <button 
            onClick={() => toggleSection('data')}
            className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-2 hover:text-slate-600 transition-colors"
          >
            <span>データ連携</span>
            {openSections.data ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {openSections.data && (
            <div className="grid gap-1.5">
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-emerald-300 hover:bg-emerald-50 hover:border-emerald-500 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'googleDocsNode', 'Google Docs')}
              >
                <FileText size={15} className="text-emerald-600" />
                Google Docs
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-green-200 hover:bg-green-50 hover:border-green-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'driveNode', 'Google Drive')}
              >
                <Database size={15} className="text-green-500" />
                Google Drive / Sheets
              </Button>
            </div>
          )}
        </div>

        {/* ロジック */}
        <div>
          <button 
            onClick={() => toggleSection('logic')}
            className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-2 hover:text-slate-600 transition-colors"
          >
            <span>ロジック・プレビュー</span>
            {openSections.logic ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {openSections.logic && (
            <div className="grid gap-1.5">
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-amber-200 hover:bg-amber-50 hover:border-amber-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'ifElseNode', '条件分岐')}
              >
                <GitBranch size={15} className="text-amber-500" />
                条件分岐 (If/Else)
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'previewNode', 'AI出力プレビュー')}
              >
                <ImageIcon size={15} className="text-emerald-500" />
                AI出力プレビュー
              </Button>
            </div>
          )}
        </div>

        {/* SNS出力 */}
        <div>
          <button 
            onClick={() => toggleSection('sns')}
            className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-2 hover:text-slate-600 transition-colors"
          >
            <span>SNS出力</span>
            {openSections.sns ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {openSections.sns && (
            <div className="grid gap-1.5">
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'socialActionNode', 'Xに投稿', { platform: 'x', platformName: 'X (Twitter)' })}
              >
                <Twitter size={15} className="text-slate-800" />
                X (Twitter)
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-pink-200 hover:bg-pink-50 hover:border-pink-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'socialActionNode', 'Instagramに投稿', { platform: 'instagram', platformName: 'Instagram' })}
              >
                <Instagram size={15} className="text-pink-500" />
                Instagram
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-blue-300 hover:bg-blue-50 hover:border-blue-500 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'socialActionNode', 'Facebookに投稿', { platform: 'facebook', platformName: 'Facebook' })}
              >
                <Facebook size={15} className="text-blue-600" />
                Facebook
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-emerald-300 hover:bg-emerald-50 hover:border-emerald-500 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'noteNode', 'noteに投稿')}
              >
                <FileText size={15} className="text-emerald-600" />
                note
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 shadow-sm cursor-grab border-slate-800 hover:bg-slate-100 hover:border-slate-900 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                draggable
                onDragStart={(e) => onDragStart(e, 'tiktokNode', 'TikTokに投稿')}
              >
                <Music size={15} className="text-slate-900" />
                TikTok
              </Button>
            </div>
          )}
        </div>

        {/* カスタムノード (動的) */}
        {customNodes.length > 0 && (
          <div>
            <button 
              onClick={() => toggleSection('custom')}
              className="w-full flex items-center justify-between text-[10px] font-semibold text-purple-400 uppercase tracking-widest mb-2 px-2 hover:text-purple-600 transition-colors"
            >
              <span>カスタム</span>
              {openSections.custom ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {openSections.custom && (
              <div className="grid gap-1.5">
                {customNodes.map((node) => {
                  const IconComponent = node.icon === "Play" ? Play 
                    : node.icon === "AlignLeft" ? AlignLeft 
                    : node.icon === "Layout" ? Layout 
                    : Box;
                    
                  return (
                    <Button 
                      key={node.id}
                      variant="outline" 
                      className="justify-start gap-2 shadow-sm cursor-grab border-purple-200 hover:bg-purple-50 hover:border-purple-400 transition-all text-sm h-9 text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                      draggable
                      onDragStart={(e) => onDragStart(e, 'dynamicCustomNode', node.name, { customNodeId: node.id, config: node.config })}
                    >
                      <IconComponent size={15} className="text-purple-600" />
                      {node.name}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-[10px] text-slate-400 text-center">
          ノードをキャンバスにドラッグ
        </div>
      </div>
    </aside>
  );
}
