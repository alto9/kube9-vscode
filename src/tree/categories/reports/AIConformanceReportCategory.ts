import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';

/** Stable report id for tree resourceName and command routing. */
export const AI_CONFORMANCE_REPORT_ID = 'kubernetes-ai-conformance';

export const AI_CONFORMANCE_REPORT_LABEL = 'Kubernetes AI Conformance';

/**
 * Kubernetes AI Conformance report under Kube9 Operator reports (operated clusters only).
 */
export class AIConformanceReportCategory {
    public static createReportItem(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            AI_CONFORMANCE_REPORT_LABEL,
            'aiConformanceReport',
            vscode.TreeItemCollapsibleState.None,
            {
                ...resourceData,
                resourceName: AI_CONFORMANCE_REPORT_ID,
            }
        );
        item.iconPath = new vscode.ThemeIcon('checklist');
        item.tooltip = 'Open Kubernetes AI Conformance readiness report (kube9-operator)';
        item.command = {
            command: 'kube9.openAIConformanceReport',
            title: 'Open Kubernetes AI Conformance Report',
            arguments: [resourceData.context.name],
        };
        return item;
    }
}
