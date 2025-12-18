import * as vscode from 'vscode';
import { EventsCategory } from '../tree/categories/EventsCategory';
import { EventsProvider } from '../services/EventsProvider';
import { fetchNamespaces } from '../kubernetes/resourceFetchers';
import { ClusterTreeProvider } from '../tree/ClusterTreeProvider';
import { KubernetesEvent } from '../types/Events';
import { getKubernetesApiClient } from '../kubernetes/apiClient';

export class EventsCommands {
    constructor(
        private eventsProvider: EventsProvider,
        private treeProvider: ClusterTreeProvider
    ) {}

    async filterNamespace(eventsCategory: EventsCategory): Promise<void> {
        if (!eventsCategory.resourceData) {
            vscode.window.showErrorMessage('Unable to filter: cluster context not available');
            return;
        }
        
        const clusterContext = eventsCategory.resourceData.context.name;
        
        // Set the API client context before fetching namespaces
        const apiClient = getKubernetesApiClient();
        apiClient.setContext(clusterContext);
        
        const namespaces = await fetchNamespaces();
        const namespaceNames = namespaces.map(ns => ns.metadata?.name || '');
        const items = ['All Namespaces', ...namespaceNames];
        
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Filter events by namespace'
        });
        
        if (selected) {
            const namespace = selected === 'All Namespaces' ? 'all' : selected;
            this.eventsProvider.setFilter(clusterContext, { namespace });
            this.treeProvider.refreshItem(eventsCategory);
        }
    }

    async filterType(eventsCategory: EventsCategory): Promise<void> {
        if (!eventsCategory.resourceData) {
            vscode.window.showErrorMessage('Unable to filter: cluster context not available');
            return;
        }
        
        const types = ['All', 'Normal', 'Warning', 'Error'];
        
        const selected = await vscode.window.showQuickPick(types, {
            placeHolder: 'Filter events by type'
        });
        
        if (selected) {
            const type = selected === 'All' ? 'all' : selected;
            const clusterContext = eventsCategory.resourceData.context.name;
            this.eventsProvider.setFilter(clusterContext, { type });
            this.treeProvider.refreshItem(eventsCategory);
        }
    }

    async filterTimeRange(eventsCategory: EventsCategory): Promise<void> {
        if (!eventsCategory.resourceData) {
            vscode.window.showErrorMessage('Unable to filter: cluster context not available');
            return;
        }
        
        const ranges = [
            { label: 'Last 1 hour', value: '1h' },
            { label: 'Last 6 hours', value: '6h' },
            { label: 'Last 24 hours', value: '24h' },
            { label: 'All', value: 'all' }
        ];
        
        const selected = await vscode.window.showQuickPick(ranges, {
            placeHolder: 'Filter events by time range'
        });
        
        if (selected) {
            const clusterContext = eventsCategory.resourceData.context.name;
            this.eventsProvider.setFilter(clusterContext, { since: selected.value });
            this.treeProvider.refreshItem(eventsCategory);
        }
    }

    async filterResourceType(eventsCategory: EventsCategory): Promise<void> {
        if (!eventsCategory.resourceData) {
            vscode.window.showErrorMessage('Unable to filter: cluster context not available');
            return;
        }
        
        const types = ['All', 'Pod', 'Deployment', 'Service', 'StatefulSet', 
                       'DaemonSet', 'Job', 'CronJob', 'ReplicaSet'];
        
        const selected = await vscode.window.showQuickPick(types, {
            placeHolder: 'Filter events by resource type'
        });
        
        if (selected) {
            const resourceType = selected === 'All' ? 'all' : selected;
            const clusterContext = eventsCategory.resourceData.context.name;
            this.eventsProvider.setFilter(clusterContext, { resourceType });
            this.treeProvider.refreshItem(eventsCategory);
        }
    }

    async search(eventsCategory: EventsCategory): Promise<void> {
        if (!eventsCategory.resourceData) {
            vscode.window.showErrorMessage('Unable to search: cluster context not available');
            return;
        }
        
        const searchText = await vscode.window.showInputBox({
            prompt: 'Search events by message text',
            placeHolder: 'Enter search term...'
        });
        
        if (searchText !== undefined) {
            const clusterContext = eventsCategory.resourceData.context.name;
            this.eventsProvider.setFilter(clusterContext, { searchText });
            this.treeProvider.refreshItem(eventsCategory);
        }
    }

    clearFilters(eventsCategory: EventsCategory): void {
        if (!eventsCategory.resourceData) {
            vscode.window.showErrorMessage('Unable to clear filters: cluster context not available');
            return;
        }
        
        const clusterContext = eventsCategory.resourceData.context.name;
        this.eventsProvider.clearFilters(clusterContext);
        this.treeProvider.refreshItem(eventsCategory);
    }

    refresh(eventsCategory: EventsCategory): void {
        if (!eventsCategory.resourceData) {
            vscode.window.showErrorMessage('Unable to refresh: cluster context not available');
            return;
        }
        
        const clusterContext = eventsCategory.resourceData.context.name;
        this.eventsProvider.clearCache(clusterContext);
        this.treeProvider.refreshItem(eventsCategory);
    }

    toggleAutoRefresh(eventsCategory: EventsCategory): void {
        if (!eventsCategory.resourceData) {
            vscode.window.showErrorMessage('Unable to toggle auto-refresh: cluster context not available');
            return;
        }
        
        const clusterContext = eventsCategory.resourceData.context.name;
        const isEnabled = this.eventsProvider.isAutoRefreshEnabled(clusterContext);
        
        if (isEnabled) {
            this.eventsProvider.stopAutoRefresh(clusterContext);
            vscode.window.showInformationMessage('Auto-refresh disabled for Events');
        } else {
            this.eventsProvider.startAutoRefresh(clusterContext, () => {
                this.treeProvider.refreshItem(eventsCategory);
            });
            vscode.window.showInformationMessage('Auto-refresh enabled for Events (30 seconds)');
        }
    }

    showDetails(event: KubernetesEvent): void {
        const outputChannel = vscode.window.createOutputChannel('Kube9 Events');
        outputChannel.clear();
        outputChannel.appendLine('=== Event Details ===');
        outputChannel.appendLine('');
        outputChannel.appendLine(`Reason: ${event.reason}`);
        outputChannel.appendLine(`Type: ${event.type}`);
        outputChannel.appendLine(`Message: ${event.message}`);
        outputChannel.appendLine('');
        outputChannel.appendLine('=== Involved Object ===');
        outputChannel.appendLine(`Kind: ${event.involvedObject.kind}`);
        outputChannel.appendLine(`Namespace: ${event.involvedObject.namespace}`);
        outputChannel.appendLine(`Name: ${event.involvedObject.name}`);
        outputChannel.appendLine('');
        outputChannel.appendLine('=== Timestamps ===');
        outputChannel.appendLine(`First Occurred: ${event.firstTimestamp}`);
        outputChannel.appendLine(`Last Occurred: ${event.lastTimestamp}`);
        outputChannel.appendLine(`Count: ${event.count}`);
        outputChannel.show();
    }
}

