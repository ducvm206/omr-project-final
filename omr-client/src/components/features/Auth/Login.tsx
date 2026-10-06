// src/components/features/Auth/Login.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faUser } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import { useAuth } from '../../../hooks/Auth';
import { ApiError } from '../../../api/client';
import './Login.css';

const USERNAME_MIN = 4;
const USERNAME_MAX = 16;
const USERNAME_PATTERN = '^[a-zA-Z0-9]+$';
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 32;

export interface LoginProps {
    onSuccess?: () => void;
    onRegister?: () => void;
}

export function Login({ onSuccess, onRegister }: LoginProps) {
    const { login, isLoading } = useAuth();

    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const validate = (): boolean => {
        const next: Record<string, string> = {};

        const trimmedUser = userName.trim();
        if (!trimmedUser) {
            next.userName = 'Username is required.';
        } else if (
            trimmedUser.length < USERNAME_MIN ||
            trimmedUser.length > USERNAME_MAX
        ) {
            next.userName = `Username should be between ${USERNAME_MIN} and ${USERNAME_MAX} characters.`;
        } else if (!/^[a-zA-Z0-9]+$/.test(trimmedUser)) {
            next.userName =
                'Username should only contain letters and numbers without spaces.';
        }

        if (!password) {
            next.password = 'Password is required.';
        } else if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
            next.password = `Password should be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`;
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isLoading) return;
        setFormError(null);

        if (!validate()) return;

        try {
            const ok = await login({ userName: userName.trim(), password });
            if (ok) {
                onSuccess?.();
            } else {
                setFormError('Invalid username or password.');
            }
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.validationErrors) setErrors(e.validationErrors);
                else setFormError(e.message);
            } else {
                setFormError('Unexpected error. Please try again.');
            }
        }
    };

    return (
        <div className="login">
            <form className="login__form" onSubmit={handleSubmit} noValidate>
                <h1 className="login__title">Sign in</h1>
                <p className="login__subtitle">
                    Sign in to access your templates, courses, and grading.
                </p>

                <Input
                    label="Username"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="4–16 characters"
                    icon={<FontAwesomeIcon icon={faUser} />}
                    disabled={isLoading}
                    error={errors.userName ?? null}
                    constraints={{
                        required: true,
                        minLength: USERNAME_MIN,
                        maxLength: USERNAME_MAX,
                        pattern: USERNAME_PATTERN,
                        title: '4–16 characters, letters and digits only',
                    }}
                    autoComplete="username"
                    autoFocus
                    fullWidth
                />

                <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8–32 characters"
                    icon={<FontAwesomeIcon icon={faLock} />}
                    disabled={isLoading}
                    error={errors.password ?? null}
                    constraints={{
                        required: true,
                        minLength: PASSWORD_MIN,
                        maxLength: PASSWORD_MAX,
                    }}
                    autoComplete="current-password"
                    fullWidth
                />

                {formError && (
                    <div className="login__error" role="alert">
                        {formError}
                    </div>
                )}

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isLoading}
                >
                    Sign in
                </Button>

                {onRegister && (
                    <p className="login__footer">
                        Don't have an account?{' '}
                        <button
                            type="button"
                            className="login__link"
                            onClick={onRegister}
                            disabled={isLoading}
                        >
                            Create one
                        </button>
                    </p>
                )}
            </form>
        </div>
    );
}