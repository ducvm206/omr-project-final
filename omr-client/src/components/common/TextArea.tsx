// src/components/common/TextArea.tsx

import { forwardRef, useId } from 'react';
import type { ReactNode, TextareaHTMLAttributes } from 'react';
import './TextArea.css';

/**
 * HTML constraints for textarea inputs.
 * These map 1:1 to native textarea attributes.
 */
export interface TextAreaConstraints {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    /** Shown when native validation fails. */
    title?: string;
}

export interface TextAreaProps
    extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
    /** Field label. */
    label?: ReactNode;
    /** Helper text under the field. */
    hint?: ReactNode;
    /** Error message. When set, applies error styling and overrides hint. */
    error?: string | null;
    /** Stretch to fill the container width. Defaults to true. */
    fullWidth?: boolean;
    /** HTML validation attributes. */
    constraints?: TextAreaConstraints;
    /**
     * Show a live character counter in the corner.
     * Only appears when `constraints.maxLength` is set, or when this
     * is explicitly true with a `maxLength` in the HTML attributes.
     */
    showCount?: boolean;
    /** Extra className applied to the outer wrapper. */
    wrapperClassName?: string;
    /** Extra className applied to the textarea element. */
    className?: string;
}

/**
 * Multiline text input with label, hint, error, and optional counter.
 *
 *   <TextArea
 *     label="Description"
 *     value={desc}
 *     onChange={(e) => setDesc(e.target.value)}
 *     rows={4}
 *   />
 *
 *   <TextArea
 *     label="Description"
 *     constraints={{ required: true, maxLength: 500 }}
 *     showCount
 *     error={errors.description}
 *   />
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    function TextArea(
        {
            label,
            hint,
            error,
            fullWidth = true,
            constraints,
            showCount,
            wrapperClassName,
            className,
            id,
            maxLength,
            value,
            defaultValue,
            ...rest
        },
        ref,
    ) {
        const generatedId = useId();
        const inputId = id ?? generatedId;
        const hintId = hint ? `${inputId}-hint` : undefined;
        const errorId = error ? `${inputId}-error` : undefined;

        const wrapperClasses = [
            'textarea',
            fullWidth ? 'textarea--full' : '',
            error ? 'textarea--error' : '',
            rest.disabled ? 'textarea--disabled' : '',
            wrapperClassName ?? '',
        ]
            .filter(Boolean)
            .join(' ');

        // Merge constraints into DOM attributes.
        const constraintAttrs: Record<string, unknown> = {};
        if (constraints) {
            if (constraints.required !== undefined) constraintAttrs.required = constraints.required;
            if (constraints.minLength !== undefined) constraintAttrs.minLength = constraints.minLength;
            if (constraints.title !== undefined) constraintAttrs.title = constraints.title;
        }

        // maxLength can come from either the constraints object or the
        // standard textarea attribute — constraints win if both are set.
        const resolvedMaxLength =
            constraints?.maxLength !== undefined ? constraints.maxLength : maxLength;

        // Compute the counter when possible.
        const shouldShowCount =
            showCount === true ||
            (showCount !== false && resolvedMaxLength !== undefined);

        const currentLength =
            typeof value === 'string'
                ? value.length
                : typeof defaultValue === 'string'
                    ? defaultValue.length
                    : undefined;

        const inputClasses = ['textarea__field', className ?? '']
            .filter(Boolean)
            .join(' ');

        return (
            <div className={wrapperClasses}>
                {label && (
                    <label className="textarea__label" htmlFor={inputId}>
                        {label}
                        {constraints?.required && (
                            <span className="textarea__required" aria-hidden="true"> *</span>
                        )}
                    </label>
                )}

                <div className="textarea__wrapper">
                    <textarea
                        {...rest}
                        {...constraintAttrs}
                        ref={ref}
                        id={inputId}
                        className={inputClasses}
                        value={value}
                        defaultValue={defaultValue}
                        maxLength={resolvedMaxLength}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : hintId}
                    />

                    {shouldShowCount && resolvedMaxLength !== undefined && (
                        <span className="textarea__count" aria-hidden="true">
                            {currentLength ?? 0}/{resolvedMaxLength}
                        </span>
                    )}
                </div>

                {error ? (
                    <div className="textarea__error" id={errorId} role="alert">
                        {error}
                    </div>
                ) : hint ? (
                    <div className="textarea__hint" id={hintId}>
                        {hint}
                    </div>
                ) : null}
            </div>
        );
    },
);