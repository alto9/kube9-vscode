import * as assert from 'assert';
import { ESLint } from 'eslint';
import * as path from 'path';
import { resolveRepoRootFromTestFile } from './repoRoot';

suite('telemetry ESLint guardrail proof (#135, #138)', () => {
    test('kube9-telemetry-payload-guard flags template interpolation, error arg, and new Error()', async function () {
        this.timeout(30_000);
        const root = resolveRepoRootFromTestFile(__dirname);
        const eslint = new ESLint({
            cwd: root,
            // rulePaths maps to --rulesdir; supported at runtime, omitted from some ESLint @types revisions
            ...( { rulePaths: [path.join(root, 'eslint-rules')] } as { rulePaths: string[] } ),
        });
        const telemetryFixturePath = path.join(root, 'src', 'telemetry', '_fixture_guard.ts');

        const cases: Array<{ name: string; code: string; expectViolation: boolean }> = [
            {
                name: 'template literal interpolation in call argument',
                code: `declare const sink: { send: (s: string) => void };
function bad(arg: string): void {
  sink.send(\`evt_\${arg}\`);
}
`,
                expectViolation: true,
            },
            {
                name: 'passing identifier named error',
                code: `declare const sink: { send: (e: unknown) => void };
function bad(error: Error): void {
  sink.send(error);
}
`,
                expectViolation: true,
            },
            {
                name: 'new Error() as argument',
                code: `declare const sink: { send: (e: unknown) => void };
function bad(): void {
  sink.send(new Error('x'));
}
`,
                expectViolation: true,
            },
            {
                name: 'clean static literal',
                code: `declare const sink: { send: (s: string) => void };
function ok(): void {
  sink.send('kube9.product.safe');
}
`,
                expectViolation: false,
            },
        ];

        for (const c of cases) {
            const [result] = await eslint.lintText(c.code, { filePath: telemetryFixturePath });
            const guardMessages = result.messages.filter((m) => m.ruleId === 'kube9-telemetry-payload-guard');
            if (c.expectViolation) {
                assert.ok(
                    guardMessages.length > 0,
                    `${c.name}: expected kube9-telemetry-payload-guard violation; messages=${JSON.stringify(
                        result.messages
                    )}`
                );
            } else {
                assert.deepStrictEqual(
                    guardMessages,
                    [],
                    `${c.name}: expected no guard violations; got ${JSON.stringify(guardMessages)}`
                );
            }
        }
    });
});
