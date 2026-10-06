// src/components/features/Exam/ExamConfigForm.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileLines,
    faListOl,
    faPenNib,
    faKey,
    faPlus,
    faPen,
    faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import { Loading } from '../../common/Loading';
import { ErrorState } from '../../common/ErrorState';
import { EmptyState } from '../../common/EmptyState';
import { useToast } from '../../common/Toast';
import {
    ManualExamCreator,
    type AnswerKey,
} from './ManualExamCreator';
import {
    ExtractionExamCreator,
    type ExtractionFiles,
} from './ExtractionExamCreator';
import { createExam } from '../../../api/endpoints/Exam';
import { searchTemplates } from '../../../api/endpoints/Template';
import { ApiError } from '../../../api/client';
import type { ExamConfig, ExamCreationMode } from '../../../types/Exam';
import type { TemplateDS } from '../../../types/Template';
import './ExamConfigForm.css';

const NAME_MAX = 120;
const KEYS_MIN = 1;
const KEYS_MAX = 5;
const MCQ_POINTS_MIN = 0;
const MCQ_POINTS_MAX = 100;
const WRITTEN_POINTS_MIN = 0;
const WRITTEN_POINTS_MAX = 100;
const THRESHOLD_MIN = 0;
const THRESHOLD_MAX = 100;

export interface ExamConfigFormProps {
    courseId: number;
    /** Called after a successful creation. */
    onCreated?: () => void;
    /** Called when the user cancels. */
    onCancel?: () => void;
}

