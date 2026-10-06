// src/hooks/Auth.ts

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    login as loginRequest,
    logout as logoutRequest,
    me as meRequest,
    register as registerRequest,
    UserApiError,
} from '../api/endpoints/User';
import type { LoginDS, RegisterDS, User } from '../types/User';

/**
 * Shape of the auth context value.
 */
export interface AuthContextValue {
    /** Currently authenticated user, or null when logged out. */
    user: User | null;
    /** True while a login/register/logout request is in flight. */
    isLoading: boolean;
    /** True during the initial /api/me check on app load. */
    isInitializing: boolean;
    /** Last error message, if any. Cleared on next successful action. */
    error: string | null;
    /** Field-level validation errors returned by the backend, if any. */
    validationErrors: Record<string, string> | null;
    /** Convenience flag. */
    isAuthenticated: boolean;
    /** Log in with username + password. Returns true on success. */
    login: (ds: LoginDS) => Promise<boolean>;
    /** Register a new account. Returns true on success. */
    register: (ds: RegisterDS) => Promise<boolean>;
    /** Log out (calls the backend, then clears local state). */
    logout: () => Promise<void>;
    /** Manually clear the last error. */
    clearError: () => void;
    /** Update the cached user (e.g. after a profile edit). */
    setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Internal hook used by AuthProvider to build the context value.
 * You normally don't call this directly — call `useAuth()` instead.
 */
export function useAuthState(): AuthContextValue {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] =
        useState<Record<string, string> | null>(null);

    // Guards against setState after unmount during the initial /api/me call.
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const clearError = useCallback(() => {
        setError(null);
        setValidationErrors(null);
    }, []);

    // On mount, ask the backend who we are. If the JSESSIONID cookie is
    // still valid, this restores the session after a page refresh.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const current = await meRequest();
                if (!cancelled && mountedRef.current) {
                    setUser(current);
                }
            } catch {
                // Ignore — treat as "not logged in"
            } finally {
                if (!cancelled && mountedRef.current) {
                    setIsInitializing(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const login = useCallback(
        async (ds: LoginDS): Promise<boolean> => {
            setIsLoading(true);
            clearError();
            try {
                await loginRequest(ds);

                // LoginController returns an empty body, so fetch the
                // full user from /api/me.
                const current = await meRequest();
                setUser(current);
                return current !== null;
            } catch (e) {
                if (e instanceof UserApiError) {
                    setError(e.message);
                    setValidationErrors(e.validationErrors ?? null);
                } else {
                    setError('Unexpected error during login');
                }
                return false;
            } finally {
                setIsLoading(false);
            }
        },
        [clearError],
    );

    const register = useCallback(
        async (ds: RegisterDS): Promise<boolean> => {
            setIsLoading(true);
            clearError();
            try {
                await registerRequest(ds);
                // Typically the user still has to log in afterwards.
                return true;
            } catch (e) {
                if (e instanceof UserApiError) {
                    setError(e.message);
                    setValidationErrors(e.validationErrors ?? null);
                } else {
                    setError('Unexpected error during registration');
                }
                return false;
            } finally {
                setIsLoading(false);
            }
        },
        [clearError],
    );

    const logout = useCallback(async (): Promise<void> => {
        setIsLoading(true);
        try {
            await logoutRequest();
        } catch {
            // Ignore server errors — always clear local state.
        } finally {
            if (mountedRef.current) {
                setUser(null);
                clearError();
                setIsLoading(false);
            }
        }
    }, [clearError]);

    return useMemo<AuthContextValue>(
        () => ({
            user,
            isLoading,
            isInitializing,
            error,
            validationErrors,
            isAuthenticated: user !== null,
            login,
            register,
            logout,
            clearError,
            setUser,
        }),
        [
            user,
            isLoading,
            isInitializing,
            error,
            validationErrors,
            login,
            register,
            logout,
            clearError,
        ],
    );
}

/**
 * Consume the auth context.
 * Must be used inside an <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an <AuthProvider>');
    }
    return ctx;
}