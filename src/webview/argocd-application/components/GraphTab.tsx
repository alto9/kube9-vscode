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
import { applyNodeSelection, resolveSelectionAfterMerge } from '../graph/graphSelection';
import type { GraphNodeData } from '../graph/types';
import {
    applicationKeyChanged,
    serializeApplicationKey,
    shouldPreserveViewport,
    type GraphViewport
} from '../graph/viewportCache';
import { GraphTopologyAffordances } from '../graph/GraphTopologyAffordances';
import { ARGOCD_APP_PANEL_IDS } from '../graph/tabBarA11y';
import {
    graphZoomAnimationDuration,
    usePrefersReducedMotion
} from '../graph/usePrefersReducedMotion';
import { GraphLoadingPlaceholder } from '../graph/GraphLoadingPlaceholder';
import { GraphLoadingOverlay } from '../graph/GraphLoadingOverlay';
import { GraphEmptyState } from '../graph/GraphEmptyState';
import { GraphErrorState } from '../graph/GraphErrorState';
import { GraphDegradationBanner } from '../graph/GraphDegradationBanner';
import { GraphAssemblyInfoBanner } from '../graph/GraphAssemblyInfoBanner';
import {
    GRAPH_ASSEMBLY_INVALID_ROW_BANNER_MESSAGE,
    shouldShowGraphAssemblyInfoBanner
} from '../graph/graphAssemblyInfoRules';
import {
    deriveGraphMerging,
    isGraphEmptyManaged,
    isGraphInitialLoad,
    shouldHideGraphTopologyAffordances,
    type GraphPresentationContext
} from '../graph/graphStatePredicates';

interface GraphTabProps {
    application: ArgoCDApplication;
    resourceGraph: ApplicationResourceGraph | null;
    graphError: string | null;
    graphDegradation: string | null;
    skippedInvalidResourceRows: boolean;
    graphMerging: boolean;
    graphInteraction: GraphInteractionContextValue;
    panelId?: string;
    labelledBy?: string;
    className?: string;
}

const nodeTypes = {
    resourceGraph: ResourceGraphNodeTile
};

interface GraphCanvasProps {
    application: ArgoCDApplication;
    resourceGraph: ApplicationResourceGraph;
    graphMerging: boolean;
    graphDegradation: string | null;
    skippedInvalidResourceRows: boolean;
    hideAffordances: boolean;
    showEmptyManaged: boolean;
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

function GraphCanvas({
    application,
    resourceGraph,
    graphMerging,
    graphDegradation,
    skippedInvalidResourceRows,
    hideAffordances,
    showEmptyManaged,
    graphInteraction
}: GraphCanvasProps): React.JSX.Element {
    const { zoomIn, zoomOut, fitView, getViewport, setViewport } = useReactFlow();
    const prefersReducedMotion = usePrefersReducedMotion();
    const zoomDuration = graphZoomAnimationDuration(prefersReducedMotion);
    const layoutCacheRef = React.useRef<GraphLayoutCache>(createEmptyLayoutCache());
    const applicationKeyRef = React.useRef<string | null>(null);
    const viewportCacheRef = React.useRef<GraphViewport | null>(null);
    const selectedNodeIdRef = React.useRef<string | null>(null);
    const [nodes, setNodes] = React.useState<Node<GraphNodeData>[]>([]);
    const [edges, setEdges] = React.useState<Edge[]>([]);

    const persistViewport = React.useCallback(() => {
        viewportCacheRef.current = getViewport();
    }, [getViewport]);

    const applyGraph = React.useCallback(
        (graph: ApplicationResourceGraph, options?: { explicitFitView?: boolean; autoFit?: boolean }) => {
            const explicitFitView = options?.explicitFitView ?? false;
            const keyChanged = applicationKeyChanged(applicationKeyRef.current, graph.applicationKey);

            if (keyChanged) {
                layoutCacheRef.current = createEmptyLayoutCache();
                viewportCacheRef.current = null;
                selectedNodeIdRef.current = null;
            }
            applicationKeyRef.current = serializeApplicationKey(graph.applicationKey);

            const merged = mergeGraphFlowState({
                graph,
                cache: layoutCacheRef.current,
                explicitFitView
            });
            layoutCacheRef.current = merged.cache;

            const nextNodeIds = new Set(merged.nodes.map((node) => node.id));
            const nextSelectedId = resolveSelectionAfterMerge(selectedNodeIdRef.current, nextNodeIds);
            selectedNodeIdRef.current = nextSelectedId;

            setNodes(applyNodeSelection(merged.nodes, nextSelectedId));
            setEdges(merged.edges);

            const autoFit = options?.autoFit ?? merged.shouldAutoFit;
            const cachedViewport = viewportCacheRef.current;

            window.requestAnimationFrame(() => {
                if (autoFit) {
                    fitView({ padding: 0.2, duration: zoomDuration });
                    viewportCacheRef.current = getViewport();
                    return;
                }
                if (
                    shouldPreserveViewport({
                        applicationKeyChanged: keyChanged,
                        shouldAutoFit: merged.shouldAutoFit,
                        explicitFitView,
                        cachedViewport
                    })
                ) {
                    setViewport(cachedViewport!, { duration: zoomDuration });
                }
            });
        },
        [fitView, getViewport, setViewport, zoomDuration]
    );

    React.useEffect(() => {
        applyGraph(resourceGraph);
    }, [applyGraph, resourceGraph]);

    const handleFitView = React.useCallback(() => {
        applyGraph(resourceGraph, { explicitFitView: true, autoFit: true });
    }, [applyGraph, resourceGraph]);

    const handleSelectionChange = React.useCallback(
        ({ nodes: selectedNodes }: { nodes: Node<GraphNodeData>[] }) => {
            selectedNodeIdRef.current = selectedNodes[0]?.id ?? null;
        },
        []
    );

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
            {graphDegradation && <GraphDegradationBanner message={graphDegradation} />}
            {shouldShowGraphAssemblyInfoBanner(skippedInvalidResourceRows) && (
                <GraphAssemblyInfoBanner message={GRAPH_ASSEMBLY_INVALID_ROW_BANNER_MESSAGE} />
            )}
            <GraphToolbar
                onZoomIn={() => zoomIn({ duration: zoomDuration })}
                onZoomOut={() => zoomOut({ duration: zoomDuration })}
                onFitView={handleFitView}
            />
            <GraphTopologyAffordances resourceGraph={resourceGraph} hidden={hideAffordances} />
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
                    onMoveEnd={persistViewport}
                    onSelectionChange={handleSelectionChange}
                    proOptions={{ hideAttribution: true }}
                    defaultEdgeOptions={{ className: 'argocd-graph-edge' }}
                />
                {showEmptyManaged && <GraphEmptyState applicationName={application.name} />}
                {graphMerging && <GraphLoadingOverlay />}
            </div>
        </div>
    );
}