export function ExamConfigForm({
    courseId,
    onCreated,
    onCancel,
}: ExamConfigFormProps) {
    const toast = useToast();

    /* --- Config state ------------------------------------------------- */

    const [mode, setMode] = useState<ExamCreationMode>('manual');
    const [name, setName] = useState('');
    const [templateId, setTemplateId] = useState<number | null>(null);
    const [numberOfKeys, setNumberOfKeys] = useState('4');
    const [mcqPoints, setMcqPoints] = useState('7');
    const [writtenPoints, setWrittenPoints] = useState('3');
    const [gradeAThreshold, setGradeAThreshold] = useState('90');
    const [gradeBThreshold, setGradeBThreshold] = useState('75');
    const [gradeCThreshold, setGradeCThreshold] = useState('60');
    const [gradeDThreshold, setGradeDThreshold] = useState('45');

    /* --- Key state ---------------------------------------------------- */

    const [keys, setKeys] = useState<Record<string, AnswerKey>>({});
    const [files, setFiles] = useState<ExtractionFiles>({});

    /* --- Template state ---------------------------------------------- */

    const [templates, setTemplates] = useState<TemplateDS[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templatesError, setTemplatesError] = useState<unknown>(null);

    const loadTemplates = useCallback(async () => {
        setTemplatesLoading(true);
        setTemplatesError(null);
        try {
            const list = await searchTemplates({ searchParams: {} });
            setTemplates(list);
            setTemplateId((current) => current ?? list[0]?.id ?? null);
        } catch (e) {
            setTemplatesError(e);
        } finally {
            setTemplatesLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadTemplates();
    }, [loadTemplates]);

    const selectedTemplate = useMemo(
        () => templates.find((t) => t.id === templateId) ?? null,
        [templates, templateId],
    );

    /* --- Reset keys when the template or mode changes ---------------- */

    const handleTemplateChange = (nextId: number | null) => {
        setTemplateId(nextId);
        // Counts change → any pre-entered keys no longer apply.
        setKeys({});
    };

    const handleModeChange = (next: ExamCreationMode) => {
        setMode(next);
        // Manual and extraction keys are different shapes — clear both.
        setKeys({});
        setFiles({});
    };

    const handleNumberOfKeysChange = (raw: string) => {
        setNumberOfKeys(raw);

        // Trim any keys/files that belong to variants beyond the new count.
        const n = Math.max(0, Math.min(Number(raw) || 0, KEYS_MAX));
        const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, n);

        setKeys((prev) => {
            const next: Record<string, AnswerKey> = {};
            for (const l of letters) if (prev[l]) next[l] = prev[l];
            return next;
        });

        setFiles((prev) => {
            const next: ExtractionFiles = {};
            for (const l of letters) if (prev[l]) next[l] = prev[l];
            return next;
        });
    };

    /* --- Validation --------------------------------------------------- */

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const validate = (): boolean => {
        const next: Record<string, string> = {};

        if (!name.trim()) next.name = 'Exam name is required.';
        else if (name.trim().length > NAME_MAX)
            next.name = `Name must be at most ${NAME_MAX} characters.`;

        if (templateId === null) next.templateId = 'Please select a template.';

        const keyCount = Number(numberOfKeys);
        if (!numberOfKeys.trim() || Number.isNaN(keyCount))
            next.numberOfKeys = 'Required.';
        else if (!Number.isInteger(keyCount))
            next.numberOfKeys = 'Whole number only.';
        else if (keyCount < KEYS_MIN || keyCount > KEYS_MAX)
            next.numberOfKeys = `${KEYS_MIN}–${KEYS_MAX}.`;

        const mcq = Number(mcqPoints);
        if (!mcqPoints.trim() || Number.isNaN(mcq))
            next.mcqPoints = 'Required.';
        else if (mcq < MCQ_POINTS_MIN || mcq > MCQ_POINTS_MAX)
            next.mcqPoints = `${MCQ_POINTS_MIN}–${MCQ_POINTS_MAX}.`;

        const written = Number(writtenPoints);
        if (!writtenPoints.trim() || Number.isNaN(written))
            next.writtenPoints = 'Required.';
        else if (written < WRITTEN_POINTS_MIN || written > WRITTEN_POINTS_MAX)
            next.writtenPoints = `${WRITTEN_POINTS_MIN}–${WRITTEN_POINTS_MAX}.`;

        const a = Number(gradeAThreshold);
        const b = Number(gradeBThreshold);
        const c = Number(gradeCThreshold);
        const d = Number(gradeDThreshold);

        const check = (value: number, raw: string, key: string) => {
            if (!raw.trim() || Number.isNaN(value)) next[key] = 'Required.';
            else if (value < THRESHOLD_MIN || value > THRESHOLD_MAX)
                next[key] = `${THRESHOLD_MIN}–${THRESHOLD_MAX}.`;
        };

        check(a, gradeAThreshold, 'gradeAThreshold');
        check(b, gradeBThreshold, 'gradeBThreshold');
        check(c, gradeCThreshold, 'gradeCThreshold');
        check(d, gradeDThreshold, 'gradeDThreshold');

        if (
            !next.gradeAThreshold &&
            !next.gradeBThreshold &&
            !next.gradeCThreshold &&
            !next.gradeDThreshold
        ) {
            if (!(a > b)) next.gradeAThreshold = 'A > B required.';
            if (!(b > c)) next.gradeBThreshold = 'B > C required.';
            if (!(c > d)) next.gradeCThreshold = 'C > D required.';
        }

        // Key completeness — only for manual mode.
        if (mode === 'manual' && selectedTemplate && !next.numberOfKeys) {
            const mcqCount = selectedTemplate.mcqQuestions;
            const writtenCount = selectedTemplate.writtenQuestions;
            const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, keyCount);

            for (const letter of letters) {
                const key = keys[letter] ?? {};

                const missingMcq: number[] = [];
                for (let q = 1; q <= mcqCount; q++) {
                    const v = key[String(q)];
                    if (!Array.isArray(v) || v.length === 0) missingMcq.push(q);
                }

                const missingWritten: number[] = [];
                for (let i = 0; i < writtenCount; i++) {
                    const q = mcqCount + i + 1;
                    if (typeof key[String(q)] !== 'number')
                        missingWritten.push(q);
                }

                if (missingMcq.length > 0) {
                    next[`key${letter}`] =
                        `Key ${letter}: missing MCQ answers for ${missingMcq.join(', ')}`;
                    break;
                }
                if (missingWritten.length > 0) {
                    next[`key${letter}`] =
                        `Key ${letter}: missing written answers for ${missingWritten.join(', ')}`;
                    break;
                }
            }
        }

        // File presence — only for extraction mode.
        if (mode === 'extraction' && !next.numberOfKeys) {
            const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, keyCount);
            for (const letter of letters) {
                if (!files[letter]?.bytes) {
                    next[`key${letter}File`] = `Key ${letter}: please select a file.`;
                    break;
                }
            }
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    /* --- Submit ------------------------------------------------------- */

    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (saving) return;
        setFormError(null);

        if (!validate()) return;

        const base: ExamConfig = {
            mode,
            name: name.trim(),
            courseId,
            templateId: templateId!,
            numberOfKeys: Number(numberOfKeys),
            mcqPoints: Number(mcqPoints),
            writtenPoints: Number(writtenPoints),
            gradeAThreshold: Number(gradeAThreshold),
            gradeBThreshold: Number(gradeBThreshold),
            gradeCThreshold: Number(gradeCThreshold),
            gradeDThreshold: Number(gradeDThreshold),
        };

        const payload: ExamConfig =
            mode === 'manual'
                ? {
                      ...base,
                      keyA: keys.A,
                      keyB: keys.B,
                      keyC: keys.C,
                      keyD: keys.D,
                      keyE: keys.E,
                  }
                : {
                      ...base,
                      keyAFile: files.A,
                      keyBFile: files.B,
                      keyCFile: files.C,
                      keyDFile: files.D,
                      keyEFile: files.E,
                  };

        setSaving(true);
        try {
            await createExam(payload);
            toast.success(`Exam "${payload.name}" created`);
            onCreated?.();
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

    const totalPoints = useMemo(
        () => (Number(mcqPoints) || 0) + (Number(writtenPoints) || 0),
        [mcqPoints, writtenPoints],
    );

    const keyCountNumber = Math.max(
        0,
        Math.min(Number(numberOfKeys) || 0, KEYS_MAX),
    );

    /* --- Render ------------------------------------------------------- */

    return (
        <form className="exam-config" onSubmit={handleSubmit} noValidate>
            {/* ---------- Config block ---------- */}

            <section className="exam-config__config">
                <div className="exam-config__modes">
                    <ModeChip
                        value="manual"
                        current={mode}
                        onSelect={handleModeChange}
                        disabled={saving}
                        icon={<FontAwesomeIcon icon={faPen} />}
                        label="Manual"
                    />
                    <ModeChip
                        value="extraction"
                        current={mode}
                        onSelect={handleModeChange}
                        disabled={saving}
                        icon={<FontAwesomeIcon icon={faWandMagicSparkles} />}
                        label="Extraction"
                    />
                </div>

                <div className="exam-config__row exam-config__row--name-template">
                    <Input
                        label="Exam name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Midterm"
                        icon={<FontAwesomeIcon icon={faFileLines} />}
                        disabled={saving}
                        error={errors.name ?? null}
                        constraints={{ required: true, maxLength: NAME_MAX }}
                        fullWidth
                    />

                    <div className="exam-config__field">
                        <label
                            className="exam-config__label"
                            htmlFor="template-select"
                        >
                            Template
                        </label>
                        {templatesLoading ? (
                            <Loading size="sm" message="Loading…" />
                        ) : templatesError ? (
                            <ErrorState
                                error={templatesError}
                                onRetry={loadTemplates}
                            />
                        ) : templates.length === 0 ? (
                            <EmptyState
                                size="sm"
                                title="No templates"
                                description="Create a template first."
                            />
                        ) : (
                            <select
                                id="template-select"
                                className="exam-config__select"
                                value={templateId ?? ''}
                                onChange={(e) =>
                                    handleTemplateChange(
                                        e.target.value
                                            ? Number(e.target.value)
                                            : null,
                                    )
                                }
                                disabled={saving}
                            >
                                <option value="">Select…</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        {errors.templateId && (
                            <div className="exam-config__field-error" role="alert">
                                {errors.templateId}
                            </div>
                        )}
                    </div>
                </div>

                <div className="exam-config__row exam-config__row--3">
                    <Input
                        label="Answer keys"
                        type="number"
                        value={numberOfKeys}
                        onChange={(e) =>
                            handleNumberOfKeysChange(e.target.value)
                        }
                        icon={<FontAwesomeIcon icon={faKey} />}
                        disabled={saving}
                        error={errors.numberOfKeys ?? null}
                        constraints={{
                            required: true,
                            min: KEYS_MIN,
                            max: KEYS_MAX,
                            step: 1,
                        }}
                        fullWidth
                    />
                    <Input
                        label="MCQ points"
                        type="number"
                        value={mcqPoints}
                        onChange={(e) => setMcqPoints(e.target.value)}
                        icon={<FontAwesomeIcon icon={faListOl} />}
                        disabled={saving}
                        error={errors.mcqPoints ?? null}
                        constraints={{
                            required: true,
                            min: MCQ_POINTS_MIN,
                            max: MCQ_POINTS_MAX,
                            step: 0.5,
                        }}
                        fullWidth
                    />
                    <Input
                        label="Written points"
                        type="number"
                        value={writtenPoints}
                        onChange={(e) => setWrittenPoints(e.target.value)}
                        icon={<FontAwesomeIcon icon={faPenNib} />}
                        disabled={saving}
                        error={errors.writtenPoints ?? null}
                        constraints={{
                            required: true,
                            min: WRITTEN_POINTS_MIN,
                            max: WRITTEN_POINTS_MAX,
                            step: 0.5,
                        }}
                        fullWidth
                    />
                </div>

                <div className="exam-config__row exam-config__row--4">
                    <Input
                        label="Grade A ≥"
                        type="number"
                        value={gradeAThreshold}
                        onChange={(e) => setGradeAThreshold(e.target.value)}
                        disabled={saving}
                        error={errors.gradeAThreshold ?? null}
                        constraints={{
                            required: true,
                            min: THRESHOLD_MIN,
                            max: THRESHOLD_MAX,
                            step: 1,
                        }}
                        fullWidth
                    />
                    <Input
                        label="Grade B ≥"
                        type="number"
                        value={gradeBThreshold}
                        onChange={(e) => setGradeBThreshold(e.target.value)}
                        disabled={saving}
                        error={errors.gradeBThreshold ?? null}
                        constraints={{
                            required: true,
                            min: THRESHOLD_MIN,
                            max: THRESHOLD_MAX,
                            step: 1,
                        }}
                        fullWidth
                    />
                    <Input
                        label="Grade C ≥"
                        type="number"
                        value={gradeCThreshold}
                        onChange={(e) => setGradeCThreshold(e.target.value)}
                        disabled={saving}
                        error={errors.gradeCThreshold ?? null}
                        constraints={{
                            required: true,
                            min: THRESHOLD_MIN,
                            max: THRESHOLD_MAX,
                            step: 1,
                        }}
                        fullWidth
                    />
                    <Input
                        label="Grade D ≥"
                        type="number"
                        value={gradeDThreshold}
                        onChange={(e) => setGradeDThreshold(e.target.value)}
                        disabled={saving}
                        error={errors.gradeDThreshold ?? null}
                        constraints={{
                            required: true,
                            min: THRESHOLD_MIN,
                            max: THRESHOLD_MAX,
                            step: 1,
                        }}
                        fullWidth
                    />
                </div>

                <p className="exam-config__hint">
                    Total: <strong>{totalPoints.toFixed(1)} pts</strong> · A
                    &gt; B &gt; C &gt; D · below D is F
                </p>
            </section>

            {/* ---------- Key block ---------- */}

            <section className="exam-config__keys">
                <h2 className="exam-config__keys-title">
                    {mode === 'manual' ? 'Answer keys' : 'Answer key files'}
                </h2>

                {mode === 'manual' ? (
                    selectedTemplate ? (
                        <ManualExamCreator
                            mcqQuestions={selectedTemplate.mcqQuestions}
                            writtenQuestions={selectedTemplate.writtenQuestions}
                            numberOfKeys={keyCountNumber}
                            keys={keys}
                            onChange={setKeys}
                            disabled={saving}
                        />
                    ) : (
                        <EmptyState
                            size="sm"
                            title="Select a template"
                            description="Choose a template above to enter the answer keys."
                        />
                    )
                ) : (
                    <ExtractionExamCreator
                        numberOfKeys={keyCountNumber}
                        files={files}
                        onChange={setFiles}
                        disabled={saving}
                    />
                )}

                {errors.keyA ||
                errors.keyB ||
                errors.keyC ||
                errors.keyD ||
                errors.keyE ? (
                    <div className="exam-config__keys-error" role="alert">
                        {errors.keyA ||
                            errors.keyB ||
                            errors.keyC ||
                            errors.keyD ||
                            errors.keyE}
                    </div>
                ) : null}
            </section>

            {/* ---------- Actions ---------- */}

            {formError && (
                <div className="exam-config__error" role="alert">
                    {formError}
                </div>
            )}

            <footer className="exam-config__actions">
                {onCancel && (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
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
                    disabled={templatesLoading || templates.length === 0}
                >
                    Create exam
                </Button>
            </footer>
        </form>
    );
}

/* ---------------------------------------------------------------- */

function ModeChip({
    value,
    current,
    onSelect,
    disabled,
    icon,
    label,
}: {
    value: ExamCreationMode;
    current: ExamCreationMode;
    onSelect: (v: ExamCreationMode) => void;
    disabled: boolean;
    icon: React.ReactNode;
    label: string;
}) {
    const isActive = value === current;
    return (
        <button
            type="button"
            className={
                'exam-config__chip' +
                (isActive ? ' exam-config__chip--active' : '')
            }
            onClick={() => !disabled && onSelect(value)}
            disabled={disabled}
            aria-pressed={isActive}
        >
            <span aria-hidden="true">{icon}</span>
            <span>{label}</span>
        </button>
    );
}