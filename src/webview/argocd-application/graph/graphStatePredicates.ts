import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import {
    countManagedResourceNodes,
    shouldShowLargeAppGroupingAffordance,
    shouldShowLimitedTopologyAffordance
} from './graphTopologyAffordanceRules';

export interface GraphPresentationContext {
    resourceGraph: ApplicationResourceGraph | null;
    graphError: string | null;
    graphMerging: boolean;
    sessionError: boolean;
}

export function isGraphInitialLoad(context: GraphPresentationContext): boolean {
    return (
        !context.sessionError &&
        !context.graphError &&
        context.resourceGraph === null &&
        !context.graphMerging
    );
}

export function isGraphEmptyManaged(context: GraphPresentationContext): boolean {
    if (!context.resourceGraph || context.graphMerging || context.graphError) {
        return false;
    }
    return countManagedResourceNodes(context.resourceGraph) === 0;
}

export function shouldHideGraphTopologyAffordances(context: GraphPresentationContext): boolean {
    return (
        context.sessionError ||
        context.graphError !== null ||
        isGraphInitialLoad(context) ||
        context.graphMerging ||
        isGraphEmptyManaged(context) ||
        context.resourceGraph === null
    );
}

export function shouldShowGraphTopologyAffordances(context: GraphPresentationContext): boolean {
    if (shouldHideGraphTopologyAffordances(context) || !context.resourceGraph) {
        return false;
    }
    return (
        shouldShowLimitedTopologyAffordance(context.resourceGraph) ||
        shouldShowLargeAppGroupingAffordance(context.resourceGraph)
    );
}

export function deriveGraphMerging(
    resourceGraph: ApplicationResourceGraph | null,
    syncing: boolean,
    refreshing: boolean,
    appOperationRunning: boolean
): boolean {
    return resourceGraph !== null && (syncing || refreshing || appOperationRunning);
}
