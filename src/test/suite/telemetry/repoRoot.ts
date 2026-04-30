import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve repository root from a test file living under out/src/test/...
 */
export function resolveRepoRootFromTestFile(startDir: string): string {
    let dir = startDir;
    for (;;) {
        const pkg = path.join(dir, 'package.json');
        const rules = path.join(dir, 'eslint-rules');
        if (fs.existsSync(pkg) && fs.existsSync(rules)) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            throw new Error('Could not resolve repository root from test file');
        }
        dir = parent;
    }
}
