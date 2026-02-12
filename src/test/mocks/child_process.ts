/**
 * Mock child_process module for PortForwardManager tests.
 * Exports a mock spawn that captures calls and returns a fake process.
 */

import { EventEmitter } from 'events';

export interface SpawnCall {
    command: string;
    args: string[];
}

export const spawnCalls: SpawnCall[] = [];

export function clearSpawnCalls(): void {
    spawnCalls.length = 0;
}

function createMockProcess(): {
    pid: number;
    stdout: EventEmitter & { on: (event: string, cb: (data: Buffer) => void) => EventEmitter };
    stderr: EventEmitter;
    on: (event: string, cb: (...args: unknown[]) => void) => EventEmitter;
    kill: (signal?: string) => boolean;
    killed: boolean;
} {
    const stdout = new EventEmitter() as EventEmitter & {
        on: (event: string, cb: (data: Buffer) => void) => EventEmitter;
    };
    const originalOn = stdout.on.bind(stdout);
    stdout.on = function (event: string, cb: (data: Buffer) => void) {
        originalOn(event, cb);
        if (event === 'data') {
            setImmediate(() => stdout.emit('data', Buffer.from('Forwarding from 127.0.0.1:8080 -> 8080')));
        }
        return stdout;
    };

    const stderr = new EventEmitter();
    const process = new EventEmitter() as EventEmitter & {
        pid: number;
        stdout: typeof stdout;
        stderr: typeof stderr;
        on: (event: string, cb: (...args: unknown[]) => void) => EventEmitter;
        kill: (signal?: string) => boolean;
        killed: boolean;
    };
    process.pid = 12345;
    process.stdout = stdout;
    process.stderr = stderr;
    process.killed = false;
    process.on = EventEmitter.prototype.on.bind(process) as typeof process.on;
    process.kill = (signal?: string) => {
        process.killed = true;
        setImmediate(() => process.emit('exit', null, signal ?? 'SIGTERM'));
        return true;
    };
    return process;
}

export function spawn(
    command: string,
    argsOrOptions?: string[] | object
): ReturnType<typeof import('child_process').spawn> {
    const args = Array.isArray(argsOrOptions) ? argsOrOptions : [];
    spawnCalls.push({ command, args });
    return createMockProcess() as ReturnType<typeof import('child_process').spawn>;
}

// Re-export other child_process exports that might be needed
export const exec = (): never => {
    throw new Error('Not mocked');
};
export const execSync = (): never => {
    throw new Error('Not mocked');
};
export const fork = (): never => {
    throw new Error('Not mocked');
};
