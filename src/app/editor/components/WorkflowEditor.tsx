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
  PreviewNode, DynamicCustomNode, TextInputNode, ImageInputNode, VideoInputNode
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
}

export default function WorkflowEditor({ initialNodes: propNodes, initialEdges: propEdges }: WorkflowEditorProps = {}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(propNodes && propNodes.length > 0 ? propNodes : initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(propEdges && propEdges.length > 0 ? propEdges : initialEdges);
  const { screenToFlowPosition } = useReactFlow();

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
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950" ref={reactFlowWrapper}>
      <div className="flex-1 w-full h-full border-t border-slate-200 dark:border-slate-700">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
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
