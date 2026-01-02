/**
 * Mock implementation of VS Code API for unit testing
 * This allows tests to run without the VS Code extension host
 */

export class Uri {
    static file(path: string): Uri {
        return new Uri(path);
    }

    static parse(value: string): Uri {
        return new Uri(value);
    }

    static joinPath(base: Uri, ...pathSegments: string[]): Uri {
        const pathParts = [base.path, ...pathSegments].filter(p => p);
        return new Uri(pathParts.join('/'));
    }

    constructor(public readonly path: string) {}
    
    get fsPath(): string {
        return this.path;
    }
    
    get scheme(): string {
        return 'file';
    }
}

/* eslint-disable @typescript-eslint/naming-convention */
export enum ExtensionMode {
    Production = 1,
    Development = 2,
    Test = 3
}

export enum TreeItemCollapsibleState {
    None = 0,
    Collapsed = 1,
    Expanded = 2
}

export enum ProgressLocation {
    SourceControl = 1,
    Window = 10,
    Notification = 15
}

export enum ViewColumn {
    One = 1,
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
    Nine = 9,
    Active = -1,
    Beside = -2
}

export enum EndOfLine {
    LF = 1,
    CRLF = 2
}

export enum StatusBarAlignment {
    Left = 1,
    Right = 2
}
/* eslint-enable @typescript-eslint/naming-convention */

export interface Memento {
    keys(): readonly string[];
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    update(key: string, value: unknown): Thenable<void>;
}

export interface SecretStorage {
    get(key: string): Thenable<string | undefined>;
    store(key: string, value: string): Thenable<void>;
    delete(key: string): Thenable<void>;
    keys(): Thenable<string[]>;
    onDidChange: unknown;
}

export interface ExtensionContext {
    subscriptions: { dispose(): unknown }[];
    workspaceState: Memento;
    globalState: Memento & { setKeysForSync(keys: readonly string[]): void };
    secrets: SecretStorage;
    extensionUri: Uri;
    extensionPath: string;
    environmentVariableCollection: unknown;
    asAbsolutePath(relativePath: string): string;
    storageUri: Uri | undefined;
    storagePath: string | undefined;
    globalStorageUri: Uri;
    globalStoragePath: string;
    logUri: Uri;
    logPath: string;
    extensionMode: ExtensionMode;
    extension: unknown;
    languageModelAccessInformation: unknown;
}

/**
 * Mock ThemeColor class for colored icons
 */
export class ThemeColor {
    constructor(public readonly id: string) {}
}

/**
 * Mock ThemeIcon class for tree item icons
 */
export class ThemeIcon {
    constructor(
        public readonly id: string,
        public readonly color?: ThemeColor
    ) {}
}

/**
 * Mock MarkdownString class for formatted tooltips
 */
export class MarkdownString {
    public isTrusted: boolean = false;
    private _value: string = '';

    appendMarkdown(value: string): void {
        this._value += value;
    }

    appendText(value: string): void {
        this._value += value;
    }

    get value(): string {
        return this._value;
    }
}

/**
 * Mock Command interface for tree item actions
 */
export interface Command {
    title: string;
    command: string;
    tooltip?: string;
    arguments?: unknown[];
}

/**
 * Mock TreeItem class for tree view items
 */
export class TreeItem {
    label?: string;
    id?: string;
    iconPath?: ThemeIcon | Uri | { light: Uri; dark: Uri };
    description?: string;
    tooltip?: string;
    command?: Command;
    contextValue?: string;
    collapsibleState?: TreeItemCollapsibleState;

    constructor(label: string, collapsibleState?: TreeItemCollapsibleState) {
        this.label = label;
        this.collapsibleState = collapsibleState;
    }
}

/**
 * Event type
 */
export type Event<T> = (listener: (e: T) => unknown, thisArgs?: unknown, disposables?: { dispose(): unknown }[]) => { dispose(): unknown };

/**
 * Mock EventEmitter class for tree data changes
 */
export class EventEmitter<T> {
    private listeners: Array<(e: T) => void> = [];

