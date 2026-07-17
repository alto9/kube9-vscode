import * as assert from 'assert';
import * as vscode from 'vscode';
import {
    OperatorResourceTreeClient,
    buildResourceTreeQueryArgs,
    parseOperatorResourceTreeStderr,
    parseOperatorResourceTreeStdout,
    setOperatorExecFnForTesting,
    type OperatorExecFn
} from '../../../services/OperatorResourceTreeClient';

suite('OperatorResourceTreeClient', () => {
    teardown(() => {
        setOperatorExecFnForTesting(undefined);
    });

    test('buildResourceTreeQueryArgs matches kube9-operator#151 CLI shape', () => {
        assert.deepStrictEqual(buildResourceTreeQueryArgs('guestbook', 'argocd'), [
            'kube9-operator',
            'query',
            'argocd',
            'resource-tree',
            'get',
            'guestbook',
            '--namespace=argocd',
            '--format=json'
        ]);
    });

    test('parseOperatorResourceTreeStdout accepts raw Argo CD JSON', () => {
        const parsed = parseOperatorResourceTreeStdout(
            JSON.stringify({
                nodes: [{ kind: 'Deployment', name: 'ui', namespace: 'guestbook' }]
            })
        );
        assert.ok(parsed);
        assert.strictEqual(parsed?.nodes?.length, 1);
    });

    test('parseOperatorResourceTreeStderr maps structured error envelope code', () => {
        const parsed = parseOperatorResourceTreeStderr(
            JSON.stringify({
                ok: false,
                code: 'APPLICATION_NOT_FOUND',
                message: 'Application not found'
            })
        );
        assert.strictEqual(parsed.code, 'APPLICATION_NOT_FOUND');
        assert.strictEqual(parsed.message, 'Application not found');
    });

    test('fetchResourceTree returns parsed resource tree on success', async () => {
        const execFn: OperatorExecFn = async () => ({
            stdout: JSON.stringify({ nodes: [{ kind: 'Pod', name: 'ui-1', namespace: 'guestbook' }] }),
            stderr: ''
        });
        setOperatorExecFnForTesting(execFn);

        const client = new OperatorResourceTreeClient();
        const result = await client.fetchResourceTree({
            clusterContext: 'minikube',
            applicationName: 'guestbook',
            applicationNamespace: 'argocd'
        });

        assert.strictEqual(result.ok, true);
        if (result.ok) {
            assert.strictEqual(result.resourceTree.nodes?.length, 1);
        }
    });

    test('fetchResourceTree maps structured stderr failure to result code', async () => {
        const execFn: OperatorExecFn = async () => ({
            stdout: '',
            stderr: JSON.stringify({
                ok: false,
                code: 'APPLICATION_NOT_FOUND',
                message: 'missing app'
            })
        });
        setOperatorExecFnForTesting(execFn);

        const client = new OperatorResourceTreeClient();
        const result = await client.fetchResourceTree({
            clusterContext: 'minikube',
            applicationName: 'guestbook',
            applicationNamespace: 'argocd'
        });

        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.strictEqual(result.code, 'APPLICATION_NOT_FOUND');
        }
    });

    test('fetchResourceTree respects cancellation before exec', async () => {
        let execCalled = false;
        setOperatorExecFnForTesting(async () => {
            execCalled = true;
            return { stdout: '{}', stderr: '' };
        });

        const source = new vscode.CancellationTokenSource();
        source.cancel();

        const client = new OperatorResourceTreeClient();
        await assert.rejects(
            client.fetchResourceTree({
                clusterContext: 'minikube',
                applicationName: 'guestbook',
                applicationNamespace: 'argocd',
                cancellationToken: source.token
            }),
            vscode.CancellationError
        );
        assert.strictEqual(execCalled, false);
    });
});
