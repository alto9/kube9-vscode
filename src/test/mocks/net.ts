/**
 * Mock net module for PortForwardManager tests.
 * Makes isPortAvailable always return true by having createServer().listen()
 * immediately emit 'listening'.
 */

import { EventEmitter } from 'events';

function createServer(): {
    once: (event: string, cb: () => void) => void;
    listen: (port: number, host: string) => void;
    close: (cb?: () => void) => void;
} {
    const server = new EventEmitter() as EventEmitter & {
        once: (event: string, cb: () => void) => void;
        listen: (port: number, host: string) => void;
        close: (cb?: () => void) => void;
    };
    server.once = EventEmitter.prototype.once.bind(server) as typeof server.once;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature must match net.Server
    server.listen = function (_port?: number, _host?: string) {
        setImmediate(() => {
            server.emit('listening');
        });
    };
    server.close = function (cb?: () => void) {
        if (cb) {
            setImmediate(cb);
        }
    };
    return server;
}

export { createServer };
