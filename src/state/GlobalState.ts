import * as vscode from 'vscode';

/**
 * GlobalState manages persistent storage for the extension using VS Code's globalState API.
 * This class follows the singleton pattern to ensure a single instance across the extension.
 */
export class GlobalState {
    private static instance: GlobalState | null = null;
    private globalState: vscode.Memento;

    private static readonly welcomeScreenDismissedKey = 'kube9.welcomeScreen.dismissed';

    /**
     * Private constructor to enforce singleton pattern.
     * Use initialize() to create the instance and getInstance() to retrieve it.
     */
    private constructor(globalState: vscode.Memento) {
        this.globalState = globalState;
    }

    /**
     * Initialize the GlobalState singleton with the extension context.
     * This should be called once during extension activation.
     * 
     * @param context - The VS Code extension context
     * @throws Error if already initialized
     */
    public static initialize(context: vscode.ExtensionContext): void {
        if (GlobalState.instance !== null) {
            throw new Error('GlobalState has already been initialized');
        }
        GlobalState.instance = new GlobalState(context.globalState);
    }

    /**
     * Get the GlobalState singleton instance.
     * 
     * @returns The GlobalState instance
     * @throws Error if not yet initialized
     */
    public static getInstance(): GlobalState {
        if (GlobalState.instance === null) {
            throw new Error('GlobalState has not been initialized. Call initialize() first.');
        }
        return GlobalState.instance;
    }

    /**
     * Reset the singleton instance. Used primarily for testing.
     * @internal
     */
    public static reset(): void {
        GlobalState.instance = null;
    }

    /**
     * Check if the tutorial has been dismissed by the user.
     * Reuses the welcome screen dismissal key since the welcome screen and tutorial have been merged.
     * 
     * @returns true if the user has dismissed the tutorial, false otherwise
     */
    public getWelcomeScreenDismissed(): boolean {
        return this.globalState.get<boolean>(GlobalState.welcomeScreenDismissedKey, false);
    }

    /**
     * Set whether the tutorial has been dismissed.
     * Reuses the welcome screen dismissal key since the welcome screen and tutorial have been merged.
     * 
     * @param dismissed - true to mark the tutorial as dismissed, false otherwise
     * @returns Promise that resolves when the state has been saved
     */
    public async setWelcomeScreenDismissed(dismissed: boolean): Promise<void> {
        await this.globalState.update(GlobalState.welcomeScreenDismissedKey, dismissed);
    }
}

