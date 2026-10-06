// src/components/common/Input.tsx

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import './Input.css';

/**
 * Supported input types.
 * File inputs use a different internal shape (see FileInputProps).
 */
export type InputType =
    | 'text'
    | 'password'
    | 'email'
    | 'number'
    | 'date'
    | 'file';

/**
 * HTML constraints for text-family inputs.
 * These map 1:1 to native input attributes.
 */
export interface InputConstraints {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    pattern?: string;
    /** Shown when native validation fails. */
    title?: string;
}

interface BaseInputProps {
    /** Field label. */
    label?: ReactNode;
    /** Helper text under the input. */
    hint?: ReactNode;
    /** Error message. When set, applies error styling and overrides hint. */
    error?: string | null;
    /** Icon rendered inside the input on the left. Ignored for file inputs. */
    icon?: ReactNode;
    /** Stretch to fill the container width. Defaults to true. */
    fullWidth?: boolean;
    /** Extra className applied to the outer wrapper. */
    wrapperClassName?: string;
}

export interface TextInputProps
    extends BaseInputProps,
        Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
    /** Input type. Defaults to 'text'. */
    type?: Exclude<InputType, 'file'>;
    /** HTML validation attributes. */
    constraints?: InputConstraints;
    /** Extra className applied to the input element. */
    className?: string;
}

export interface FileInputProps
    extends BaseInputProps,
        Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'value'> {
    type: 'file';
    /** HTML validation attributes. */
    constraints?: InputConstraints;
    /** Extra className applied to the input element. */
    className?: string;
    /**
     * Called with the selected file(s) whenever the input changes.
     * Convenience over reading `event.target.files` in the caller.
     */
    onFileChange?: (files: File[]) => void;
}

export type InputProps = TextInputProps | FileInputProps;

/**
 * Text or file input with label, hint, and error handling.
 *
 *   <Input label="Name" value={name} onChange={...} />
 *
 *   <Input
 *     label="Email"
 *     type="email"
 *     constraints={{ required: true, maxLength: 120 }}
 *     error={errors.email}
 *   />
 *
 *   <Input
 *     label="Answer sheet"
 *     type="file"
 *     accept="application/pdf,image/*"
 *     constraints={{ required: true }}
 *     onFileChange={(files) => setFile(files[0])}
 *   />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    props,
    ref,
) {
    const {
        label,
        hint,
        error,
        icon,
        fullWidth = true,
        wrapperClassName,
        className,
        id,
        constraints,
        ...rest
    } = props;

    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    const wrapperClasses = [
        'input',
        fullWidth ? 'input--full' : '',
        error ? 'input--error' : '',
        rest.disabled ? 'input--disabled' : '',
        wrapperClassName ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    // Merge constraints into the DOM attributes.
    const constraintAttrs: Record<string, unknown> = {};
    if (constraints) {
        if (constraints.required !== undefined) constraintAttrs.required = constraints.required;
        if (constraints.minLength !== undefined) constraintAttrs.minLength = constraints.minLength;
        if (constraints.maxLength !== undefined) constraintAttrs.maxLength = constraints.maxLength;
        if (constraints.min !== undefined) constraintAttrs.min = constraints.min;
        if (constraints.max !== undefined) constraintAttrs.max = constraints.max;
        if (constraints.step !== undefined) constraintAttrs.step = constraints.step;
        if (constraints.pattern !== undefined) constraintAttrs.pattern = constraints.pattern;
        if (constraints.title !== undefined) constraintAttrs.title = constraints.title;
    }

    const inputClasses = ['input__field', className ?? ''].filter(Boolean).join(' ');

    // File input: no icon overlay, wire up onFileChange.
    if (rest.type === 'file') {
        const { onFileChange, onChange, ...fileRest } = rest as FileInputProps;

        const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
            onChange?.(e);
            if (onFileChange) {
                onFileChange(Array.from(e.target.files ?? []));
            }
        };

        return (
            <div className={wrapperClasses}>
                {label && (
                    <label className="input__label" htmlFor={inputId}>
                        {label}
                        {constraints?.required && (
                            <span className="input__required" aria-hidden="true"> *</span>
                        )}
                    </label>
                )}

                <input
                    {...fileRest}
                    {...constraintAttrs}
                    ref={ref}
                    id={inputId}
                    type="file"
                    className={inputClasses}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : hintId}
                    onChange={handleChange}
                />

                {error ? (
                    <div className="input__error" id={errorId} role="alert">
                        {error}
                    </div>
                ) : hint ? (
                    <div className="input__hint" id={hintId}>
                        {hint}
                    </div>
                ) : null}
            </div>
        );
    }

    // Text-family input.
    const textRest = rest as TextInputProps;

    return (
        <div className={wrapperClasses}>
            {label && (
                <label className="input__label" htmlFor={inputId}>
                    {label}
                    {constraints?.required && (
                        <span className="input__required" aria-hidden="true"> *</span>
                    )}
                </label>
            )}

            <div className="input__wrapper">
                {icon && (
                    <span className="input__icon" aria-hidden="true">
                        {icon}
                    </span>
                )}
                <input
                    {...textRest}
                    {...constraintAttrs}
                    ref={ref}
                    id={inputId}
                    type={textRest.type ?? 'text'}
                    className={inputClasses}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : hintId}
                />
            </div>

            {error ? (
                <div className="input__error" id={errorId} role="alert">
                    {error}
                </div>
            ) : hint ? (
                <div className="input__hint" id={hintId}>
                    {hint}
                </div>
            ) : null}
        </div>
    );
});