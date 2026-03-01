import * as assert from 'assert';
import { spawnCalls, clearSpawnCalls } from '../../mocks/child_process';
import { PortForwardManager, PortForwardConfig, PortForwardInfo } from '../../../services/PortForwardManager';

suite('PortForwardManager Test Suite', () => {
    let nextPort = 50100;

    setup(() => {
        clearSpawnCalls();
    });

    teardown(async () => {
        await PortForwardManager.getInstance().stopAllForwards();
    });

    test('validateConfig rejects Service config without serviceName', async () => {
        const manager = PortForwardManager.getInstance();
        const config: PortForwardConfig = {
            resourceType: 'service',
            namespace: 'default',
            context: 'minikube',
            localPort: 18080,
            remotePort: 8080
        };

        await assert.rejects(
            async () => manager.startForward(config),
            /Service name is required when resourceType is "service"/
        );
        assert.strictEqual(spawnCalls.length, 0);
    });

    test('validateConfig accepts valid Pod config (backward compatibility)', async () => {
        const manager = PortForwardManager.getInstance();
        const config: PortForwardConfig = {
            podName: 'test-pod',
            namespace: 'default',
            context: 'minikube',
            localPort: nextPort++,
            remotePort: 8080
        };

        const result = await manager.startForward(config);

        assert.strictEqual(spawnCalls.length, 1);
        assert.strictEqual(spawnCalls[0].command, 'kubectl');
        assert.ok(spawnCalls[0].args.includes('pod/test-pod'));
        assert.strictEqual(result.resourceType, 'pod');
        assert.strictEqual(result.resourceName, 'test-pod');
        assert.strictEqual(result.podName, 'test-pod');
    });

    test('buildKubectlCommand produces service/<name> for resourceType service', async () => {
        const manager = PortForwardManager.getInstance();
        const config: PortForwardConfig = {
            resourceType: 'service',
            serviceName: 'my-service',
            namespace: 'default',
            context: 'minikube',
            localPort: nextPort++,
            remotePort: 80
        };

        await manager.startForward(config);

        assert.strictEqual(spawnCalls.length, 1);
        assert.ok(spawnCalls[0].args.includes('service/my-service'));
        assert.ok(!spawnCalls[0].args.includes('-c'));
    });

    test('buildKubectlCommand produces pod/<name> for resourceType pod', async () => {
        const manager = PortForwardManager.getInstance();
        const config: PortForwardConfig = {
            resourceType: 'pod',
            podName: 'my-pod',
            namespace: 'default',
            context: 'minikube',
            localPort: nextPort++,
            remotePort: 8080
        };

        await manager.startForward(config);

        assert.strictEqual(spawnCalls.length, 1);
        assert.ok(spawnCalls[0].args.includes('pod/my-pod'));
    });

    test('buildKubectlCommand defaults to pod when resourceType is undefined', async () => {
        const manager = PortForwardManager.getInstance();
        const config: PortForwardConfig = {
            podName: 'legacy-pod',
            namespace: 'default',
            context: 'minikube',
            localPort: nextPort++,
            remotePort: 9090
        };

        await manager.startForward(config);

        assert.strictEqual(spawnCalls.length, 1);
        assert.ok(spawnCalls[0].args.includes('pod/legacy-pod'));
    });

    test('buildKubectlCommand includes containerName for pod resourceType only', async () => {
        const manager = PortForwardManager.getInstance();
        const config: PortForwardConfig = {
            resourceType: 'pod',
            podName: 'multi-container-pod',
            containerName: 'app',
            namespace: 'default',
            context: 'minikube',
            localPort: nextPort++,
            remotePort: 8080
        };

        await manager.startForward(config);

        assert.strictEqual(spawnCalls.length, 1);
        const args = spawnCalls[0].args;
        assert.ok(args.includes('-c'));
        const cIndex = args.indexOf('-c');
        assert.strictEqual(args[cIndex + 1], 'app');
    });

    test('getForwardInfo includes resourceType and resourceName', async () => {
        const manager = PortForwardManager.getInstance();
        const config: PortForwardConfig = {
            resourceType: 'service',
            serviceName: 'svc-forward',
            namespace: 'kube-system',
            context: 'test-context',
            localPort: nextPort++,
            remotePort: 443
        };

        const info = await manager.startForward(config);

        assert.strictEqual(info.resourceType, 'service');
        assert.strictEqual(info.resourceName, 'svc-forward');
        assert.strictEqual(info.podName, 'svc-forward');
        assert.strictEqual(info.namespace, 'kube-system');
        assert.strictEqual(info.context, 'test-context');
        assert.strictEqual(info.localPort, config.localPort);
        assert.strictEqual(info.remotePort, 443);
    });

    test('findExistingForward distinguishes Pod vs Service forwards with same name', async () => {
        const manager = PortForwardManager.getInstance();

        const podConfig: PortForwardConfig = {
            resourceType: 'pod',
            podName: 'shared-name',
            namespace: 'default',
            context: 'minikube',
            localPort: nextPort++,
            remotePort: 8080
        };

        const serviceConfig: PortForwardConfig = {
            resourceType: 'service',
            serviceName: 'shared-name',
            namespace: 'default',
            context: 'minikube',
            localPort: nextPort++,
            remotePort: 80
        };

        const podForward = await manager.startForward(podConfig);
        const serviceForward = await manager.startForward(serviceConfig);

        assert.strictEqual(podForward.resourceType, 'pod');
        assert.strictEqual(serviceForward.resourceType, 'service');
        assert.notStrictEqual(podForward.id, serviceForward.id);

        const allForwards = manager.getAllForwards();
        const podForwards = allForwards.filter((f: PortForwardInfo) => f.resourceType === 'pod' && f.resourceName === 'shared-name');
        const serviceForwards = allForwards.filter((f: PortForwardInfo) => f.resourceType === 'service' && f.resourceName === 'shared-name');
        assert.strictEqual(podForwards.length, 1);
        assert.strictEqual(serviceForwards.length, 1);
    });

    test('validateConfig rejects invalid resourceType', async () => {
        const manager = PortForwardManager.getInstance();
        const config = {
            resourceType: 'deployment',
            podName: 'test',
            namespace: 'default',
            context: 'ctx',
            localPort: nextPort++,
            remotePort: 8080
        } as unknown as PortForwardConfig;

        await assert.rejects(
            async () => manager.startForward(config),
            /resourceType must be "pod" or "service"/
        );
    });
});