    get event(): Event<T> {
        return (listener: (e: T) => void) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const index = this.listeners.indexOf(listener);
                    if (index > -1) {
                        this.listeners.splice(index, 1);
                    }
                }
            };
        };
    }

    fire(data: T): void {
        this.listeners.forEach(listener => listener(data));
    }

    dispose(): void {
        this.listeners = [];
    }
}

/**
 * Mock TreeDataProvider interface
 */
export interface TreeDataProvider<T> {
    onDidChangeTreeData?: Event<T | undefined | null | void>;
    getTreeItem(element: T): TreeItem | Thenable<TreeItem>;
    getChildren(element?: T): T[] | Thenable<T[]>;
    getParent?(element: T): T | undefined | Thenable<T | undefined>;
}

/**
 * Mock OutputChannel interface
 */
export interface OutputChannel {
    name: string;
    append(value: string): void;
    appendLine(value: string): void;
    clear(): void;
    show(preserveFocus?: boolean): void;
    hide(): void;
    dispose(): void;
}

/**
 * Mock StatusBarItem interface
 */
export interface StatusBarItem {
    alignment: StatusBarAlignment;
    priority?: number;
    text: string;
    tooltip: string | undefined;
    color: string | ThemeColor | undefined;
    command: string | Command | undefined;
    show(): void;
    hide(): void;
    dispose(): void;
}

/**
 * Mock OutputChannel implementation
 */
class MockOutputChannel implements OutputChannel {
    private content: string[] = [];

    constructor(public readonly name: string) {}

    append(value: string): void {
        this.content.push(value);
    }

    appendLine(value: string): void {
        this.content.push(value);
    }

    clear(): void {
        this.content = [];
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    show(_preserveFocus?: boolean): void {
        // Mock - no-op
    }

    hide(): void {
        // Mock - no-op
    }

    dispose(): void {
        this.content = [];
    }

    _getContent(): string {
        return this.content.join('');
    }
}

/**
 * Mock StatusBarItem implementation
 */
class MockStatusBarItem implements StatusBarItem {
    public text: string = '';
    public tooltip: string | undefined;
    public color: string | ThemeColor | undefined;
    public command: string | Command | undefined;
    private visible: boolean = false;

    constructor(
        public readonly alignment: StatusBarAlignment,
        public readonly priority?: number
    ) {}

    show(): void {
        this.visible = true;
    }

    hide(): void {
        this.visible = false;
    }

    dispose(): void {
        this.visible = false;
    }

    _isVisible(): boolean {
        return this.visible;
    }
}

/**
 * Mock WebviewPanel implementation
 */
class MockWebviewPanel implements WebviewPanel {
    private disposed = false;
    private _visible = true;
    private _active = true;
    private disposeEmitter = new EventEmitter<void>();
    private viewStateEmitter = new EventEmitter<{ readonly webviewPanel: WebviewPanel; readonly visible: boolean; readonly active: boolean }>();

    constructor(
        public readonly viewType: string,
        public title: string,
        public readonly viewColumn: ViewColumn | undefined,
        public readonly webview: Webview
    ) {}

    get visible(): boolean {
        return this._visible;
    }

    get active(): boolean {
        return this._active;
    }

    get onDidDispose(): Event<void> {
        return this.disposeEmitter.event;
    }

    get onDidChangeViewState(): Event<{ readonly webviewPanel: WebviewPanel; readonly visible: boolean; readonly active: boolean }> {
        return this.viewStateEmitter.event;
    }

