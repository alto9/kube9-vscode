import * as vscode from 'vscode';
import { KubernetesEvent } from '../../types/Events';

/**
 * EventTreeItem represents a single Kubernetes event in the tree view.
 * Displays events with color-coded icons, formatted descriptions, and detailed tooltips.
 */
export class EventTreeItem extends vscode.TreeItem {
    /**
     * Creates a new EventTreeItem.
     * 
     * @param event The Kubernetes event to display
     */
    constructor(public readonly event: KubernetesEvent) {
        super(event.reason, vscode.TreeItemCollapsibleState.None);
        
        this.contextValue = 'kube9.event';
        this.description = `${event.involvedObject.namespace}/${event.involvedObject.kind}/${event.involvedObject.name}`;
        this.tooltip = this.buildTooltip();
        this.iconPath = this.getIconForEventType();
        this.command = {
            command: 'kube9.events.showDetails',
            title: 'Show Event Details',
            arguments: [event]
        };
    }

    /**
     * Gets the color-coded icon for the event type.
     * - Normal: green pass icon
     * - Warning: yellow warning icon
     * - Error: red error icon
     * 
     * @returns ThemeIcon with appropriate color
     */
    private getIconForEventType(): vscode.ThemeIcon {
        switch (this.event.type) {
            case 'Normal':
                return new vscode.ThemeIcon('pass', 
                    new vscode.ThemeColor('terminal.ansiGreen'));
            case 'Warning':
                return new vscode.ThemeIcon('warning', 
                    new vscode.ThemeColor('editorWarning.foreground'));
            case 'Error':
                return new vscode.ThemeIcon('error', 
                    new vscode.ThemeColor('editorError.foreground'));
            default:
                return new vscode.ThemeIcon('info');
        }
    }

    /**
     * Builds a detailed tooltip in Markdown format.
     * Shows reason, type, resource, namespace, message, count, and age.
     * 
     * @returns MarkdownString with formatted event details
     */
    private buildTooltip(): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${this.event.reason}**\n\n`);
        md.appendMarkdown(`Type: ${this.event.type}\n\n`);
        md.appendMarkdown(`Resource: ${this.event.involvedObject.kind}/${this.event.involvedObject.name}\n\n`);
        md.appendMarkdown(`Namespace: ${this.event.involvedObject.namespace}\n\n`);
        md.appendMarkdown(`Message: ${this.event.message}\n\n`);
        md.appendMarkdown(`Count: ${this.event.count}\n\n`);
        md.appendMarkdown(`Age: ${this.formatAge(this.event.lastTimestamp)}\n\n`);
        return md;
    }

    /**
     * Formats a timestamp as a human-readable age.
     * Examples: "just now", "5m", "2h", "3d"
     * 
     * @param timestamp ISO 8601 timestamp string
     * @returns Formatted age string
     */
    private formatAge(timestamp: string): string {
        const eventTime = new Date(timestamp).getTime();
        const now = Date.now();
        const ageMs = now - eventTime;
        
        const minutes = Math.floor(ageMs / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return 'just now';
        }
    }
}

