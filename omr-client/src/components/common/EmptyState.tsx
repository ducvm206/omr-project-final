// src/components/common/EmptyState.tsx

import type { ReactNode } from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
    /** Icon shown above the title. Any ReactNode (FontAwesome, SVG, emoji). */
    icon?: ReactNode;
    /** Main heading. */
    title: string;
    /** Optional supporting text. */
    description?: ReactNode;
    /** Optional action area, usually a Button. */
    action?: ReactNode;
    /**
     * Size preset.
     * - 'sm'  compact, for inside cards or table bodies
     * - 'md'  default, for full page sections
     */
    size?: 'sm' | 'md';
    /** Extra className applied to the root. */
    className?: string;
}

/**
 * Empty state placeholder.
 *
 *   <EmptyState
 *     icon={<FontAwesomeIcon icon={faUser} />}
 *     title="No students yet"
 *     description="Create your first student to get started."
 *     action={<Button icon={<FontAwesomeIcon icon={faPlus} />}>New student</Button>}
 *   />
 */
export function EmptyState({
                               icon,
                               title,
                               description,
                               action,
                               size = 'md',
                               className,
                           }: EmptyStateProps) {
    const classes = [
        'empty-state',
        `empty-state--${size}`,
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes} role="status">
            {icon && (
                <div className="empty-state__icon" aria-hidden="true">
                    {icon}
                </div>
            )}
            <div className="empty-state__title">{title}</div>
            {description && (
                <div className="empty-state__description">{description}</div>
            )}
            {action && <div className="empty-state__action">{action}</div>}
        </div>
    );
}