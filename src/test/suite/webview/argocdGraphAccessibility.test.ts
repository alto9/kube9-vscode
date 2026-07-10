import * as assert from 'assert';
import { buildGraphTileAccessibleName } from '../../../webview/argocd-application/graph/buildAccessibleName';
import { sortNodesForFocusOrder } from '../../../webview/argocd-application/graph/focusOrder';
import { shouldShowGraphActionNotice } from '../../../webview/argocd-application/graph/graphActionNotice';
import { nextOverflowMenuIndex } from '../../../webview/components/overflowMenuKeyboard';
import {
    ARGOCD_APP_PANEL_IDS,
    ARGOCD_APP_TAB_IDS,
    nextTabFromArrowKey,
    tabBarTabIndex
} from '../../../webview/argocd-application/graph/tabBarA11y';
import { graphZoomAnimationDuration } from '../../../webview/argocd-application/graph/graphMotion';
import type { GraphNodeData } from '../../../webview/argocd-application/graph/types';
import type { Node } from '@xyflow/react';

function graphNode(id: string, x: number, y: number): Node<GraphNodeData> {
    return {
        id,
        type: 'resourceGraph',
        position: { x, y },
        data: {
            dto: {
                id,
                role: 'managed_resource',
                resourceKey: { namespace: 'default', kind: 'Deployment', name: id },
                status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
                label: id,
                kindLabel: 'Deployment'
            }
        }
    };
}

suite('argocd graph accessibility', () => {
    test('shouldShowGraphActionNotice suppresses user-cancelled restart', () => {
        assert.strictEqual(shouldShowGraphActionNotice(false, 'Cancelled'), false);
        assert.strictEqual(shouldShowGraphActionNotice(false, 'Unknown action: foo'), true);
        assert.strictEqual(shouldShowGraphActionNotice(true, 'Restarted Deployment guestbook-ui successfully'), false);
    });

    test('buildGraphTileAccessibleName combines kind, name, sync, and health', () => {
        assert.strictEqual(
            buildGraphTileAccessibleName('Deployment', 'frontend', 'OutOfSync', 'Degraded'),
            'Deployment frontend OutOfSync Degraded'
        );
    });

    test('sortNodesForFocusOrder sorts top-to-bottom then left-to-right', () => {
        const nodes = [
            graphNode('right-top', 200, 0),
            graphNode('left-bottom', 0, 100),
            graphNode('left-top', 0, 0)
        ];
        const ordered = sortNodesForFocusOrder(nodes).map((node) => node.id);
        assert.deepStrictEqual(ordered, ['left-top', 'right-top', 'left-bottom']);
    });

    test('nextOverflowMenuIndex wraps roving focus', () => {
        assert.strictEqual(nextOverflowMenuIndex(0, 'down', 3), 1);
        assert.strictEqual(nextOverflowMenuIndex(2, 'down', 3), 0);
        assert.strictEqual(nextOverflowMenuIndex(0, 'up', 3), 2);
    });

    test('tabBarTabIndex exposes roving tabindex for active tab', () => {
        assert.strictEqual(tabBarTabIndex('graph', 'graph'), 0);
        assert.strictEqual(tabBarTabIndex('graph', 'details'), -1);
        assert.strictEqual(tabBarTabIndex('details', 'details'), 0);
    });

    test('nextTabFromArrowKey toggles between graph and details', () => {
        assert.strictEqual(nextTabFromArrowKey('graph', 'ArrowRight'), 'details');
        assert.strictEqual(nextTabFromArrowKey('details', 'ArrowLeft'), 'graph');
    });

    test('tab and panel ids are stable for aria-controls wiring', () => {
        assert.strictEqual(ARGOCD_APP_TAB_IDS.graph, 'argocd-app-tab-graph');
        assert.strictEqual(ARGOCD_APP_PANEL_IDS.details, 'argocd-app-panel-details');
    });

    test('graphZoomAnimationDuration honors reduced motion', () => {
        assert.strictEqual(graphZoomAnimationDuration(true), 0);
        assert.strictEqual(graphZoomAnimationDuration(false), 150);
    });
});
