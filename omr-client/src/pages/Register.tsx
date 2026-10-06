// src/pages/Register.tsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Register } from '../components/features/Auth/Register';
import { useAuth } from '../hooks/Auth';
import { useToast } from '../components/common/Toast';

/**
 * Route page for /register.
 *
 * Renders the registration form and handles navigation:
 *   - On success, redirects to /login (the backend does not
 *     create a session on register, so the user still needs to
 *     sign in).
 *   - If the user is already authenticated, redirects to the
 *     default landing page.
 */
export function RegisterPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const { isAuthenticated, isInitializing } = useAuth();

    // If already logged in, skip the registration form.
    useEffect(() => {
        if (!isInitializing && isAuthenticated) {
            navigate('/templates', { replace: true });
        }
    }, [isInitializing, isAuthenticated, navigate]);

    const handleSuccess = () => {
        toast.success('Account created. Please sign in.');
        navigate('/login', { replace: true });
    };

    return (
        <Register
            onSuccess={handleSuccess}
            onLogin={() => navigate('/login')}
        />
    );
}