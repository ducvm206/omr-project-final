// src/components/features/Exam/ManualExamCreator.tsx

import { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListOl, faPenNib } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../../common/Button';
import './ManualExamCreator.css';

/**
 * Answer key shape for one variant.
 * - MCQ entries: question number -> array of selected options ("A", "B", ...)
 * - Written entries: question number -> numeric answer
 *
 * Example:
 *   {
 *     "1": ["A"],
 *     "2": ["B", "C"],
 *     "11": 2,
 *     "12": 3,
 *   }
 */
export type AnswerKey = Record<string, string[] | number>;

export interface ManualExamCreatorProps {
    /** Number of MCQ questions (1..40 typically). */
    mcqQuestions: number;
    /** Number of written questions (0..6 typically). */
    writtenQuestions: number;
    /** Number of answer key variants (1..5). */
    numberOfKeys: number;
    /** Current keys, keyed by variant letter ("A", "B", ...). */
    keys: Record<string, AnswerKey>;
    /** Called when any key changes. */
    onChange: (keys: Record<string, AnswerKey>) => void;
    /** Disable all inputs. */
    disabled?: boolean;
}

const MCQ_OPTIONS = ['A', 'B', 'C', 'D'] as const;
const VARIANT_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

/**
 * Editor for manual answer keys.
 *
 * For each variant (A, B, ...), renders:
 *   - an MCQ grid: one row per question, with toggle buttons for each option
 *   - a written section: one text input per question (numeric answer)
 *
 * Example output for variant "A":
 *   {
 *     "1": ["A"],
 *     "2": ["B", "C"],
 *     "11": 2,
 *     "12": 3,
 *   }
 */
export function ManualExamCreator({
    mcqQuestions,
    writtenQuestions,
    numberOfKeys,
    keys,
    onChange,
    disabled = false,
}: ManualExamCreatorProps) {
    const variants = useMemo(
        () => VARIANT_LETTERS.slice(0, Math.max(0, Math.min(numberOfKeys, 5))),
        [numberOfKeys],
    );

    /* --- Helpers ------------------------------------------------------ */

    /**
     * Read the current key for a variant, or an empty object if
     * nothing has been entered yet.
     */
    const getKey = (variant: string): AnswerKey => keys[variant] ?? {};

    /**
     * Update a single variant's key without mutating the others.
     */
    const setKey = (variant: string, next: AnswerKey) => {
        onChange({ ...keys, [variant]: next });
    };

    /**
     * Toggle an MCQ option on/off for a given question.
     * Selecting keeps the array in canonical order (A, B, C, D).
     */
    const toggleMcq = (variant: string, question: number, option: string) => {
        const current = getKey(variant);
        const existing = current[String(question)];
        const selected: string[] = Array.isArray(existing)
            ? [...existing]
            : [];

        const next = selected.includes(option)
            ? selected.filter((o) => o !== option)
            : [...selected, option];

        // Keep options in A, B, C, D order.
        next.sort((a, b) => MCQ_OPTIONS.indexOf(a as never) - MCQ_OPTIONS.indexOf(b as never));

        const updated: AnswerKey = { ...current };
        if (next.length === 0) {
            delete updated[String(question)];
        } else {
            updated[String(question)] = next;
        }
        setKey(variant, updated);
    };

    /**
     * Set (or clear) a written answer for a given question.
     * Empty string removes the entry from the key.
     */
    const setWritten = (variant: string, question: number, value: string) => {
        const current = getKey(variant);
        const updated: AnswerKey = { ...current };

        const trimmed = value.trim();
        if (trimmed === '') {
            delete updated[String(question)];
        } else {
            const num = Number(trimmed);
            updated[String(question)] = Number.isNaN(num) ? 0 : num;
        }

        setKey(variant, updated);
    };

    /* --- Empty states ------------------------------------------------- */

    if (numberOfKeys < 1) {
        return (
            <div className="manual-creator__empty">
                Set the number of answer keys to at least 1.
            </div>
        );
    }

    if (mcqQuestions === 0 && writtenQuestions === 0) {
        return (
            <div className="manual-creator__empty">
                Set the number of MCQ or written questions to start
                entering answers.
            </div>
        );
    }

    /* --- Render ------------------------------------------------------- */

    return (
        <div className="manual-creator">
            {variants.map((variant) => (
                <VariantEditor
                    key={variant}
                    variant={variant}
                    mcqQuestions={mcqQuestions}
                    writtenQuestions={writtenQuestions}
                    answerKey={getKey(variant)}
                    disabled={disabled}
                    onToggleMcq={(q, opt) => toggleMcq(variant, q, opt)}
                    onSetWritten={(q, v) => setWritten(variant, q, v)}
                />
            ))}
        </div>
    );
}

