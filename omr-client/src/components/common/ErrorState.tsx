// src/components/common/ErrorState.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import type { ReactNode } from 'react';
import './ErrorState.css';

export interface ErrorStateProps {
    /** Main heading. Defaults to 'Something went wrong'. */
    title?: string;
    /** Optional message. If omitted, uses the error's message. */
    message?: ReactNode;
    /**
     * The error object. If provided and `message` is not, the message
     * is read from `error.message` (falls back to a generic string).
     */
    error?: unknown;
    /** Optional retry action, usually a Button. */
    onRetry?: () => void;
    /** Optional custom icon. Defaults to an exclamation circle. */
    icon?: ReactNode;
    /**
     * Size preset.
     * - 'sm'  compact, for cards or table bodies
     * - 'md'  default, for full page sections
     */
    size?: 'sm' | 'md';
    /** Extra className applied to the root. */
    className?: string;
}

/**
 * Error state placeholder.
 *
 *   <ErrorState onRetry={refetch} />
 *
 *   <ErrorState
 *     title="Failed to load students"
 *     error={err}
 *     onRetry={refetch}
 *   />
 *
 *   <ErrorState
 *     size="sm"
 *     title="Could not load results"
 *   />
 */
export function ErrorState({
                               title = 'Something went wrong',
                               message,
                               error,
                               onRetry,
                               icon,
                               size = 'md',
                               className,
                           }: ErrorStateProps) {
    // Prefer explicit message; fall back to the error's message.
    const resolvedMessage =
        message ??
        (error instanceof Error
            ? error.message
            : typeof error === 'string'
                ? error
                : undefined);

    const classes = [
        'error-state',
        `error-state--${size}`,
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes} role="alert">
            <div className="error-state__icon" aria-hidden="true">
                {icon ?? <FontAwesomeIcon icon={faCircleExclamation} />}
            </div>
            <div className="error-state__title">{title}</div>
            {resolvedMessage && (
                <div className="error-state__message">{resolvedMessage}</div>
            )}
            {onRetry && (
                <div className="error-state__action">
                    <button type="button" className="error-state__retry" onClick={onRetry}>
                        Try again
                    </button>
                </div>
            )}
        </div>
    );
}