function buildPresentationContext(
    resourceGraph: ApplicationResourceGraph | null,
    graphError: string | null,
    graphMerging: boolean
): GraphPresentationContext {
    return {
        resourceGraph,
        graphError,
        graphMerging,
        sessionError: false
    };
}

/**
 * Interactive React Flow canvas for the Argo CD Application resource graph.
 */
export function GraphTab({
    application,
    resourceGraph,
    graphError,
    graphDegradation,
    skippedInvalidResourceRows,
    graphMerging,
    graphInteraction,
    panelId = ARGOCD_APP_PANEL_IDS.graph,
    labelledBy,
    className
}: GraphTabProps): React.JSX.Element {
    const presentation = buildPresentationContext(resourceGraph, graphError, graphMerging);
    const initialLoad = isGraphInitialLoad(presentation);
    const emptyManaged = isGraphEmptyManaged(presentation);
    const hideAffordances = shouldHideGraphTopologyAffordances(presentation);

    const panelClass = ['argocd-graph-tab', className].filter(Boolean).join(' ');

    if (graphError && !resourceGraph) {
        return (
            <div
                id={panelId}
                className={[panelClass, 'argocd-graph-tab--error'].filter(Boolean).join(' ')}
                role="tabpanel"
                aria-labelledby={labelledBy}
                data-testid="graph-tab-error"
            >
                <GraphErrorState message={graphError} />
            </div>
        );
    }

    if (initialLoad) {
        return (
            <div
                id={panelId}
                className={[panelClass, 'argocd-graph-tab--placeholder'].filter(Boolean).join(' ')}
                role="tabpanel"
                aria-labelledby={labelledBy}
                data-testid="graph-tab-placeholder"
            >
                <GraphLoadingPlaceholder applicationName={application.name} />
            </div>
        );
    }

    if (!resourceGraph) {
        return (
            <div
                id={panelId}
                className={[panelClass, 'argocd-graph-tab--placeholder'].filter(Boolean).join(' ')}
                role="tabpanel"
                aria-labelledby={labelledBy}
                data-testid="graph-tab-placeholder"
            >
                <GraphLoadingPlaceholder applicationName={application.name} />
            </div>
        );
    }

    return (
        <div
            id={panelId}
            className={panelClass}
            role="tabpanel"
            aria-labelledby={labelledBy}
        >
            <GraphInteractionProvider value={graphInteraction}>
                <ReactFlowProvider>
                    <GraphCanvas
                        application={application}
                        resourceGraph={resourceGraph}
                        graphMerging={graphMerging}
                        graphDegradation={graphDegradation}
                        skippedInvalidResourceRows={skippedInvalidResourceRows}
                        hideAffordances={hideAffordances}
                        showEmptyManaged={emptyManaged}
                        graphInteraction={graphInteraction}
                    />
                </ReactFlowProvider>
            </GraphInteractionProvider>
        </div>
    );
}

export { deriveGraphMerging };
