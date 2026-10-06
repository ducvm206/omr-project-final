// src/components/features/Auth/Register.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faUser, faIdCard } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import { useAuth } from '../../../hooks/Auth';
import { ApiError } from '../../../api/client';
import './Register.css';

const USERNAME_MIN = 4;
const USERNAME_MAX = 16;
const USERNAME_PATTERN = '^[a-zA-Z0-9]+$';
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 32;
const FULLNAME_PATTERN = '^[a-zA-Z ]+$';

export interface RegisterProps {
    onSuccess?: () => void;
    onLogin?: () => void;
}

export function Register({ onSuccess, onLogin }: RegisterProps) {
    const { register, isLoading } = useAuth();

    const [userName, setUserName] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const validate = (): boolean => {
        const next: Record<string, string> = {};

        // Username
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

        // Full name
        const trimmedName = fullName.trim();
        if (!trimmedName) {
            next.fullName = 'Full name is required.';
        } else if (!/^[a-zA-Z ]+$/.test(trimmedName)) {
            next.fullName = 'Full name should only contain letters and spaces.';
        }

        // Password
        if (!password) {
            next.password = 'Password is required.';
        } else if (
            password.length < PASSWORD_MIN ||
            password.length > PASSWORD_MAX
        ) {
            next.password = `Password should be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`;
        }

        // Confirm password
        if (!confirm) {
            next.confirm = 'Please confirm your password.';
        } else if (confirm !== password) {
            next.confirm = 'Passwords do not match.';
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
            const ok = await register({
                userName: userName.trim(),
                fullName: fullName.trim(),
                password,
            });
            if (ok) {
                onSuccess?.();
            } else {
                setFormError('Registration failed. Please try again.');
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
        <div className="register">
            <form className="register__form" onSubmit={handleSubmit} noValidate>
                <h1 className="register__title">Create account</h1>
                <p className="register__subtitle">
                    Sign up to start creating templates and grading exams.
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
                    label="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alice Nguyen"
                    icon={<FontAwesomeIcon icon={faIdCard} />}
                    disabled={isLoading}
                    error={errors.fullName ?? null}
                    constraints={{
                        required: true,
                        pattern: FULLNAME_PATTERN,
                        title: 'Letters and spaces only',
                    }}
                    autoComplete="name"
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
                    autoComplete="new-password"
                    fullWidth
                />

                <Input
                    label="Confirm password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    icon={<FontAwesomeIcon icon={faLock} />}
                    disabled={isLoading}
                    error={errors.confirm ?? null}
                    constraints={{
                        required: true,
                        minLength: PASSWORD_MIN,
                        maxLength: PASSWORD_MAX,
                    }}
                    autoComplete="new-password"
                    fullWidth
                />

                {formError && (
                    <div className="register__error" role="alert">
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
                    Create account
                </Button>

                {onLogin && (
                    <p className="register__footer">
                        Already have an account?{' '}
                        <button
                            type="button"
                            className="register__link"
                            onClick={onLogin}
                            disabled={isLoading}
                        >
                            Sign in
                        </button>
                    </p>
                )}
            </form>
        </div>
    );
}