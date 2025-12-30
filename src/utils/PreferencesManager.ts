import * as vscode from 'vscode';

/**
 * Preferences for the Pod Logs Viewer panel.
 */
export interface PanelPreferences {
    /** Whether to automatically follow new log lines */
    followMode: boolean;
    /** Whether to show timestamps before each log line */
    showTimestamps: boolean;
    /** Maximum number of lines to display, or 'all' for no limit */
    lineLimit: number | 'all';
    /** Whether to show logs from previous container instance */
    showPrevious: boolean;
}

/**
 * Map of cluster context names to their panel preferences.
 */
interface ClusterPreferences {
    [contextName: string]: PanelPreferences;
}

/**
 * Manages per-cluster preferences for the Pod Logs Viewer panel.
 * 
 * Preferences are stored in VS Code's globalState and persist across sessions.
 * Each cluster (identified by contextName) maintains independent preferences.
 */
export class PreferencesManager {
    /**
     * Storage key for pod logs preferences in Global State.
     */
    private static readonly STORAGE_KEY = 'podLogsPreferences';

    /**
     * Default preferences when no preferences exist for a cluster.
     */
    private static readonly DEFAULT_PREFERENCES: PanelPreferences = {
        followMode: true,
        showTimestamps: false,
        lineLimit: 1000,
        showPrevious: false
    };

    /**
     * VS Code extension context for accessing Global State.
     */
    private readonly context: vscode.ExtensionContext;

    /**
     * Creates a new PreferencesManager instance.
     * 
     * @param context - The VS Code extension context
     */
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Retrieves preferences for a specific cluster context.
     * Returns default preferences if none exist for the cluster.
     * 
     * @param contextName - The kubectl context name of the cluster
     * @returns The preferences for the cluster, or defaults if none exist
     */
    public getPreferences(contextName: string): PanelPreferences {
        const allPrefs = this.context.globalState.get<ClusterPreferences>(
            PreferencesManager.STORAGE_KEY,
            {}
        );
        return allPrefs[contextName] || PreferencesManager.DEFAULT_PREFERENCES;
    }

    /**
     * Saves preferences for a specific cluster context.
     * 
     * @param contextName - The kubectl context name of the cluster
     * @param prefs - The preferences to save for the cluster
     * @returns Promise that resolves when the preferences have been saved
     */
    public async savePreferences(contextName: string, prefs: PanelPreferences): Promise<void> {
        const allPrefs = this.context.globalState.get<ClusterPreferences>(
            PreferencesManager.STORAGE_KEY,
            {}
        );
        allPrefs[contextName] = prefs;
        await this.context.globalState.update(PreferencesManager.STORAGE_KEY, allPrefs);
    }

    /**
     * Returns the default preferences.
     * 
     * @returns The default preferences object
     */
    public getDefaults(): PanelPreferences {
        return { ...PreferencesManager.DEFAULT_PREFERENCES };
    }
}

