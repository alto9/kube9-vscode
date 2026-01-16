import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';
import { WorkloadCommands } from '../../../kubectl/WorkloadCommands';
import { PodTreeItem } from '../../items/PodTreeItem';
import { KubectlError } from '../../../kubernetes/KubectlError';

/**
 * Type for error handler callback.
 */
type ErrorHandler = (error: KubectlError, clusterName: string) => void;

/**
 * CronJobs subcategory handler.
 * Provides functionality to fetch and display cronjobs and their pods.
 */
export class CronJobsSubcategory {
    /**
     * Retrieves cronjob items for the CronJobs subcategory.
     * Queries kubectl to get all cronjobs across all namespaces and creates tree items for display.
     * 
     * @param resourceData Cluster context and cluster information
     * @param kubeconfigPath Path to the kubeconfig file
     * @param errorHandler Callback to handle kubectl errors
     * @returns Array of cronjob tree items
     */
    public static async getCronJobItems(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        errorHandler: ErrorHandler
    ): Promise<ClusterTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;
        
        // Query cronjobs using kubectl
        const result = await WorkloadCommands.getCronJobs(
            kubeconfigPath,
            contextName
        );

        // Handle errors if they occurred
        if (result.error) {
            errorHandler(result.error, clusterName);
            return [];
        }

        // If no cronjobs found, return empty array
        if (result.cronjobs.length === 0) {
            return [];
        }

        // Create tree items for each cronjob
        const cronjobItems = result.cronjobs.map(cronjobInfo => {
            // Create tree item with 'cronjob' type for individual cronjob
            const item = new ClusterTreeItem(
                cronjobInfo.name,
                'cronjob',
                vscode.TreeItemCollapsibleState.None,
                {
                    ...resourceData,
                    resourceName: cronjobInfo.name,
                    namespace: cronjobInfo.namespace
                }
            );
            
            // Set context value for "View YAML" menu
            item.contextValue = 'resource:CronJob';

            // Set description to show namespace and schedule
            item.description = `${cronjobInfo.namespace} • ${cronjobInfo.schedule}`;

            // Set icon based on suspended status
            if (cronjobInfo.suspended) {
                // Suspended cronjob
                item.iconPath = new vscode.ThemeIcon(
                    'debug-pause',
                    new vscode.ThemeColor('editorWarning.foreground')
                );
            } else {
                // Active cronjob
                item.iconPath = new vscode.ThemeIcon(
                    'watch',
                    new vscode.ThemeColor('testing.iconPassed')
                );
            }

            // Set tooltip with detailed information
            const statusText = cronjobInfo.suspended ? 'Suspended' : 'Active';
            const lastSchedule = cronjobInfo.lastScheduleTime 
                ? `\nLast Schedule: ${cronjobInfo.lastScheduleTime}`
                : '';
            item.tooltip = `CronJob: ${cronjobInfo.name}\nNamespace: ${cronjobInfo.namespace}\nSchedule: ${cronjobInfo.schedule}\nStatus: ${statusText}${lastSchedule}`;

            // Set command to open Describe webview on left-click
            item.command = {
                command: 'kube9.describeCronJob',
                title: 'Describe CronJob',
                arguments: [{
                    name: cronjobInfo.name,
                    namespace: cronjobInfo.namespace,
                    kubeconfigPath: kubeconfigPath,
                    context: contextName
                }]
            };

            return item;
        });

        return cronjobItems;
    }

    /**
     * Retrieves pod items for a specific cronjob.
     * First queries kubectl to get jobs owned by the cronjob, then fetches pods for each job.
     * 
     * @param resourceData Cluster context and cluster information (includes resourceName and namespace)
     * @param kubeconfigPath Path to the kubeconfig file
     * @param errorHandler Callback to handle kubectl errors
     * @returns Array of pod tree items
     */
    public static async getPodsForCronJob(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        errorHandler: ErrorHandler
    ): Promise<PodTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;
        const cronjobName = resourceData.resourceName || 'Unknown';
        const namespace = resourceData.namespace || 'default';
        
        // Query jobs owned by this cronjob
        const jobsResult = await WorkloadCommands.getJobsForCronJob(
            kubeconfigPath,
            contextName,
            cronjobName,
            namespace
        );

        // Handle errors if they occurred
        if (jobsResult.error) {
            errorHandler(jobsResult.error, clusterName);
            return [];
        }

        // If no jobs found, return empty array
        if (jobsResult.jobs.length === 0) {
            return [];
        }

        // Fetch pods for each job and aggregate them
        const allPods: PodTreeItem[] = [];
        
        for (const job of jobsResult.jobs) {
            // Query pods using kubectl with label selector from the job
            const podsResult = await WorkloadCommands.getPodsForJob(
                kubeconfigPath,
                contextName,
                job.name,
                job.namespace,
                job.selector
            );

            // Handle errors if they occurred
            if (podsResult.error) {
                errorHandler(podsResult.error, clusterName);
                continue; // Skip this job's pods but continue with others
            }

            // Create PodTreeItem for each pod
            const podItems = podsResult.pods.map(podInfo => {
                // Map phase to PodStatus type
                let status: 'Running' | 'Pending' | 'Succeeded' | 'Failed' | 'Unknown' = 'Unknown';
                if (podInfo.phase === 'Running' || podInfo.phase === 'Pending' || 
                    podInfo.phase === 'Succeeded' || podInfo.phase === 'Failed') {
                    status = podInfo.phase as 'Running' | 'Pending' | 'Succeeded' | 'Failed';
                }

                const podItem = new PodTreeItem(
                    {
                        name: podInfo.name,
                        namespace: podInfo.namespace,
                        status,
                        parentResource: cronjobName
                    },
                    resourceData
                );
                podItem.updatePortForwardBadge();
                return podItem;
            });

            allPods.push(...podItems);
        }

        // Sort all pods alphabetically by name
        allPods.sort((a, b) => a.podInfo.name.localeCompare(b.podInfo.name));

        return allPods;
    }
}


