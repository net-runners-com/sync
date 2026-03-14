"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  NodeTypes,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { 
  TriggerNode, TextAiNode, ImageAiNode, SocialActionNode, VideoAiNode, 
  AnalyzerNode, IfElseNode, PostGenerationAiNode, DriveNode, GoogleCalendarNode,
  PreviewNode, DynamicCustomNode, TextInputNode, ImageInputNode, VideoInputNode,
  GroupNode, StickyNoteNode
} from "./CustomNodes";
import CustomEdge from "./CustomEdge";

// カスタムノードの登録
const nodeTypes: NodeTypes = {
  triggerNode: TriggerNode,
  textAiNode: TextAiNode,
  imageAiNode: ImageAiNode,
  videoAiNode: VideoAiNode,
  analyzerNode: AnalyzerNode,
  ifElseNode: IfElseNode,
  socialActionNode: SocialActionNode,
  postGenNode: PostGenerationAiNode,
  driveNode: DriveNode,
  calendarNode: GoogleCalendarNode,
  previewNode: PreviewNode,
  dynamicCustomNode: DynamicCustomNode,
  textInputNode: TextInputNode,
  imageInputNode: ImageInputNode,
  videoInputNode: VideoInputNode,
  groupNode: GroupNode,
  stickyNoteNode: StickyNoteNode,
};

// カスタムエッジの登録
const edgeTypes = {
  custom: CustomEdge,
};

const initialNodes = [
  {
    id: "1",
    type: "triggerNode",
    data: { label: "毎日 08:00" },
    position: { x: 400, y: 0 },
  },
  {
    id: "2",
    type: "textAiNode",
    data: { label: "トレンドニュースを要約", model: "Claude 3.5 Sonnet" },
    position: { x: 400, y: 130 },
  },
  {
    id: "3",
    type: "analyzerNode",
    data: { label: "ポジネガ判定", analysisType: "感情スコア" },
    position: { x: 400, y: 280 },
  },
  {
    id: "4",
    type: "ifElseNode",
    data: { label: "ポジティブ判定", condition: "sentiment > 0.7" },
    position: { x: 400, y: 430 },
  },
  {
    id: "5",
    type: "imageAiNode",
    data: { label: "ポジティブ画像を生成", size: "1024x1024" },
    position: { x: 200, y: 600 },
  },
  {
    id: "6",
    type: "socialActionNode",
    data: { label: "ポジティブ投稿", platform: "x", platformName: "X (Twitter)" },
    position: { x: 200, y: 760 },
  },
  {
    id: "7",
    type: "socialActionNode",
    data: { label: "テキストのみ投稿", platform: "instagram", platformName: "Instagram" },
    position: { x: 600, y: 600 },
  },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", type: "custom", animated: true },
  { id: "e2-3", source: "2", target: "3", type: "custom", animated: true },
  { id: "e3-4", source: "3", target: "4", type: "custom", animated: true },
  { id: "e4-5", source: "4", target: "5", sourceHandle: "true", type: "custom", animated: true, style: { stroke: '#22c55e' } },
  { id: "e5-6", source: "5", target: "6", type: "custom", animated: true },
  { id: "e4-7", source: "4", target: "7", sourceHandle: "false", type: "custom", animated: true, style: { stroke: '#ef4444' } },
];

interface WorkflowEditorProps {
  initialNodes?: any[];
  initialEdges?: Edge[];
  isExecuting?: boolean;
  executingNodeIds?: string[];
  completedNodeIds?: string[];
}

import { Group } from "lucide-react";

