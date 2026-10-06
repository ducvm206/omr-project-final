// src/components/common/Button.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

/**
 * Visual variant.
 * - 'primary'   solid blue, main action
 * - 'secondary' white with blue border, secondary action
 * - 'danger'    solid red, destructive action
 * - 'ghost'     no border/background, tertiary action
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

/**
 * Size.
 * - 'sm'  compact, for table rows and inline actions
 * - 'md'  default
 * - 'lg'  prominent, e.g. submit on auth pages
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
    extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    /** Button label or content. */
    children?: ReactNode;
    /** Visual variant. Defaults to 'primary'. */
    variant?: ButtonVariant;
    /** Size. Defaults to 'md'. */
    size?: ButtonSize;
    /** Optional icon shown before the label. */
    icon?: ReactNode;
    /** Optional icon shown after the label. */
    iconRight?: ReactNode;
    /** Shows a spinner and disables the button. */
    loading?: boolean;
    /** Stretches the button to fill its container's width. */
    fullWidth?: boolean;
}

/**
 * Generic button.
 *
 *   <Button>Save</Button>
 *   <Button variant="secondary">Cancel</Button>
 *   <Button variant="danger" loading={deleting}>Delete</Button>
 *   <Button icon={<FontAwesomeIcon icon={faPlus} />}>New student</Button>
 */
export function Button({
                           children,
                           variant = 'primary',
                           size = 'md',
                           icon,
                           iconRight,
                           loading = false,
                           fullWidth = false,
                           disabled,
                           type = 'button',
                           className,
                           ...rest
                       }: ButtonProps) {
    const isDisabled = disabled || loading;

    const classes = [
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth ? 'btn--full' : '',
        loading ? 'btn--loading' : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            type={type}
            className={classes}
            disabled={isDisabled}
            aria-busy={loading || undefined}
            {...rest}
        >
            {loading && (
                <FontAwesomeIcon
                    icon={faSpinner}
                    spin
                    className="btn__icon"
                    aria-hidden="true"
                />
            )}
            {!loading && icon && (
                <span className="btn__icon" aria-hidden="true">{icon}</span>
            )}
            {children && <span className="btn__label">{children}</span>}
            {!loading && iconRight && (
                <span className="btn__icon btn__icon--right" aria-hidden="true">
                    {iconRight}
                </span>
            )}
        </button>
    );
}