// src/pages/Login.tsx

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Login } from '../components/features/Auth/Login';
import { useAuth } from '../hooks/Auth';

/**
 * Route page for /login.
 *
 * Renders the login form and handles post-login navigation.
 * If the user is already authenticated (e.g. they navigated to
 * /login manually while logged in), redirects to their intended
 * destination or the default landing page.
 */
export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isInitializing } = useAuth();

    // Where the user was trying to go before being redirected to /login.
    // Populated by a route guard that sets `state.from`.
    const from =
        (location.state as { from?: string } | null)?.from ?? '/templates';

    // If already logged in, skip the login form.
    useEffect(() => {
        if (!isInitializing && isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isInitializing, isAuthenticated, from, navigate]);

    return (
        <Login
            onSuccess={() => navigate(from, { replace: true })}
            onRegister={() => navigate('/register')}
        />
    );
}