export default function WorkflowEditor({
  initialNodes: propNodes,
  initialEdges: propEdges,
  isExecuting = false,
  executingNodeIds = [],
  completedNodeIds = [],
}: WorkflowEditorProps = {}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(propNodes && propNodes.length > 0 ? propNodes : initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(propEdges && propEdges.length > 0 ? propEdges : initialEdges);
  const { screenToFlowPosition, getNodes } = useReactFlow();
  
  // 選択されているノードを保持 (GroupNode は除外)
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  // Selection change を監視して独自stateに反映 (onSelectionChangeコールバック用)
  const onSelectionChange = useCallback(({ nodes: selected }: { nodes: any[] }) => {
    setSelectedNodes(
      selected
        .filter((n) => n.type !== "groupNode")
        .map((n) => n.id)
    );
  }, []);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, type: 'custom', animated: true }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeDataRaw = event.dataTransfer.getData('application/reactflow');

      if (typeof nodeDataRaw === 'undefined' || !nodeDataRaw || !reactFlowBounds) {
        return;
      }

      const nodeData = JSON.parse(nodeDataRaw);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `dndnode_${Date.now()}`,
        type: nodeData.type,
        position,
        data: { label: nodeData.label, ...nodeData },
        style: nodeData.type === 'groupNode' ? { width: 400, height: 300 } : undefined,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  // 選択されたノード群を GroupNode で囲む処理
  const handleGroupSelection = () => {
    if (selectedNodes.length === 0) return;

    const currentNodes = getNodes();
    const targetNodes = currentNodes.filter((n) => selectedNodes.includes(n.id));

    if (targetNodes.length === 0) return;

    // 選択ノード群を囲む Bounding Box を計算
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    targetNodes.forEach((node) => {
      // position は親 (または絶対座標)
      const x = node.position.x;
      const y = node.position.y;
      const w = node.measured?.width || 250;
      const h = node.measured?.height || 100;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    });

    // パディングを追加して GroupNode の座標とサイズを決定
    const padding = 50;
    const groupX = minX - padding;
    const groupY = minY - padding - 40; // ヘッダー分多めに
    const groupW = (maxX - minX) + padding * 2;
    const groupH = (maxY - minY) + padding * 2 + 40;

    const groupId = `group_${Date.now()}`;

    // 新規グループノード
    const newGroupNode = {
      id: groupId,
      type: "groupNode",
      position: { x: groupX, y: groupY },
      style: { width: groupW, height: groupH },
      data: { label: "新しいグループ" },
      zIndex: -1, // 背面に配置
    };

    // 既存ノードをグループの子要素に変更し、相対座標に変換
    setNodes((nds) => {
      const updatedNodes = nds.map((n) => {
        if (selectedNodes.includes(n.id)) {
          return {
            ...n,
            parentId: groupId,
            extent: 'parent' as const,
            position: {
              x: n.position.x - groupX,
              y: n.position.y - groupY,
            },
          };
        }
        return n;
      });

      // GroupNode自身を末尾(または先頭)に追加
      return [newGroupNode, ...updatedNodes];
    });

    setSelectedNodes([]); // 選択解除
  };

  // 実行中の視覚的なハイライトを適用
  const styledNodes = nodes.map((node) => {
    const isRunning = executingNodeIds.includes(node.id);
    const isDone = completedNodeIds.includes(node.id);
    return {
      ...node,
      style: {
        ...node.style,
        ...(isRunning ? {
          boxShadow: '0 0 0 3px #3b82f6, 0 0 20px rgba(59,130,246,0.5)',
          borderRadius: '12px',
          transition: 'box-shadow 0.3s ease',
        } : isDone ? {
          boxShadow: '0 0 0 3px #22c55e, 0 0 12px rgba(34,197,94,0.4)',
          borderRadius: '12px',
          transition: 'box-shadow 0.3s ease',
        } : isExecuting ? {
          opacity: 0.6,
          transition: 'opacity 0.3s ease',
        } : {}),
      },
    };
  });

  const styledEdges = edges.map((edge) => {
    return {
      ...edge,
      animated: isExecuting ? true : edge.animated,
      style: {
        ...edge.style,
        ...(isExecuting ? {
          stroke: edge.style?.stroke || '#3b82f6',
          strokeWidth: 2,
        } : {}),
      },
    };
  });

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 relative" ref={reactFlowWrapper}>
      {isExecuting && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg animate-pulse flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-ping inline-block" />
          ワークフローを実行中...
        </div>
      )}

      {/* 選択ツールバー (複数ノード選択時) */}
      {selectedNodes.length >= 2 && !isExecuting && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl shadow-xl animate-in slide-in-from-top-4">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 px-3 border-r border-slate-200 dark:border-slate-700">
            {selectedNodes.length} ノードを選択中
          </span>
          <button
            onClick={handleGroupSelection}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors"
          >
            <Group size={16} />
            グループ化する
          </button>
        </div>
      )}

      <div className="flex-1 w-full h-full border-t border-slate-200 dark:border-slate-700">
        <ReactFlow
          nodes={styledNodes}
          edges={styledEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.type) {
                case 'triggerNode': return '#3b82f6';
                case 'textAiNode': return '#a855f7';
                case 'imageAiNode': return '#d946ef';
                case 'videoAiNode': return '#f43f5e';
                case 'analyzerNode': return '#14b8a6';
                case 'ifElseNode': return '#f59e0b';
                case 'socialActionNode': return '#0f172a';
                case 'postGenNode': return '#6366f1';
                case 'driveNode': return '#22c55e';
                case 'calendarNode': return '#60a5fa';
                case 'textInputNode': return '#0ea5e9';
                case 'imageInputNode': return '#8b5cf6';
                case 'videoInputNode': return '#f97316';
                case 'groupNode': return '#cbd5e1';
                default: return '#eee';
              }
            }}
          />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}