/* ---------------------------------------------------------------- */
/* Variant editor                                                    */
/* ---------------------------------------------------------------- */

function VariantEditor({
    variant,
    mcqQuestions,
    writtenQuestions,
    answerKey,
    disabled,
    onToggleMcq,
    onSetWritten,
}: {
    variant: string;
    mcqQuestions: number;
    writtenQuestions: number;
    answerKey: AnswerKey;
    disabled: boolean;
    onToggleMcq: (question: number, option: string) => void;
    onSetWritten: (question: number, value: string) => void;
}) {
    const mcqRange = Array.from({ length: mcqQuestions }, (_, i) => i + 1);
    const writtenRange = Array.from(
        { length: writtenQuestions },
        (_, i) => mcqQuestions + i + 1,
    );

    return (
        <section className="manual-creator__variant">
            <header className="manual-creator__variant-header">
                <span className="manual-creator__variant-label">
                    Answer key {variant}
                </span>
            </header>

            {mcqQuestions > 0 && (
                <div className="manual-creator__section">
                    <h4 className="manual-creator__section-title">
                        <FontAwesomeIcon icon={faListOl} aria-hidden="true" />
                        MCQ ({mcqQuestions})
                    </h4>

                    <div className="manual-creator__mcq-list">
                        {mcqRange.map((q) => {
                            const selected = answerKey[String(q)];
                            const selectedArr = Array.isArray(selected)
                                ? selected
                                : [];

                            return (
                                <div key={q} className="manual-creator__mcq-row">
                                    <span className="manual-creator__q-num">
                                        {q}
                                    </span>
                                    <div className="manual-creator__options">
                                        {MCQ_OPTIONS.map((opt) => {
                                            const active = selectedArr.includes(opt);
                                            return (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    className={
                                                        'manual-creator__option' +
                                                        (active
                                                            ? ' manual-creator__option--active'
                                                            : '')
                                                    }
                                                    onClick={() =>
                                                        onToggleMcq(q, opt)
                                                    }
                                                    disabled={disabled}
                                                    aria-pressed={active}
                                                    aria-label={`Question ${q} option ${opt}`}
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {writtenQuestions > 0 && (
                <div className="manual-creator__section">
                    <h4 className="manual-creator__section-title">
                        <FontAwesomeIcon icon={faPenNib} aria-hidden="true" />
                        Written ({writtenQuestions})
                    </h4>

                    <div className="manual-creator__written-list">
                        {writtenRange.map((q) => {
                            const raw = answerKey[String(q)];
                            const value =
                                typeof raw === 'number' ? String(raw) : '';

                            return (
                                <div
                                    key={q}
                                    className="manual-creator__written-row"
                                >
                                    <label
                                        className="manual-creator__q-num"
                                        htmlFor={`written-${variant}-${q}`}
                                    >
                                        {q}
                                    </label>
                                    <input
                                        id={`written-${variant}-${q}`}
                                        className="manual-creator__written-input"
                                        type="text"
                                        inputMode="numeric"
                                        value={value}
                                        onChange={(e) =>
                                            onSetWritten(q, e.target.value)
                                        }
                                        disabled={disabled}
                                        placeholder="—"
                                        aria-label={`Question ${q} answer`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
}