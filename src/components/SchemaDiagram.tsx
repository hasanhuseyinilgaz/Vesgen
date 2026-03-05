import { useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  ControlButton,
  BackgroundVariant,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { Maximize2 } from "lucide-react";
import "@xyflow/react/dist/style.css";
import TableNode from "@/components/TableNode";

const nodeTypes = {
  tableNode: TableNode,
};

function AutoFitter({ nodes }: { nodes: Node[] }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.3, duration: 800 });
      }, 200);
    }
  }, [nodes, fitView]);
  return null;
}

interface SchemaDiagramProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onFullScreen?: () => void;
}

export default function SchemaDiagram(props: SchemaDiagramProps) {
  return (
    <ReactFlowProvider>
      <style>
        {`
          .react-flow__controls-button {
            background-color: hsl(var(--card)) !important;
            border-bottom: 1px solid hsl(var(--border)) !important;
            fill: hsl(var(--foreground)) !important;
            color: hsl(var(--foreground)) !important;
          }
          .react-flow__controls-button:hover {
            background-color: hsl(var(--muted)) !important;
          }
          .react-flow__controls-button svg {
            fill: currentColor !important;
          }
          .react-flow__controls {
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
            border: 1px solid hsl(var(--border)) !important;
            border-radius: 8px !important;
            overflow: hidden !important;
          }
        `}
      </style>
      <SchemaDiagramInner {...props} />
    </ReactFlowProvider>
  );
}

function SchemaDiagramInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onFullScreen,
}: SchemaDiagramProps) {
  return (
    <div className="w-full h-full min-h-[500px] bg-muted/5 rounded-xl border-2 border-border overflow-hidden relative group">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.05}
        maxZoom={1.5}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: "hsl(var(--primary))", strokeWidth: 3 },
          labelStyle: {
            fill: "hsl(var(--foreground))",
            fontWeight: 800,
            fontSize: 10,
          },
          labelBgStyle: {
            fill: "hsl(var(--card))",
            stroke: "hsl(var(--border))",
            strokeWidth: 1.5,
            fillOpacity: 1,
          },
          labelBgPadding: [10, 6],
          labelBgBorderRadius: 8,
        }}
      >
        <Background
          color="hsl(var(--border))"
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
        />
        <AutoFitter nodes={nodes} />

        <Controls showInteractive={false}>
          {onFullScreen && (
            <ControlButton onClick={onFullScreen} title="Tam Ekranda Aç">
              <Maximize2 className="w-4 h-4" />
            </ControlButton>
          )}
        </Controls>
      </ReactFlow>
    </div>
  );
}
