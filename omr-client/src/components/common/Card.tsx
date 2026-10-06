// src/components/common/Card.tsx

import type { ReactNode } from 'react';
import './Card.css';

export interface CardProps {
    /** Main content. */
    children?: ReactNode;
    /** Optional title shown in the header. */
    title?: ReactNode;
    /** Optional subtitle shown under the title. */
    subtitle?: ReactNode;
    /** Optional icon shown next to the title. */
    icon?: ReactNode;
    /** Optional actions shown on the right of the header. */
    actions?: ReactNode;
    /** Optional footer content. */
    footer?: ReactNode;
    /**
     * Visual variant.
     * - 'default'  bordered white card
     * - 'outlined' same as default (kept for API symmetry)
     * - 'flat'     no border, soft background
     * - 'plain'    no border, no background
     */
    variant?: 'default' | 'outlined' | 'flat' | 'plain';
    /**
     * Padding preset.
     * - 'none'  no padding (you control spacing)
     * - 'sm'
     * - 'md'    default
     * - 'lg'
     */
    padding?: 'none' | 'sm' | 'md' | 'lg';
    /** Makes the card clickable (adds cursor + hover). */
    onClick?: () => void;
    /** Disables click interaction and dims the card. */
    disabled?: boolean;
    /** Extra className applied to the root. */
    className?: string;
}

/**
 * Generic card container.
 *
 *   <Card title="Students">...</Card>
 *   <Card title="Math 101" subtitle="2025–2026" actions={<button>Edit</button>}>
 *     ...
 *   </Card>
 *   <Card onClick={() => navigate(`/courses/${id}`)}>Clickable card</Card>
 */
export function Card({
                         children,
                         title,
                         subtitle,
                         icon,
                         actions,
                         footer,
                         variant = 'default',
                         padding = 'md',
                         onClick,
                         disabled = false,
                         className,
                     }: CardProps) {
    const hasHeader = title !== undefined || subtitle !== undefined || icon || actions;
    const clickable = typeof onClick === 'function' && !disabled;

    const classes = [
        'card',
        `card--${variant}`,
        `card--padding-${padding}`,
        clickable ? 'card--clickable' : '',
        disabled ? 'card--disabled' : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    // Only make it interactive if onClick is provided.
    const interactiveProps = clickable
        ? {
            role: 'button' as const,
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            },
        }
        : {};

    return (
        <div className={classes} {...interactiveProps}>
            {hasHeader && (
                <div className="card__header">
                    {icon && <span className="card__icon" aria-hidden="true">{icon}</span>}
                    <div className="card__heading">
                        {title && <div className="card__title">{title}</div>}
                        {subtitle && <div className="card__subtitle">{subtitle}</div>}
                    </div>
                    {actions && <div className="card__actions">{actions}</div>}
                </div>
            )}

            {children && <div className="card__body">{children}</div>}

            {footer && <div className="card__footer">{footer}</div>}
        </div>
    );
}