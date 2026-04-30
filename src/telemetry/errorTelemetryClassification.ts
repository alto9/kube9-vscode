/**
 * Maps runtime failures into {@link ErrorType} buckets for telemetry (no paths, stacks, or free-form strings).
 */

import { ErrorType } from '../errors/types';
import { HelmError, HelmErrorType } from '../services/HelmError';
import { KubectlError, KubectlErrorType } from '../kubernetes/KubectlError';

/** Classify arbitrary failures for coerce-outcome telemetry payloads. Never forwards raw messages. */
export function telemetryErrorTypeFromUnknown(failure: unknown): ErrorType {
    if (failure instanceof KubectlError) {
        switch (failure.type) {
            case KubectlErrorType.ConnectionFailed:
                return ErrorType.CONNECTION;
            case KubectlErrorType.PermissionDenied:
                return ErrorType.RBAC;
            case KubectlErrorType.Timeout:
                return ErrorType.TIMEOUT;
            case KubectlErrorType.BinaryNotFound:
                return ErrorType.VALIDATION;
            default:
                return ErrorType.UNEXPECTED;
        }
    }

    if (failure instanceof HelmError) {
        switch (failure.type) {
            case HelmErrorType.NETWORK_ERROR:
                return ErrorType.CONNECTION;
            case HelmErrorType.KUBECONFIG_ERROR:
                return ErrorType.VALIDATION;
            case HelmErrorType.INVALID_INPUT:
                return ErrorType.VALIDATION;
            case HelmErrorType.RESOURCE_NOT_FOUND:
                return ErrorType.NOT_FOUND;
            case HelmErrorType.TIMEOUT:
                return ErrorType.TIMEOUT;
            case HelmErrorType.CLI_NOT_FOUND:
                return ErrorType.VALIDATION;
            default:
                return ErrorType.UNEXPECTED;
        }
    }

    return ErrorType.UNEXPECTED;
}
