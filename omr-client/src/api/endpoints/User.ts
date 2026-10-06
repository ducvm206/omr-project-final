// src/api/endpoints/User.ts

import type { LoginDS, RegisterDS, User, UserDS } from '../../types/User';
import { ApiError, apiFetch } from '../client';

/**
 * Re-exported for backwards compatibility with existing imports.
 * New code should import { ApiError } from '../client'.
 */
export { ApiError as UserApiError };
export type { ValidationErrors } from '../client';

/**
 * Login user.
 * POST /api/login
 */
export async function login(ds: LoginDS): Promise<void> {
    await apiFetch<void>('/api/login', { method: 'POST', body: ds });
}

/**
 * Register a new user.
 * POST /api/register
 */
export async function register(ds: RegisterDS): Promise<User> {
    return apiFetch<User>('/api/register', { method: 'POST', body: ds });
}

/**
 * Log out the current user.
 * POST /api/logout
 */
export async function logout(): Promise<void> {
    await apiFetch<void>('/api/logout', { method: 'POST' });
}

/**
 * Fetch the currently authenticated user.
 * GET /api/me
 *
 * Returns null when unauthenticated (401).
 */
export async function me(): Promise<User | null> {
    try {
        return await apiFetch<User>('/api/me');
    } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
    }
}

/**
 * Update the current user's profile.
 * POST /api/me/edit
 *
 * The backend updates the authenticated user from the session, so
 * no id is sent. On success it returns the updated user.
 *
 * Note: `userName` cannot be changed if the backend validator rejects
 * it — but this call does send whatever you pass. If your backend
 * treats username as immutable, strip it from the payload before
 * calling or make it optional in `UserDS`.
 */
export async function updateMe(ds: UserDS): Promise<User> {
    return apiFetch<User>('/api/me/edit', { method: 'POST', body: ds });
}