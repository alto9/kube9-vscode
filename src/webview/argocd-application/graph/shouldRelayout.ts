import { NODE_COUNT_RELAYOUT_THRESHOLD } from './constants';

export interface RelayoutDecisionInput {
    isInitial: boolean;
    structureVersionChanged: boolean;
    topologySourceChanged: boolean;
    previousNodeCount: number;
    nextNodeCount: number;
    explicitFitView: boolean;
}

export function shouldRelayout(input: RelayoutDecisionInput): boolean {
    if (input.isInitial || input.explicitFitView) {
        return true;
    }
    if (input.structureVersionChanged || input.topologySourceChanged) {
        return true;
    }
    const nodeCountDelta = Math.abs(input.nextNodeCount - input.previousNodeCount);
    return nodeCountDelta > NODE_COUNT_RELAYOUT_THRESHOLD;
}
