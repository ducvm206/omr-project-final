// src/components/features/Exam/ExtractionExamCreator.tsx

import { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileArrowUp, faXmark } from '@fortawesome/free-solid-svg-icons';
import './ExtractionExamCreator.css';

/** Base64 file payload for one variant. */
export interface ExamConfigFileData {
    bytes: string;
}

/** Map of variant letter → file payload. */
export type ExtractionFiles = Record<string, ExamConfigFileData>;

const VARIANT_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

export interface ExtractionExamCreatorProps {
    numberOfKeys: number;
    files: ExtractionFiles;
    onChange: (files: ExtractionFiles) => void;
    disabled?: boolean;
}

/**
 * File-based answer key creator for extraction mode.
 *
 * Renders one file input per variant (A, B, ...) up to numberOfKeys.
 * Each selected file is read as base64 and stored in `files[letter]`.
 */
export function ExtractionExamCreator({
    numberOfKeys,
    files,
    onChange,
    disabled = false,
}: ExtractionExamCreatorProps) {
    const variants = VARIANT_LETTERS.slice(0, Math.max(0, numberOfKeys));

    if (numberOfKeys < 1) {
        return (
            <div className="extraction-creator__empty">
                Set the number of answer keys to at least 1.
            </div>
        );
    }

    const handleFile = async (variant: string, file: File | null) => {
        const next = { ...files };
        if (!file) {
            delete next[variant];
        } else {
            const bytes = await fileToBase64(file);
            next[variant] = { bytes };
        }
        onChange(next);
    };

    return (
        <div className="extraction-creator">
            {variants.map((variant) => (
                <FileSlot
                    key={variant}
                    variant={variant}
                    file={files[variant]}
                    disabled={disabled}
                    onSelect={(file) => handleFile(variant, file)}
                />
            ))}
        </div>
    );
}

/* ---------------------------------------------------------------- */

function FileSlot({
    variant,
    file,
    disabled,
    onSelect,
}: {
    variant: string;
    file?: ExamConfigFileData;
    disabled: boolean;
    onSelect: (file: File | null) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const hasFile = Boolean(file?.bytes);

    const handleClick = () => {
        if (disabled) return;
        inputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] ?? null;
        onSelect(selected);
        // Reset so selecting the same file again still triggers onChange.
        e.target.value = '';
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(null);
    };

    return (
        <div
            className={
                'extraction-creator__slot' +
                (hasFile ? ' extraction-creator__slot--filled' : '') +
                (disabled ? ' extraction-creator__slot--disabled' : '')
            }
            onClick={handleClick}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            <span className="extraction-creator__slot-letter">
                Key {variant}
            </span>

            <FontAwesomeIcon
                icon={faFileArrowUp}
                className="extraction-creator__slot-icon"
                aria-hidden="true"
            />

            <span className="extraction-creator__slot-text">
                {hasFile ? 'File selected' : 'Click to select a file'}
            </span>

            {hasFile && !disabled && (
                <button
                    type="button"
                    className="extraction-creator__clear"
                    onClick={handleClear}
                    aria-label={`Remove key ${variant} file`}
                >
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="application/pdf,image/*"
                className="extraction-creator__input"
                onChange={handleChange}
                disabled={disabled}
            />
        </div>
    );
}

/* ---------------------------------------------------------------- */

/** Read a File as a base64 string, without the `data:` prefix. */
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== 'string') {
                reject(new Error('Unexpected FileReader result'));
                return;
            }
            // Strip "data:<mime>;base64," prefix.
            const comma = result.indexOf(',');
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}