    dispose(): void {
        if (!this.disposed) {
            this.disposed = true;
            this._visible = false;
            this._active = false;
            this.disposeEmitter.fire();
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    reveal(_viewColumn?: ViewColumn, _preserveFocus?: boolean): void {
        this._visible = true;
        this._active = true;
        this.viewStateEmitter.fire({ webviewPanel: this, visible: this._visible, active: this._active });
    }
}

/**
 * Mock Webview implementation
 */
class MockWebview implements Webview {
    public html: string = '';
    public options: { enableScripts: boolean; retainContextWhenHidden?: boolean; localResourceRoots?: Uri[] };
    private messageEmitter = new EventEmitter<unknown>();

    constructor(options: { enableScripts: boolean; retainContextWhenHidden?: boolean; localResourceRoots?: Uri[] }) {
        this.options = options;
    }

    get onDidReceiveMessage(): Event<unknown> {
        return this.messageEmitter.event;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    postMessage(_message: unknown): Thenable<boolean> {
        return Promise.resolve(true);
    }

    asWebviewUri(localResource: Uri): Uri {
        return localResource;
    }

    get cspSource(): string {
        return 'vscode-webview';
    }

    _fireMessage(message: unknown): void {
        this.messageEmitter.fire(message);
    }
}

/**
 * Mock window API
 */
const errorMessages: string[] = [];
const warningMessages: string[] = [];
const infoMessages: string[] = [];
const outputChannels: Map<string, OutputChannel> = new Map();
const webviewPanels: WebviewPanel[] = [];

export const window = {
    showErrorMessage: (message: string, ...items: string[]) => {
        errorMessages.push(message);
        return Promise.resolve(items[0]);
    },
    showWarningMessage: (message: string, ...items: string[]) => {
        warningMessages.push(message);
        return Promise.resolve(items[0]);
    },
    showInformationMessage: (message: string, ...items: string[]) => {
        infoMessages.push(message);
        return Promise.resolve(items[0]);
    },
    createOutputChannel: (name: string): OutputChannel => {
        if (!outputChannels.has(name)) {
            outputChannels.set(name, new MockOutputChannel(name));
        }
        return outputChannels.get(name)!;
    },
    createStatusBarItem: (alignment?: StatusBarAlignment, priority?: number): StatusBarItem => {
        return new MockStatusBarItem(alignment || StatusBarAlignment.Left, priority);
    },
    createWebviewPanel: (
        viewType: string,
        title: string,
        viewColumn: ViewColumn,
        options: { enableScripts: boolean; retainContextWhenHidden?: boolean; localResourceRoots?: Uri[] }
    ): WebviewPanel => {
        const webview = new MockWebview(options);
        const panel = new MockWebviewPanel(viewType, title, viewColumn, webview);
        webviewPanels.push(panel);
        return panel;
    },
    withProgress: async <R>(
        options: { location: ProgressLocation; title?: string; cancellable?: boolean },
        task: (progress: { report: (value: { increment?: number; message?: string }) => void }) => Promise<R>
    ): Promise<R> => {
        const progress = {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            report: (_value: { increment?: number; message?: string }) => {
                // Mock progress reporting - no-op
            }
        };
        return await task(progress);
    },
    showTextDocument: async (): Promise<unknown> => {
        // Mock - no-op, just return a resolved promise
        return Promise.resolve({});
    },
    _getErrorMessages: () => [...errorMessages],
    _getWarningMessages: () => [...warningMessages],
    _getInfoMessages: () => [...infoMessages],
    _clearMessages: () => {
        errorMessages.length = 0;
        warningMessages.length = 0;
        infoMessages.length = 0;
    },
    _getWebviewPanels: () => [...webviewPanels]
};

/**
 * Mock WorkspaceConfiguration
 */
class WorkspaceConfiguration {
    private config: { [key: string]: unknown } = {};

    get<T>(section: string): T | undefined;
    get<T>(section: string, defaultValue: T): T;
    get<T>(section: string, defaultValue?: T): T | undefined {
        const value = this.config[section];
        return value !== undefined ? (value as T) : defaultValue;
    }

    has(section: string): boolean {
        return this.config[section] !== undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    inspect<T>(_section: string): { key: string; defaultValue?: T; globalValue?: T; workspaceValue?: T; workspaceFolderValue?: T } | undefined {
        return undefined;
    }

    update(section: string, value: unknown): Thenable<void> {
        this.config[section] = value;
        return Promise.resolve();
    }

    _setConfig(section: string, value: unknown): void {
        this.config[section] = value;
    }

    _clearConfig(): void {
        this.config = {};
    }
}

const mockConfiguration = new WorkspaceConfiguration();

/**
 * Mock TextDocument interface
 */
export interface TextDocument {
    readonly uri: Uri;
    readonly fileName: string;
    readonly isUntitled: boolean;
    readonly languageId: string;
    readonly version: number;
    readonly isDirty: boolean;
    readonly isClosed: boolean;
    save(): Thenable<boolean>;
    getText(): string;
    getText(range: unknown): string;
    lineAt(line: number): { lineNumber: number; text: string; range: unknown; rangeIncludingLineBreak: unknown; firstNonWhitespaceCharacterIndex: number; isEmptyOrWhitespace: boolean };
    lineCount: number;
}

/**
 * Mock Webview interface
 */
export interface Webview {
    html: string;
    options: { enableScripts: boolean; retainContextWhenHidden?: boolean; localResourceRoots?: Uri[] };
    onDidReceiveMessage: Event<unknown>;
    postMessage(message: unknown): Thenable<boolean>;
    asWebviewUri(localResource: Uri): Uri;
    cspSource: string;
}

/**
 * Mock WebviewPanel interface
 */
export interface WebviewPanel {
    readonly viewType: string;
    readonly title: string;
    readonly webview: Webview;
    readonly viewColumn: ViewColumn | undefined;
    readonly visible: boolean;
    readonly active: boolean;
    readonly onDidDispose: Event<void>;
    readonly onDidChangeViewState: Event<{ readonly webviewPanel: WebviewPanel; readonly visible: boolean; readonly active: boolean }>;
    dispose(): void;
    reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void;
}

/**
 * Mock Position class for text editor positions
 */
export class Position {
    constructor(
        public readonly line: number,
        public readonly character: number
    ) {}
}

/**
 * Mock Range class for text editor ranges
 */
export class Range {
    constructor(
        public readonly start: Position,
        public readonly end: Position
    ) {}

    static fromPositions(start: Position, end: Position): Range {
        return new Range(start, end);
    }

    isEmpty: boolean = false;
}

/**
 * Mock Selection class for text editor selections
 */
export class Selection extends Range {
    constructor(
        anchorLine: number,
        anchorCharacter: number,
        activeLine: number,
        activeCharacter: number
    ) {
        super(
            new Position(anchorLine, anchorCharacter),
            new Position(activeLine, activeCharacter)
        );
    }

    get anchor(): Position {
        return this.start;
    }

    get active(): Position {
        return this.end;
    }
}

/**
 * Mock workspace API
 */
const workspaceEventEmitter = new EventEmitter<TextDocument>();
const textDocuments: Map<string, TextDocument> = new Map();

/**
 * Mock TextDocument implementation
 */
class MockTextDocument implements TextDocument {
    constructor(
        public readonly uri: Uri,
        public readonly fileName: string,
        public readonly isUntitled: boolean = false,
        public readonly languageId: string = 'plaintext',
        public readonly version: number = 1,
        public readonly isDirty: boolean = false,
        public readonly isClosed: boolean = false,
        private content: string = ''
    ) {}

    save(): Thenable<boolean> {
        return Promise.resolve(true);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getText(_range?: unknown): string {
        return this.content;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    lineAt(_line: number): { lineNumber: number; text: string; range: unknown; rangeIncludingLineBreak: unknown; firstNonWhitespaceCharacterIndex: number; isEmptyOrWhitespace: boolean } {
        return {
            lineNumber: 0,
            text: '',
            range: {},
            rangeIncludingLineBreak: {},
            firstNonWhitespaceCharacterIndex: 0,
            isEmptyOrWhitespace: true
        };
    }

    lineCount: number = 1;
}

export const workspace = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getConfiguration: (_section?: string) => {
        return mockConfiguration;
    },
    onDidCloseTextDocument: workspaceEventEmitter.event,
    openTextDocument: (uriOrFileName: Uri | string): Thenable<TextDocument> => {
        const path = typeof uriOrFileName === 'string' ? uriOrFileName : uriOrFileName.fsPath;
        let doc = textDocuments.get(path);
        if (!doc) {
            const uri = typeof uriOrFileName === 'string' ? Uri.file(uriOrFileName) : uriOrFileName;
            doc = new MockTextDocument(uri, path);
            textDocuments.set(path, doc);
        }
        return Promise.resolve(doc);
    },
    _getConfiguration: () => mockConfiguration,
    _fireDidCloseTextDocument: (document: TextDocument) => {
        workspaceEventEmitter.fire(document);
    },
    _clearDocuments: (): void => {
        textDocuments.clear();
    }
};

/**
 * Mock commands API
 */
const commandHandlers: Map<string, (...args: unknown[]) => Thenable<unknown>> = new Map();

export const commands = {
    executeCommand: <T = unknown>(command: string, ...rest: unknown[]): Thenable<T> => {
        const handler = commandHandlers.get(command);
        if (handler) {
            return handler(...rest) as Thenable<T>;
        }
        // Default behavior: throw error for unregistered commands (for testing)
        return Promise.reject(new Error(`Command '${command}' is not registered`));
    },
    registerCommand: (command: string, callback: (...args: unknown[]) => unknown): { dispose(): void } => {
        commandHandlers.set(command, async (...args: unknown[]) => {
            return await callback(...args);
        });
        return {
            dispose: () => {
                commandHandlers.delete(command);
            }
        };
    },
    _registerCommand: (command: string, handler: (...args: unknown[]) => Thenable<unknown>): void => {
        commandHandlers.set(command, handler);
    },
    _unregisterCommand: (command: string): void => {
        commandHandlers.delete(command);
    }
};

/**
 * Mock clipboard API
 */
let clipboardText = '';

export const clipboard = {
    writeText: (text: string): Thenable<void> => {
        clipboardText = text;
        return Promise.resolve();
    },
    readText: (): Thenable<string> => {
        return Promise.resolve(clipboardText);
    },
    _getText: (): string => {
        return clipboardText;
    },
    _clear: (): void => {
        clipboardText = '';
    }
};

/**
 * Mock env API
 */
let openedUris: Uri[] = [];

export const env = {
    openExternal: (uri: Uri): Thenable<boolean> => {
        openedUris.push(uri);
        return Promise.resolve(true);
    },
    _getOpenedUris: (): Uri[] => {
        return [...openedUris];
    },
    _clearOpenedUris: (): void => {
        openedUris = [];
    },
    clipboard
};

/**
 * Mock extensions API
 */
const mockExtensions: Map<string, { packageJSON: { version: string } }> = new Map();

export const extensions = {
    getExtension: (extensionId: string): { packageJSON: { version: string } } | undefined => {
        return mockExtensions.get(extensionId);
    },
    _setExtension: (extensionId: string, version: string): void => {
        mockExtensions.set(extensionId, { packageJSON: { version } });
    },
    _clearExtensions: (): void => {
        mockExtensions.clear();
    }
};

/**
 * Module exports object that provides all vscode API components
 * This allows code to access vscode.ProgressLocation.Notification etc.
 * When using require('vscode'), this object structure is returned.
 */
/* eslint-disable @typescript-eslint/naming-convention */
const vscodeModule = {
    Uri,
    ExtensionMode,
    TreeItemCollapsibleState,
    ProgressLocation,
    ViewColumn,
    EndOfLine,
    StatusBarAlignment,
    ThemeColor,
    ThemeIcon,
    MarkdownString,
    TreeItem,
    Position,
    Range,
    Selection,
    EventEmitter,
    window,
    workspace,
    commands,
    env,
    extensions,
    version: '1.80.0'
};
/* eslint-enable @typescript-eslint/naming-convention */

// Export both as default and as module.exports for CommonJS compatibility
export default vscodeModule;

// For CommonJS require() compatibility
if (typeof module !== 'undefined' && module.exports) {
    // Copy all exports to module.exports
    /* eslint-disable @typescript-eslint/naming-convention */
    Object.assign(module.exports, {
        Uri,
        ExtensionMode,
        TreeItemCollapsibleState,
        ProgressLocation,
        ViewColumn,
        EndOfLine,
        StatusBarAlignment,
        ThemeColor,
        ThemeIcon,
        MarkdownString,
        TreeItem,
        Position,
        Range,
        Selection,
        EventEmitter,
        window,
        workspace,
        commands,
        env,
        extensions,
        version: '1.80.0'
    });
    /* eslint-enable @typescript-eslint/naming-convention */
}

