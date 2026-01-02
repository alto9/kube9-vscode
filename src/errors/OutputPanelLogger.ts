import * as vscode from 'vscode';
import { ErrorDetails } from './types';

/**
 * Singleton logger for writing structured error logs to the VS Code Output Panel.
 * Provides formatted logging with timestamps, context, and error details.
 */
export class OutputPanelLogger {
    private static instance: OutputPanelLogger | null = null;
    private outputChannel: vscode.OutputChannel;

    /**
     * Private constructor to enforce singleton pattern.
     * Use getInstance() to retrieve the instance.
     */
    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('kube9');
    }

    /**
     * Get the OutputPanelLogger singleton instance.
     * Creates a new instance on first call, returns the same instance on subsequent calls.
     * 
     * @returns The OutputPanelLogger instance
     */
    public static getInstance(): OutputPanelLogger {
        if (!OutputPanelLogger.instance) {
            OutputPanelLogger.instance = new OutputPanelLogger();
        }
        return OutputPanelLogger.instance;
    }

    /**
     * Log a general message with timestamp and level prefix.
     * 
     * @param message - The message to log
     * @param level - The log level (default: 'info')
     */
    public log(message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info'): void {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        this.outputChannel.appendLine(`${prefix} ${message}`);
    }

    /**
     * Log structured error details with formatted output including separators,
     * timestamps, context, and stack traces.
     * 
     * @param details - The ErrorDetails object containing error information
     */
    public logError(details: ErrorDetails): void {
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('='.repeat(80));
        this.outputChannel.appendLine(`ERROR: ${details.message}`);
        this.outputChannel.appendLine('='.repeat(80));
        this.outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
        this.outputChannel.appendLine(`Type: ${details.type}`);
        this.outputChannel.appendLine(`Severity: ${details.severity}`);
        
        if (details.statusCode) {
            this.outputChannel.appendLine(`Status Code: ${details.statusCode}`);
        }
        
        if (details.context) {
            this.outputChannel.appendLine('Context:');
            this.outputChannel.appendLine(JSON.stringify(details.context, null, 2));
        }
        
        if (details.technicalDetails) {
            this.outputChannel.appendLine('Technical Details:');
            this.outputChannel.appendLine(details.technicalDetails);
        }
        
        if (details.error?.stack) {
            this.outputChannel.appendLine('Stack Trace:');
            this.outputChannel.appendLine(details.error.stack);
        }
        
        this.outputChannel.appendLine('='.repeat(80));
        this.outputChannel.appendLine('');
    }

    /**
     * Show the output panel.
     */
    public show(): void {
        this.outputChannel.show();
    }

    /**
     * Dispose of the output channel.
     */
    public dispose(): void {
        this.outputChannel.dispose();
    }

    /**
     * Reset the singleton instance. Used primarily for testing.
     * @internal
     */
    public static reset(): void {
        if (OutputPanelLogger.instance) {
            OutputPanelLogger.instance.dispose();
        }
        OutputPanelLogger.instance = null;
    }
}

