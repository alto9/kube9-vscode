import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { ErrorType } from '../../../errors/types';
import { buildKube9TelemetryCommandAllowlistFromPackageJson } from '../../../telemetry/commandAllowlist';
import {
    ProductTelemetryEventName,
    SHIPPED_WEBVIEW_TELEMETRY_SURFACES_CONST,
} from '../../../telemetry/productTelemetry';
import { telemetryPropertiesToPayload } from '../../../telemetry/vscodeExtensionTelemetry';
import { violationsForTelemetryPayloadJson } from './forbidListPayloadPatterns';
import { resolveRepoRootFromTestFile } from './repoRoot';

suite('telemetry payload forbid-list verification (#135)', () => {
    test('golden catalog payloads serialize with no heuristic violations', () => {
        const root = resolveRepoRootFromTestFile(__dirname);
        const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as Record<
            string,
            unknown
        >;
        const commandKeys = [...buildKube9TelemetryCommandAllowlistFromPackageJson(pkg)];

        const bodies: Array<{ label: string; payload: Record<string, string> }> = [];

        for (const commandKey of commandKeys) {
            bodies.push({
                label: `command success ${commandKey}`,
                payload: telemetryPropertiesToPayload({
                    outcome: 'success',
                    commandKey,
                }),
            });
            for (const errorBucket of Object.values(ErrorType)) {
                bodies.push({
                    label: `command failure ${commandKey} / ${errorBucket}`,
                    payload: telemetryPropertiesToPayload({
                        outcome: 'failure',
                        errorBucket,
                        commandKey,
                    }),
                });
            }
            bodies.push({
                label: `feature usage ${commandKey}`,
                payload: telemetryPropertiesToPayload({ commandKey }),
            });
        }

        for (const surf of SHIPPED_WEBVIEW_TELEMETRY_SURFACES_CONST) {
            bodies.push({
                label: `webview ${surf}`,
                payload: telemetryPropertiesToPayload({ webviewSurface: surf }),
            });
        }

        for (const outcome of ['success', 'failure'] as const) {
            if (outcome === 'success') {
                bodies.push({
                    label: 'extension activated success',
                    payload: telemetryPropertiesToPayload({ outcome }),
                });
            } else {
                for (const errorBucket of Object.values(ErrorType)) {
                    bodies.push({
                        label: `extension activated failure / ${errorBucket}`,
                        payload: telemetryPropertiesToPayload({ outcome, errorBucket }),
                    });
                }
            }
        }

        for (const { label, payload } of bodies) {
            const json = JSON.stringify(payload);
            const bad = violationsForTelemetryPayloadJson(json);
            assert.deepStrictEqual(
                bad,
                [],
                `${label}: expected no forbid-list heuristic violations; json=${json}; got: ${bad.join('; ')}`
            );
        }
    });

    test('event name strings are stable catalog keys (no accidental cluster-ish tokens)', () => {
        for (const ev of Object.values(ProductTelemetryEventName)) {
            const eventKey = String(ev);
            assert.match(eventKey, /^kube9\.product(\.[a-z0-9_]+)+$/, `event key shape: ${ev}`);
            const bad = violationsForTelemetryPayloadJson(JSON.stringify({ eventKey }));
            assert.deepStrictEqual(
                bad,
                [],
                `event key should not trip forbid-list heuristics: ${ev}`
            );
        }
    });
});
