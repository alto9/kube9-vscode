import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';

/** Prefix for tree resource IDs and webview report IDs (one webview per pillar). */
export const WELL_ARCHITECTED_ASSESSMENT_REPORT_PREFIX = 'well-architected-assessment:';

export const WELL_ARCHITECTED_PILLARS = [
    { id: 'cost-optimization', label: 'Cost Optimization' },
    { id: 'operational-excellence', label: 'Operational Excellence' },
    { id: 'performance-efficiency', label: 'Performance Efficiency' },
    { id: 'reliability', label: 'Reliability' },
    { id: 'security', label: 'Security' },
    { id: 'sustainability', label: 'Sustainability' },
] as const;

export type WellArchitectedPillarId = (typeof WELL_ARCHITECTED_PILLARS)[number]['id'];

const PILLAR_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
    WELL_ARCHITECTED_PILLARS.map((p) => [p.id, p.label])
);

export function wellArchitectedReportIdForPillar(pillarId: string): string {
    return `${WELL_ARCHITECTED_ASSESSMENT_REPORT_PREFIX}${pillarId}`;
}

export function parseWellArchitectedReportId(reportId: string): WellArchitectedPillarId | null {
    if (!reportId.startsWith(WELL_ARCHITECTED_ASSESSMENT_REPORT_PREFIX)) {
        return null;
    }
    const id = reportId.slice(WELL_ARCHITECTED_ASSESSMENT_REPORT_PREFIX.length);
    return id in PILLAR_LABEL_BY_ID ? (id as WellArchitectedPillarId) : null;
}

export function labelForWellArchitectedPillar(pillarId: string): string {
    return PILLAR_LABEL_BY_ID[pillarId] ?? pillarId;
}

/**
 * Well-Architected Assessment folder under Reports and one report leaf per framework pillar.
 */
export class WellArchitectedFrameworkCategory {
    public static createFolder(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Well Architected Assessment',
            'wellArchitectedSubcategory',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('law');
        item.tooltip = 'Well-Architected Assessment by pillar (kube9-operator)';
        return item;
    }

    public static getReportItems(resourceData: TreeItemData): ClusterTreeItem[] {
        return WELL_ARCHITECTED_PILLARS.map((p) =>
            this.createReportItem(resourceData, wellArchitectedReportIdForPillar(p.id), p.label)
        );
    }

    private static createReportItem(
        resourceData: TreeItemData,
        reportId: string,
        label: string
    ): ClusterTreeItem {
        const item = new ClusterTreeItem(
            label,
            'wellArchitectedReport',
            vscode.TreeItemCollapsibleState.None,
            {
                ...resourceData,
                resourceName: reportId,
            }
        );
        item.iconPath = new vscode.ThemeIcon('checklist');
        item.tooltip = `Open ${label} assessment results`;
        item.command = {
            command: 'kube9.openWellArchitectedAssessmentReport',
            title: 'Open Well-Architected Assessment Report',
            arguments: [resourceData.context.name, reportId],
        };
        return item;
    }
}
