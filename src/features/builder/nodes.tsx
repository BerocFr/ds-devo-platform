import { BaseEdge, EdgeLabelRenderer, Handle, Position, getBezierPath, type EdgeProps, type Node, type NodeProps, type Edge } from '@xyflow/react';
import { AlertTriangle, CircleAlert, Flag, Lightbulb, MonitorSmartphone, Play } from 'lucide-react';
import { memo, useState } from 'react';
import type { JourneyEdge, JourneyNode } from '../../domain/types';
import { DsScope, ScreenRender, isWideScreen } from '../../ds/Renderer';
import { usePlatform } from '../../store/store';

export const COMPONENT_MIME = 'application/x-atelier-component';
export const BLOCK_MIME = 'application/x-atelier-block';

export type JNodeData = {
  node: JourneyNode;
  errors: number;
  warnings: number;
  onDropComponent: (nodeId: string, componentId: string) => void;
};
export type JFlowNode = Node<JNodeData, 'screen' | 'decision' | 'start' | 'outcome'>;

export type JEdgeData = { edge: JourneyEdge; isLoop: boolean; onSelect: (edgeId: string) => void };
export type JFlowEdge = Edge<JEdgeData, 'journey'>;

function IssueFoot({ errors, warnings, insights, extra }: { errors: number; warnings: number; insights: number; extra?: string }) {
  return (
    <div className="jnode-foot">
      <span className="hstack" style={{ gap: 4 }} title={`${insights} linked insight${insights === 1 ? '' : 's'}`}>
        <Lightbulb size={12} aria-hidden />
        {insights}
        <span className="sr-only"> linked insights</span>
      </span>
      {extra ? <span>{extra}</span> : null}
      <span className="grow" />
      {errors ? (
        <span className="issue-pip error" title={`${errors} error${errors > 1 ? 's' : ''}`}>
          <CircleAlert size={12} aria-hidden />
          {errors}
          <span className="sr-only"> errors</span>
        </span>
      ) : null}
      {warnings ? (
        <span className="issue-pip warning" title={`${warnings} warning${warnings > 1 ? 's' : ''}`}>
          <AlertTriangle size={12} aria-hidden />
          {warnings}
          <span className="sr-only"> warnings</span>
        </span>
      ) : null}
    </div>
  );
}

export const ScreenNode = memo(function ScreenNode({ data, selected }: NodeProps<JFlowNode>) {
  const components = usePlatform((s) => s.data.components);
  const tokens = usePlatform((s) => s.data.tokens);
  const [over, setOver] = useState(false);
  const n = data.node;
  const wide = isWideScreen(n.components, components);
  const scale = wide ? 0.25 : 0.5;
  const width = wide ? 816 : 408;
  return (
    <div
      className={`jnode screen ${selected ? 'selected' : ''} ${over ? 'dropping' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(COMPONENT_MIME)) {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(COMPONENT_MIME);
        setOver(false);
        if (id) {
          e.preventDefault();
          e.stopPropagation();
          data.onDropComponent(n.id, id);
        }
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="jnode-head">
        <span className="jnode-kind" aria-hidden>
          <MonitorSmartphone size={13} />
        </span>
        <span className="jnode-title">{n.title}</span>
      </div>
      <div className="thumb-frame" aria-hidden>
        {n.components.length ? (
          <DsScope tokens={tokens} className="ds-thumb" style={{ width, transform: `scale(${scale})` }}>
            <ScreenRender instances={n.components} components={components} mode="thumb" />
          </DsScope>
        ) : (
          <div className="thumb-empty">Drop components from the library here</div>
        )}
      </div>
      <IssueFoot errors={data.errors} warnings={data.warnings} insights={n.insightIds.length} extra={`${n.components.length} comp.`} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

export const DecisionNode = memo(function DecisionNode({ data, selected }: NodeProps<JFlowNode>) {
  const n = data.node;
  return (
    <div className={`jnode decision ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="jnode-head">
        <span className="jnode-kind" aria-hidden>
          <span className="diamond" />
        </span>
        <span className="jnode-title">{n.title}</span>
      </div>
      {n.question ? <div className="q">{n.question}</div> : null}
      <IssueFoot errors={data.errors} warnings={data.warnings} insights={n.insightIds.length} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

export const StartNode = memo(function StartNode({ data, selected }: NodeProps<JFlowNode>) {
  return (
    <div className={`jnode terminal start ${selected ? 'selected' : ''}`} title={data.node.description}>
      <div className="jnode-head">
        <span className="jnode-kind" aria-hidden>
          <Play size={13} />
        </span>
        <span className="jnode-title">{data.node.title}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

export const OutcomeNode = memo(function OutcomeNode({ data, selected }: NodeProps<JFlowNode>) {
  const n = data.node;
  return (
    <div className={`jnode terminal outcome ${n.tone ?? 'neutral'} ${selected ? 'selected' : ''}`} title={n.description}>
      <Handle type="target" position={Position.Left} />
      <div className="jnode-head">
        <span className="jnode-kind" aria-hidden>
          <Flag size={13} />
        </span>
        <span className="jnode-title">{n.title}</span>
        {data.errors ? <CircleAlert size={13} color="var(--c-danger)" aria-label={`${data.errors} errors`} /> : null}
      </div>
    </div>
  );
});

export const nodeTypes = { screen: ScreenNode, decision: DecisionNode, start: StartNode, outcome: OutcomeNode };

export const JourneyEdgeView = memo(function JourneyEdgeView(props: EdgeProps<JFlowEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected, markerEnd } = props;
  const e = data!.edge;
  let path: string;
  let lx: number;
  let ly: number;
  if (data!.isLoop) {
    path = `M ${sourceX} ${sourceY} C ${sourceX + 80} ${sourceY - 170}, ${targetX - 80} ${targetY - 170}, ${targetX} ${targetY}`;
    lx = (sourceX + targetX) / 2;
    ly = Math.min(sourceY, targetY) - 128;
  } else {
    [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  }
  const cls = ['edge-label', e.kind === 'alternative' ? 'alt' : '', e.condition ? 'cond' : '', selected ? 'selected' : ''].join(' ');
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={18} />
      {e.label ? (
        <EdgeLabelRenderer>
          <div className={`${cls} nodrag nopan`} style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }} title={e.condition ? `When ${e.condition}` : e.label} onClick={() => data!.onSelect(e.id)}>
            {e.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});

export const edgeTypes = { journey: JourneyEdgeView };
