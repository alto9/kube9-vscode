/**
 * Narrow helper for surfacing-major webviews — keeps imports one line at {@code createWebviewPanel} call sites.
 */

import type { WebviewTelemetrySurface } from './productTelemetry';
import { getProductTelemetryFacade } from './vscodeExtensionTelemetry';

export function notifyMajorWebviewOpened(surface: WebviewTelemetrySurface): void {
    getProductTelemetryFacade().reportWebviewSurfaceOpened(surface);
}
