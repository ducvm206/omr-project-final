// src/components/features/Course/CourseCreationDialog.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBook,
    faCalendarDays,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import { Dialog } from '../../common/Dialog';
import { Input } from '../../common/Input';
import { TextArea } from '../../common/TextArea';
import { Button } from '../../common/Button';
import { useToast } from '../../common/Toast';
import {
    createCourse,
    updateCourse,
} from '../../../api/endpoints/Course';
import { ApiError } from '../../../api/client';
import type { CourseDS } from '../../../types/Course';
import './CourseCreationDialog.css';

/**
 * Compute the current academic year as "YYYY-YY".
 * Academic years roll over in September.
 */
function currentAcademicYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const startYear = now.getMonth() >= 8 ? year : year - 1;
    const endYear = (startYear + 1) % 100;
    return `${startYear}-${String(endYear).padStart(2, '0')}`;
}

export interface CourseCreationDialogProps {
    /** Whether the dialog is open. */
    open: boolean;
    /**
     * The course to edit. When null, the dialog creates a new one.
     * When set, the dialog updates in place.
     */
    course?: CourseDS | null;
    /** Called when the dialog should close. */
    onClose: () => void;
    /** Called after a successful create or update. */
    onSaved?: (course: CourseDS) => void;
}

/**
 * Create or update a course.
 *
 *   <CourseCreationDialog
 *     open={open}
 *     course={editing}          // null to create
 *     onClose={close}
 *     onSaved={(c) => refresh()}
 *   />
 */
export function CourseCreationDialog({
    open,
    course,
    onClose,
    onSaved,
}: CourseCreationDialogProps) {
    const toast = useToast();
    const isEdit = course !== null && course !== undefined;

    const [name, setName] = useState('');
    const [academicYear, setAcademicYear] = useState(currentAcademicYear());
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    // Reset the form when the dialog opens or switches courses.
    useEffect(() => {
        if (!open) return;
        setName(course?.name ?? '');
        setAcademicYear(course?.academicYear ?? currentAcademicYear());
        setDescription(course?.description ?? '');
        setErrors({});
        setFormError(null);
    }, [open, course]);

    const validate = (): boolean => {
        const next: Record<string, string> = {};

        const trimmedName = name.trim();
        if (!trimmedName) {
            next.name = 'Course name is required.';
        } else if (trimmedName.length > 120) {
            next.name = 'Course name must be at most 120 characters.';
        }

        const trimmedYear = academicYear.trim();
        if (!trimmedYear) {
            next.academicYear = 'Academic year is required.';
        } else if (!/^[0-9]{4}-[0-9]{2}$/.test(trimmedYear)) {
            next.academicYear = 'Format must be YYYY-YY (e.g. 2026-27).';
        }

        const trimmedDesc = description.trim();
        if (!trimmedDesc) {
            next.description = 'Description is required.';
        } else if (trimmedDesc.length > 500) {
            next.description = 'Description must be at most 500 characters.';
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async () => {
        if (saving) return;
        setFormError(null);
        if (!validate()) return;

        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                academicYear: academicYear.trim(),
                description: description.trim(),
            };

            const saved = isEdit
                ? await updateCourse({ ...payload, id: course.id })
                : await createCourse(payload);

            toast.success(
                isEdit
                    ? `Course "${saved.name}" updated`
                    : `Course "${saved.name}" created`,
            );
            onSaved?.(saved);
            onClose();
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
        onClose();
    };

    return (
        <Dialog
            open={open}
            title={isEdit ? 'Update course' : 'New course'}
            subtitle={
                isEdit
                    ? `Editing "${course.name}"`
                    : 'Create a new course to organize students and exams.'
            }
            onClose={handleCancel}
            locked={saving}
            maxWidth={520}
            footer={
                <>
                    <Button
                        variant="secondary"
                        onClick={handleCancel}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        loading={saving}
                    >
                        {isEdit ? 'Save changes' : 'Create course'}
                    </Button>
                </>
            }
        >
            <div className="course-dialog__form">
                <Input
                    label="Course name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Math 101"
                    icon={<FontAwesomeIcon icon={faBook} />}
                    disabled={saving}
                    error={errors.name ?? null}
                    constraints={{
                        required: true,
                        maxLength: 120,
                        title: 'Up to 120 characters',
                    }}
                    autoFocus
                    fullWidth
                />

                <Input
                    label="Academic year"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="YYYY-YY"
                    icon={<FontAwesomeIcon icon={faCalendarDays} />}
                    disabled={saving}
                    error={errors.academicYear ?? null}
                    constraints={{
                        required: true,
                        minLength: 7,
                        maxLength: 7,
                        pattern: '^[0-9]{4}-[0-9]{2}$',
                        title: 'Format: YYYY-YY (e.g. 2026-27)',
                    }}
                    hint="Format: YYYY-YY (e.g. 2026-27)"
                    fullWidth
                />

                <TextArea
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief summary of the course…"
                    disabled={saving}
                    error={errors.description ?? null}
                    constraints={{
                        required: true,
                        maxLength: 500,
                    }}
                    showCount
                    rows={4}
                    fullWidth
                />

                {formError && (
                    <div className="course-dialog__error" role="alert">
                        {formError}
                    </div>
                )}
            </div>
        </Dialog>
    );
}