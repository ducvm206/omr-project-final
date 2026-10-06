// src/api/client.ts

/**
 * Shared HTTP client for the OMR server API.
 *
 * Responsibilities:
 *   - prepends API_BASE_URL
 *   - sends `credentials: 'include'` (session cookie)
 *   - sets JSON headers when a body is provided
 *   - parses JSON responses and JSON error bodies
 *   - normalizes every failure into an ApiError
 *
 * Endpoint files should call `apiFetch` (or `apiFetchBlob`) instead of
 * `fetch` directly.
 */

/**
 * Base URL for all API requests.
 * Empty string means "same origin" (useful with a Vite dev proxy).
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Field-level validation errors returned by the backend (HTTP 400).
 * Shape: { fieldName: errorMessage }
 */
export type ValidationErrors = Record<string, string>;

/**
 * Uniform error thrown by every API call.
 * `status` is 0 for network/timeout failures.
 */
export class ApiError extends Error {
    public readonly status: number;
    public readonly validationErrors?: ValidationErrors;

    constructor(status: number, message: string, validationErrors?: ValidationErrors) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.validationErrors = validationErrors;
    }
}

/**
 * Options accepted by apiFetch. Mirrors RequestInit but narrows `body`
 * to a JS value that will be JSON-serialized.
 */
export interface ApiFetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /** Serialized to JSON automatically. Omit for bodyless requests. */
    body?: unknown;
    /** Caller-supplied abort signal (combined with timeout). */
    signal?: AbortSignal;
    /** Per-request timeout in ms. 0 disables. Default 30_000. */
    timeoutMs?: number;
    /** Extra headers merged after the defaults. */
    headers?: Record<string, string>;
    /** Override the default `'include'`. */
    credentials?: RequestCredentials;
}

/**
 * Try to parse a JSON body without throwing.
 */
async function safeJson<T>(response: Response): Promise<T | null> {
    try {
        return (await response.json()) as T;
    } catch {
        return null;
    }
}

/**
 * Best-effort extraction of a human-readable message from a failed
 * response. Handles all the shapes the backend produces:
 *   - { field: message }         -> validation errors
 *   - { error: message }         -> Student/Template endpoints
 *   - { authError: message }     -> Login endpoint
 *   - "plain string"             -> Grade/Exam/Course endpoints
 *   - ""                         -> fallback message
 */
async function extractError(
    response: Response,
    fallbackMessage: string,
): Promise<{ message: string; validationErrors?: ValidationErrors }> {
    // Try JSON first.
    const json = await safeJson<
        Record<string, unknown> | string | null
    >(response.clone());

    if (json && typeof json === 'object') {
        // { error: "..." }
        if (typeof json.error === 'string') {
            return { message: json.error };
        }
        // { authError: "..." }
        if (typeof json.authError === 'string') {
            return { message: json.authError };
        }
        // { field: message, ... } — validation errors
        const entries = Object.entries(json).filter(
            ([, v]) => typeof v === 'string',
        ) as [string, string][];
        if (entries.length > 0) {
            const [firstField, firstMessage] = entries[0];
            const validationErrors: ValidationErrors = {};
            for (const [k, v] of entries) validationErrors[k] = v;
            return {
                message: firstMessage || `Invalid value for ${firstField}`,
                validationErrors,
            };
        }
    }

    // Plain string body (Grade/Exam/Course error style).
    if (typeof json === 'string' && json.length > 0) {
        return { message: json };
    }

    // Some responses aren't JSON at all — read as text.
    try {
        const text = await response.text();
        if (text) return { message: text };
    } catch {
        // ignore
    }

    return { message: fallbackMessage };
}

/**
 * Core request function.
 *
 * @param path    Path beginning with `/`, e.g. `/api/students`.
 * @param options Method, body, timeout, signal, headers.
 * @returns       Parsed JSON body (or `undefined` for empty responses).
 * @throws ApiError on any non-2xx or network/timeout failure.
 */
export async function apiFetch<T>(
    path: string,
    options: ApiFetchOptions = {},
): Promise<T> {
    const {
        method = 'GET',
        body,
        signal,
        timeoutMs = 30_000,
        headers,
        credentials = 'include',
    } = options;

    // Combine timeout with any caller-provided signal.
    const controller = new AbortController();
    const timer =
        timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
    if (signal) {
        if (signal.aborted) controller.abort();
        else signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const finalHeaders: Record<string, string> = { ...headers };
    if (body !== undefined && !finalHeaders['Content-Type']) {
        finalHeaders['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers: finalHeaders,
            credentials,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });
    } catch (e) {
        if ((e as Error).name === 'AbortError') {
            throw new ApiError(0, 'Request timed out');
        }
        throw new ApiError(0, 'Network error');
    } finally {
        if (timer) clearTimeout(timer);
    }

    if (!response.ok) {
        const { message, validationErrors } = await extractError(
            response,
            `Request failed (${response.status})`,
        );
        throw new ApiError(response.status, message, validationErrors);
    }

    // 204 No Content or empty body — nothing to parse.
    if (response.status === 204) {
        return undefined as T;
    }
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0') {
        return undefined as T;
    }

    const parsed = await safeJson<T>(response);
    // Some 200 responses are intentionally empty (login, logout, enroll,
    // delete). Return undefined for those rather than throwing.
    return (parsed as T) ?? (undefined as T);
}

/**
 * Variant for binary responses (PDFs, images).
 * Returns a Blob. Errors are still parsed via the JSON/text path.
 */
export async function apiFetchBlob(
    path: string,
    options: ApiFetchOptions = {},
): Promise<Blob> {
    const {
        method = 'GET',
        body,
        signal,
        timeoutMs = 30_000,
        headers,
        credentials = 'include',
    } = options;

    const controller = new AbortController();
    const timer =
        timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
    if (signal) {
        if (signal.aborted) controller.abort();
        else signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const finalHeaders: Record<string, string> = { ...headers };
    if (body !== undefined && !finalHeaders['Content-Type']) {
        finalHeaders['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers: finalHeaders,
            credentials,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });
    } catch (e) {
        if ((e as Error).name === 'AbortError') {
            throw new ApiError(0, 'Request timed out');
        }
        throw new ApiError(0, 'Network error');
    } finally {
        if (timer) clearTimeout(timer);
    }

    if (!response.ok) {
        const { message, validationErrors } = await extractError(
            response,
            `Request failed (${response.status})`,
        );
        throw new ApiError(response.status, message, validationErrors);
    }

    return response.blob();
}