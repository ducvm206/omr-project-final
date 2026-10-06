// src/components/features/Template/TemplateConfigPanel.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileLines,
    faListOl,
    faPenNib,
    faKey,
    faIdCard,
    faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import { useToast } from '../../common/Toast';
import { createTemplate } from '../../../api/endpoints/Template';
import { ApiError } from '../../../api/client';
import type { TemplateConfig, TemplateDS } from '../../../types/Template';
import './TemplateConfigPanel.css';

const MCQ_MIN = 1;
const MCQ_MAX = 40;
const WRITTEN_MIN = 0;
const WRITTEN_MAX = 6;
const NAME_MAX = 120;

export interface TemplateConfigPanelProps {
    /** Called after a template is successfully created. */
    onCreated?: (template: TemplateDS) => void;
    /** Called when the user cancels. Omit to hide the cancel button. */
    onCancel?: () => void;
    /** Extra className applied to the root. */
    className?: string;
}

/**
 * Form panel for creating a new template.
 *
 *   <TemplateConfigPanel onCreated={(t) => refresh()} />
 *
 * Sends the form values to POST /api/templates/create, which calls
 * the OMR engine to generate the template PDF. Expect multi-second
 * response times.
 */
export function TemplateConfigPanel({
    onCreated,
    onCancel,
    className,
}: TemplateConfigPanelProps) {
    const toast = useToast();

    const [name, setName] = useState('');
    const [mcqQuestions, setMcqQuestions] = useState('20');
    const [writtenQuestions, setWrittenQuestions] = useState('3');
    const [hasKeyArea, setHasKeyArea] = useState(true);
    const [hasStudentIdArea, setHasStudentIdArea] = useState(true);

    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const validate = (): boolean => {
        const next: Record<string, string> = {};

        const trimmedName = name.trim();
        if (!trimmedName) {
            next.name = 'Template name is required.';
        } else if (trimmedName.length > NAME_MAX) {
            next.name = `Name must be at most ${NAME_MAX} characters.`;
        }

        const mcq = Number(mcqQuestions);
        if (!mcqQuestions.trim() || Number.isNaN(mcq)) {
            next.mcqQuestions = 'Number of MCQ questions is required.';
        } else if (!Number.isInteger(mcq)) {
            next.mcqQuestions = 'Must be a whole number.';
        } else if (mcq < MCQ_MIN || mcq > MCQ_MAX) {
            next.mcqQuestions = `Must be between ${MCQ_MIN} and ${MCQ_MAX}.`;
        }

        const written = Number(writtenQuestions);
        if (writtenQuestions.trim() === '' || Number.isNaN(written)) {
            next.writtenQuestions = 'Number of written questions is required.';
        } else if (!Number.isInteger(written)) {
            next.writtenQuestions = 'Must be a whole number.';
        } else if (written < WRITTEN_MIN || written > WRITTEN_MAX) {
            next.writtenQuestions = `Must be between ${WRITTEN_MIN} and ${WRITTEN_MAX}.`;
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (saving) return;
        setFormError(null);

        if (!validate()) return;

        const config: TemplateConfig = {
            name: name.trim(),
            mcqQuestions: Number(mcqQuestions),
            writtenQuestions: Number(writtenQuestions),
            hasKeyArea,
            hasStudentIdArea,
        };

        setSaving(true);
        try {
            const template = await createTemplate(config);
            toast.success(`Template "${template.name}" created`);
            onCreated?.(template);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.validationErrors) setErrors(e.validationErrors);
                else setFormError(e.message);
            } else {
                setFormError('Unexpected error. Please try again.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (saving) return;
        onCancel?.();
    };

    return (
        <form
            className={['template-config', className ?? ''].filter(Boolean).join(' ')}
            onSubmit={handleSubmit}
            noValidate
        >
            <header className="template-config__header">
                <FontAwesomeIcon
                    icon={faFileLines}
                    className="template-config__header-icon"
                    aria-hidden="true"
                />
                <h2 className="template-config__title">New template</h2>
            </header>

            <Input
                label="Template name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Midterm A4"
                icon={<FontAwesomeIcon icon={faFileLines} />}
                disabled={saving}
                error={errors.name ?? null}
                constraints={{
                    required: true,
                    maxLength: NAME_MAX,
                    title: `Up to ${NAME_MAX} characters`,
                }}
                autoFocus
                fullWidth
            />

            <div className="template-config__row">
                <Input
                    label="MCQ questions"
                    type="number"
                    value={mcqQuestions}
                    onChange={(e) => setMcqQuestions(e.target.value)}
                    placeholder="20"
                    icon={<FontAwesomeIcon icon={faListOl} />}
                    disabled={saving}
                    error={errors.mcqQuestions ?? null}
                    constraints={{
                        required: true,
                        min: MCQ_MIN,
                        max: MCQ_MAX,
                        step: 1,
                        title: `Between ${MCQ_MIN} and ${MCQ_MAX}`,
                    }}
                    hint={`${MCQ_MIN}–${MCQ_MAX}`}
                    fullWidth
                />

                <Input
                    label="Written questions"
                    type="number"
                    value={writtenQuestions}
                    onChange={(e) => setWrittenQuestions(e.target.value)}
                    placeholder="3"
                    icon={<FontAwesomeIcon icon={faPenNib} />}
                    disabled={saving}
                    error={errors.writtenQuestions ?? null}
                    constraints={{
                        required: true,
                        min: WRITTEN_MIN,
                        max: WRITTEN_MAX,
                        step: 1,
                        title: `Between ${WRITTEN_MIN} and ${WRITTEN_MAX}`,
                    }}
                    hint={`${WRITTEN_MIN}–${WRITTEN_MAX}`}
                    fullWidth
                />
            </div>

            <div className="template-config__checks">
                <label
                    className={
                        'template-config__check' +
                        (saving ? ' template-config__check--disabled' : '')
                    }
                >
                    <input
                        type="checkbox"
                        checked={hasKeyArea}
                        onChange={(e) => setHasKeyArea(e.target.checked)}
                        disabled={saving}
                    />
                    <FontAwesomeIcon
                        icon={faKey}
                        className="template-config__check-icon"
                        aria-hidden="true"
                    />
                    <span className="template-config__check-label">
                        Include answer key area
                    </span>
                </label>

                <label
                    className={
                        'template-config__check' +
                        (saving ? ' template-config__check--disabled' : '')
                    }
                >
                    <input
                        type="checkbox"
                        checked={hasStudentIdArea}
                        onChange={(e) => setHasStudentIdArea(e.target.checked)}
                        disabled={saving}
                    />
                    <FontAwesomeIcon
                        icon={faIdCard}
                        className="template-config__check-icon"
                        aria-hidden="true"
                    />
                    <span className="template-config__check-label">
                        Include student ID area
                    </span>
                </label>
            </div>

            {formError && (
                <div className="template-config__error" role="alert">
                    {formError}
                </div>
            )}

            <footer className="template-config__actions">
                {onCancel && (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCancel}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    variant="primary"
                    icon={<FontAwesomeIcon icon={faPlus} />}
                    loading={saving}
                >
                    Create template
                </Button>
            </footer>
        </form>
    );
}