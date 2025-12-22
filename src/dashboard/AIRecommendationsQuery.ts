import { ConfigurationCommands } from '../kubectl/ConfigurationCommands';
import { KubeconfigParser } from '../kubernetes/KubeconfigParser';
import { getOperatorNamespaceResolver } from '../services/OperatorNamespaceResolver';
import { AIRecommendationsData, AIRecommendation } from './types';

/**
 * Interface for raw AI recommendations data from ConfigMap.
 */
interface AIRecommendationsRaw {
    items?: Array<{
        id?: string;
        type?: string;
        severity?: string;
        title?: string;
        description?: string;
        actionable?: boolean;
        actionUrl?: string;
    }>;
    insights?: Array<{
        id?: string;
        category?: string;
        summary?: string;
        details?: string;
    }>;
}

/**
 * Queries the operator for AI-powered recommendations.
 * Recommendations are only available when the operator has an API key configured.
 * 
 * This function queries the kube9-ai-recommendations ConfigMap which is maintained
 * by the operator and synchronized from the kube9-server AI service.
 * 
 * @param clusterContext The Kubernetes context name for the cluster
 * @returns Promise resolving to AIRecommendationsData or null if not available
 */
export async function getAIRecommendations(
    clusterContext: string
): Promise<AIRecommendationsData | null> {
    try {
        // Get kubeconfig path
        const kubeconfigPath = KubeconfigParser.getKubeconfigPath();
        
        // Resolve namespace dynamically using OperatorNamespaceResolver
        const resolver = getOperatorNamespaceResolver();
        const namespace = await resolver.resolveNamespace(clusterContext);
        
        // Query the AI recommendations ConfigMap
        const result = await ConfigurationCommands.getConfigMap(
            'kube9-ai-recommendations',
            namespace,
            kubeconfigPath,
            clusterContext
        );

        // Handle errors (ConfigMap not found is expected if operator not providing AI recommendations)
        if (result.error || !result.configMap) {
            console.log(`AI recommendations ConfigMap not found for context ${clusterContext} (expected if no API key configured)`);
            return null;
        }

        // Check if ConfigMap has data field
        if (!result.configMap.data || !result.configMap.data.recommendations) {
            console.log(`AI recommendations ConfigMap has no recommendations data for context ${clusterContext}`);
            return null;
        }

        // Parse the recommendations JSON data
        let recommendationsData: AIRecommendationsRaw;
        try {
            recommendationsData = JSON.parse(result.configMap.data.recommendations) as AIRecommendationsRaw;
        } catch (parseError) {
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            console.log(`Failed to parse AI recommendations JSON for context ${clusterContext}:`, errorMessage);
            return null;
        }

        // Extract and validate recommendations
        const recommendations: AIRecommendation[] = (recommendationsData.items || []).map(item => ({
            id: item.id || '',
            type: (item.type === 'optimization' || item.type === 'cost' || 
                   item.type === 'security' || item.type === 'reliability') 
                ? item.type as 'optimization' | 'cost' | 'security' | 'reliability'
                : 'optimization' as const,
            severity: (item.severity === 'high' || item.severity === 'medium' || item.severity === 'low')
                ? item.severity as 'high' | 'medium' | 'low'
                : 'medium' as const,
            title: item.title || 'Untitled Recommendation',
            description: item.description || '',
            actionable: item.actionable || false,
            actionUrl: item.actionUrl
        }));

        // Extract and validate insights
        const insights = (recommendationsData.insights || []).map(item => ({
            id: item.id || '',
            category: item.category || 'General',
            summary: item.summary || '',
            details: item.details || ''
        }));

        return {
            recommendations,
            insights: insights.length > 0 ? insights : undefined
        };
    } catch (error: unknown) {
        // Log error and return null for graceful fallback
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Failed to query AI recommendations for context ${clusterContext}:`, errorMessage);
        return null;
    }
}

