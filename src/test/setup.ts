/**
 * Test setup file
 * This file is loaded before any tests run to set up the testing environment.
 * It registers the vscode mock so that modules can import 'vscode' in tests.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-rest-params */

import * as Module from 'module';
import * as path from 'path';

// Get the original require function
const originalRequire = Module.prototype.require;

// Override Module.prototype.require to intercept 'vscode' imports
Module.prototype.require = function (this: any, id: string): any {
    // If the module being required is 'vscode', return our mock instead
    if (id === 'vscode') {
        // Try both possible paths (old structure and new structure with rootDir=".")
        const possiblePaths = [
            path.join(__dirname, 'mocks', 'vscode'), // Old: out/test/mocks/vscode
            path.join(__dirname, '..', 'src', 'test', 'mocks', 'vscode') // New: out/src/test/mocks/vscode
        ];
        
        for (const mockPath of possiblePaths) {
            try {
                return originalRequire.call(this, mockPath);
            } catch (e) {
                // Try next path
            }
        }
        
        // Fallback to old path
        return originalRequire.call(this, path.join(__dirname, 'mocks', 'vscode'));
    }

    // If the module being required is 'child_process' from PortForwardManager, use mock
    if (id === 'child_process') {
        const requestingPath = (this.filename || this.id || '') as string;
        if (requestingPath.includes('PortForwardManager')) {
            const mockPath = path.join(__dirname, 'mocks', 'child_process');
            return originalRequire.call(this, mockPath);
        }
    }

    // If the module being required is 'net' from PortForwardManager, use mock (for isPortAvailable)
    if (id === 'net') {
        const requestingPath = (this.filename || this.id || '') as string;
        if (requestingPath.includes('PortForwardManager')) {
            const mockPath = path.join(__dirname, 'mocks', 'net');
            return originalRequire.call(this, mockPath);
        }
    }

    // Otherwise, use the original require
    return originalRequire.apply(this, arguments as any);
};

