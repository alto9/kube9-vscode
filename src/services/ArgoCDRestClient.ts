import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import type { ArgoCDResourceTreeResponse } from '../types/argocdResourceTree';
import type { ArgoCDRestAuthContext } from './ArgoCDRestAuthResolver';
import { readNumberSetting } from './contextSettings';

export class ArgoCDRestClientError extends Error {
    constructor(
        message: string,
        readonly statusCode?: number
    ) {
        super(message);
        this.name = 'ArgoCDRestClientError';
    }
}

interface HttpResponse {
    ok: boolean;
    status: number;
    statusText: string;
    text(): Promise<string>;
    json<T>(): Promise<T>;
}

function redactErrorMessage(message: string): string {
    return message
        .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
        .replace(/token[=:]\s*\S+/gi, 'token=[redacted]')
        .replace(/kubeconfig[=:]\s*\S+/gi, 'kubeconfig=[redacted]');
}

function buildResourceTreeUrl(baseUrl: string, applicationName: string, applicationNamespace: string): string {
    const url = new URL(
        `/api/v1/applications/${encodeURIComponent(applicationName)}/resource-tree`,
        `${baseUrl}/`
    );
    if (applicationNamespace.trim() !== '') {
        url.searchParams.set('appNamespace', applicationNamespace);
    }
    return url.toString();
}

function requestJson(url: string, auth: ArgoCDRestAuthContext, timeoutMs: number): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const transport = parsed.protocol === 'https:' ? https : http;
        const request = transport.request(
            parsed,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${auth.bearerToken}`,
                    Accept: 'application/json'
                },
                rejectUnauthorized: !auth.tlsInsecure
            },
            (response) => {
                const chunks: Buffer[] = [];
                response.on('data', (chunk: Buffer) => chunks.push(chunk));
                response.on('end', () => {
                    const body = Buffer.concat(chunks).toString('utf8');
                    const status = response.statusCode ?? 0;
                    resolve({
                        ok: status >= 200 && status < 300,
                        status,
                        statusText: response.statusMessage ?? '',
                        text: async () => body,
                        json: async <T>() => JSON.parse(body) as T
                    });
                });
            }
        );

        request.setTimeout(timeoutMs, () => {
            request.destroy(new Error('Argo CD resource-tree request timed out'));
        });
        request.on('error', reject);
        request.end();
    });
}

export async function fetchApplicationResourceTree(
    auth: ArgoCDRestAuthContext,
    applicationName: string,
    applicationNamespace: string
): Promise<ArgoCDResourceTreeResponse> {
    const timeoutMs = readNumberSetting('kube9', 'timeout.apiRequest', 30_000);
    const url = buildResourceTreeUrl(auth.baseUrl, applicationName, applicationNamespace);

    try {
        const response = await requestJson(url, auth, timeoutMs);

        if (!response.ok) {
            const body = await response.text();
            const detail = body.trim() === '' ? response.statusText : body;
            throw new ArgoCDRestClientError(
                redactErrorMessage(
                    `Argo CD resource-tree request failed (${response.status}): ${detail}`
                ),
                response.status
            );
        }

        return await response.json<ArgoCDResourceTreeResponse>();
    } catch (error) {
        if (error instanceof ArgoCDRestClientError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new ArgoCDRestClientError(redactErrorMessage(message));
    }
}

export { buildResourceTreeUrl };
