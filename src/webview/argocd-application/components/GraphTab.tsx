import React from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
    type Edge,
    type Node
} from '@xyflow/react';
import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import { ArgoCDApplication } from '../../../types/argocd';
import { ResourceGraphNodeTile } from '../graph/ResourceGraphNodeTile';
import { GraphInteractionProvider, type GraphInteractionContextValue } from '../graph/GraphInteractionContext';
import {
    createEmptyLayoutCache,
    mergeGraphFlowState,
    type GraphLayoutCache
} from '../graph/mergeGraphFlowState';
import type { GraphNodeData } from '../graph/types';
import { GraphTopologyAffordances } from '../graph/GraphTopologyAffordances';
import { ARGOCD_APP_PANEL_IDS } from '../graph/tabBarA11y';
import {
    graphZoomAnimationDuration,
    usePrefersReducedMotion
} from '../graph/usePrefersReducedMotion';

interface GraphTabProps {
    application: ArgoCDApplication;
    resourceGraph: ApplicationResourceGraph | null;
    graphInteraction: GraphInteractionContextValue;
    panelId?: string;
    labelledBy?: string;
    className?: string;
}

const nodeTypes = {
    resourceGraph: ResourceGraphNodeTile
};

const placeholderStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '240px',
    padding: '40px 20px',
    color: 'var(--vscode-descriptionForeground)',
    fontSize: '13px',
    fontFamily: 'var(--vscode-font-family)',
    textAlign: 'center',
    gap: '8px'
};

interface GraphCanvasProps {
    application: ArgoCDApplication;
    resourceGraph: ApplicationResourceGraph;
    graphInteraction: GraphInteractionContextValue;
}

function GraphToolbar({
    onZoomIn,
    onZoomOut,
    onFitView
}: {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitView: () => void;
}): React.JSX.Element {
    return (
        <div className="argocd-graph-toolbar" data-testid="graph-toolbar">
            <button
                type="button"
                className="argocd-graph-toolbar__button"
                title="Zoom in"
                aria-label="Zoom in"
                onClick={onZoomIn}
            >
                +
            </button>
            <button
                type="button"
                className="argocd-graph-toolbar__button"
                title="Zoom out"
                aria-label="Zoom out"
                onClick={onZoomOut}
            >
                −
            </button>
            <button
                type="button"
                className="argocd-graph-toolbar__button"
                title="Fit graph to view"
                aria-label="Fit graph to view"
                onClick={onFitView}
            >
                Fit
            </button>
        </div>
    );
}

function GraphCanvas({ application, resourceGraph, graphInteraction }: GraphCanvasProps): React.JSX.Element {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const prefersReducedMotion = usePrefersReducedMotion();
    const zoomDuration = graphZoomAnimationDuration(prefersReducedMotion);
    const layoutCacheRef = React.useRef<GraphLayoutCache>(createEmptyLayoutCache());
    const [nodes, setNodes] = React.useState<Node<GraphNodeData>[]>([]);
    const [edges, setEdges] = React.useState<Edge[]>([]);
    const managedNodeCount = resourceGraph.nodes.filter((node) => node.role === 'managed_resource').length;

    const applyGraph = React.useCallback(
        (graph: ApplicationResourceGraph, options?: { explicitFitView?: boolean; autoFit?: boolean }) => {
            const merged = mergeGraphFlowState({
                graph,
                cache: layoutCacheRef.current,
                explicitFitView: options?.explicitFitView ?? false
            });
            layoutCacheRef.current = merged.cache;
            setNodes(merged.nodes);
            setEdges(merged.edges);

            if (options?.autoFit ?? merged.shouldAutoFit) {
                window.requestAnimationFrame(() => {
                    fitView({ padding: 0.2, duration: zoomDuration });
                });
            }
        },
        [fitView, zoomDuration]
    );

    React.useEffect(() => {
        applyGraph(resourceGraph);
    }, [applyGraph, resourceGraph]);

    const handleFitView = React.useCallback(() => {
        applyGraph(resourceGraph, { explicitFitView: true, autoFit: true });
    }, [applyGraph, resourceGraph]);

    return (
        <div className="argocd-graph-tab" data-testid="graph-tab-canvas">
            {graphInteraction.actionNotice && (
                <div className="argocd-graph-action-notice" role="status">
                    <span>{graphInteraction.actionNotice}</span>
                    <button
                        type="button"
                        className="argocd-graph-action-notice__dismiss"
                        aria-label="Dismiss"
                        onClick={graphInteraction.onDismissActionNotice}
                    >
                        <span className="codicon codicon-close" aria-hidden="true" />
                    </button>
                </div>
            )}
            <GraphToolbar
                onZoomIn={() => zoomIn({ duration: zoomDuration })}
                onZoomOut={() => zoomOut({ duration: zoomDuration })}
                onFitView={handleFitView}
            />
            <GraphTopologyAffordances resourceGraph={resourceGraph} />
            <div className="argocd-graph-canvas">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable
                    panOnDrag
                    zoomOnScroll
                    fitView={false}
                    proOptions={{ hideAttribution: true }}
                    defaultEdgeOptions={{ className: 'argocd-graph-edge' }}
                />
                {managedNodeCount === 0 && (
                    <div className="argocd-graph-empty-banner" data-testid="graph-empty-banner">
                        No managed resources for {application.name}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Interactive React Flow canvas for the Argo CD Application resource graph.
 */
export function GraphTab({
    application,
    resourceGraph,
    graphInteraction,
    panelId = ARGOCD_APP_PANEL_IDS.graph,
    labelledBy,
    className
}: GraphTabProps): React.JSX.Element {
    if (!resourceGraph) {
        return (
            <div
                className={['argocd-graph-tab', 'argocd-graph-tab--placeholder', className].filter(Boolean).join(' ')}
                data-testid="graph-tab-placeholder"
                role="tabpanel"
                id={panelId}
                aria-labelledby={labelledBy}
            >
                <div style={placeholderStyle}>
                    <span>Graph loading…</span>
                    <span style={{ fontSize: '12px' }}>Waiting for resource graph from {application.name}</span>
                </div>
            </div>
        );
    }

    const rootClass = ['argocd-graph-tab', className].filter(Boolean).join(' ');

    return (
        <div
            id={panelId}
            className={rootClass}
            role="tabpanel"
            aria-labelledby={labelledBy}
        >
            <GraphInteractionProvider value={graphInteraction}>
                <ReactFlowProvider>
                    <GraphCanvas
                        application={application}
                        resourceGraph={resourceGraph}
                        graphInteraction={graphInteraction}
                    />
                </ReactFlowProvider>
            </GraphInteractionProvider>
        </div>
    );
}
