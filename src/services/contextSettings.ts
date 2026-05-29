import * as vscode from 'vscode';

/**
 * Read a VS Code setting that may be a plain string or a per-context object map.
 */
export function readContextScopedSetting(
    section: string,
    key: string,
    context: string
): string | undefined {
    const config = vscode.workspace.getConfiguration(section);
    const value = config.get<string | Record<string, string>>(key);

    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? undefined : trimmed;
    }

    if (typeof value === 'object') {
        const scoped = value[context];
        if (typeof scoped !== 'string') {
            return undefined;
        }
        const trimmed = scoped.trim();
        return trimmed === '' ? undefined : trimmed;
    }

    return undefined;
}

export function readBooleanSetting(section: string, key: string, defaultValue: boolean): boolean {
    const config = vscode.workspace.getConfiguration(section);
    const value = config.get<boolean>(key);
    return value === undefined ? defaultValue : value;
}

export function readNumberSetting(section: string, key: string, defaultValue: number): number {
    const config = vscode.workspace.getConfiguration(section);
    const value = config.get<number>(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}
