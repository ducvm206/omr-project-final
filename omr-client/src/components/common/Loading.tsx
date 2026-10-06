// src/components/common/Loading.tsx

import './Loading.css';

export interface LoadingProps {
    /** Optional message shown below the spinner. */
    message?: string;
    /**
     * Size of the spinner.
     * - 'sm'  16px  (inline, buttons)
     * - 'md'  32px  (default, panels)
     * - 'lg'  48px  (page sections)
     */
    size?: 'sm' | 'md' | 'lg';
    /**
     * When true, renders as a full-screen overlay with a white
     * background. Use for route-level loading (e.g. while /api/me
     * resolves on app start).
     */
    fullscreen?: boolean;
    /** Extra className applied to the outer element. */
    className?: string;
}

/**
 * Loading indicator.
 *
 *   <Loading />                                  // inline, default size
 *   <Loading message="Loading students…" />      // with label
 *   <Loading fullscreen />                       // full-page overlay
 *   <Loading size="sm" />                        // tiny, e.g. in a button
 */
export function Loading({
                            message,
                            size = 'md',
                            fullscreen = false,
                            className,
                        }: LoadingProps) {
    const classes = [
        'loading',
        fullscreen ? 'loading--fullscreen' : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes} role="status" aria-live="polite">
            <span className={`loading__spinner loading__spinner--${size}`} aria-hidden="true" />
            {message && <span className="loading__message">{message}</span>}
            <span className="loading__sr-only">Loading</span>
        </div>
    );
}