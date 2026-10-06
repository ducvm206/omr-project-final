// src/components/common/SearchForm.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import type { SearchForm as SearchFormData } from '../../types/Common';
import { Button } from './Button';
import { Input } from './Input';
import './SearchForm.css';

/**
 * A single searchable field.
 * `name` becomes the key in `searchParams` sent to the backend.
 */
export interface SearchField {
    name: string;
    label: string;
    type?: 'text' | 'number' | 'date' | 'email' | 'select';
    placeholder?: string;
    defaultValue?: string;
    options?: { value: string; label: string }[];
    disabled?: boolean;
    /** Icon rendered inside the input on the left. */
    icon?: ReactNode;
    /** HTML pattern attribute for validation. */
    pattern?: string;
    /** HTML maxLength attribute. */
    maxLength?: number;
    /** HTML minLength attribute. */
    minLength?: number;
}

export interface SearchFormProps {
    fields: SearchField[];
    /** Called on submit with the collected `{ searchParams }` payload. */
    onSubmit: (form: SearchFormData) => void | Promise<void>;
    /** Called instead of the default reset when provided. */
    onReset?: () => void;
    submitLabel?: string;
    resetLabel?: string;
    showReset?: boolean;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
}

/**
 * Generic search form.
 *
 *   <SearchForm
 *     fields={[
 *       { name: 'id',   label: 'Student ID' },
 *       { name: 'name', label: 'Name' },
 *     ]}
 *     onSubmit={(form) => searchStudents(form)}
 *   />
 */
export function SearchForm({
                               fields,
                               onSubmit,
                               onReset,
                               submitLabel = 'Search',
                               resetLabel = 'Reset',
                               showReset = true,
                               disabled = false,
                               loading = false,
                               className,
                           }: SearchFormProps) {
    const [values, setValues] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        for (const f of fields) init[f.name] = f.defaultValue ?? '';
        return init;
    });

    const handleChange = (name: string, value: string) => {
        setValues((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (disabled || loading) return;

        const searchParams: Record<string, string> = {};
        for (const [key, raw] of Object.entries(values)) {
            const value = raw.trim();
            if (value !== '') searchParams[key] = value;
        }
        await onSubmit({ searchParams });
    };

    const handleReset = async () => {
        if (disabled || loading) return;
        if (onReset) {
            onReset();
            return;
        }
        const cleared: Record<string, string> = {};
        for (const f of fields) cleared[f.name] = '';
        setValues(cleared);
        await onSubmit({ searchParams: {} });
    };

    return (
        <form
            className={`search-form ${className ?? ''}`.trim()}
            onSubmit={handleSubmit}
            role="search"
        >
            {fields.map((field) => {
                // Select is not covered by Input — render it inline.
                if (field.type === 'select') {
                    return (
                        <div key={field.name} className="search-form__field">
                            <label
                                className="search-form__label"
                                htmlFor={`search-${field.name}`}
                            >
                                {field.label}
                            </label>
                            <select
                                id={`search-${field.name}`}
                                className="search-form__select"
                                value={values[field.name] ?? ''}
                                onChange={(e) => handleChange(field.name, e.target.value)}
                                disabled={disabled || field.disabled}
                            >
                                <option value="">All</option>
                                {(field.options ?? []).map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    );
                }

                return (
                    <div key={field.name} className="search-form__field">
                        <Input
                            label={field.label}
                            type={field.type ?? 'text'}
                            value={values[field.name] ?? ''}
                            placeholder={field.placeholder}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            disabled={disabled || field.disabled}
                            fullWidth
                        />
                    </div>
                );
            })}

            <div className="search-form__actions">
                <Button
                    type="submit"
                    variant="primary"
                    icon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
                    loading={loading}
                    disabled={disabled}
                >
                    {submitLabel}
                </Button>

                {showReset && (
                    <Button
                        type="button"
                        variant="secondary"
                        icon={<FontAwesomeIcon icon={faRotateLeft} />}
                        onClick={handleReset}
                        disabled={disabled || loading}
                    >
                        {resetLabel}
                    </Button>
                )}
            </div>
        </form>
    );
}