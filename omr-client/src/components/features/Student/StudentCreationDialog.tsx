// src/components/features/Student/StudentCreationDialog.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdCard, faUser } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import { Dialog } from '../../common/Dialog';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import { useToast } from '../../common/Toast';
import {
    createStudent,
    updateStudent,
} from '../../../api/endpoints/Student';
import { ApiError } from '../../../api/client';
import type { Student } from '../../../types/Student';
import './StudentCreationDialog.css';

export interface StudentCreationDialogProps {
    /** Whether the dialog is open. */
    open: boolean;
    /**
     * The student to edit. When null, the dialog creates a new one.
     * When set, the dialog updates in place.
     */
    student?: Student | null;
    /** Called when the dialog should close (cancel, backdrop, Escape). */
    onClose: () => void;
    /** Called after a successful create or update. */
    onSaved?: (student: Student) => void;
}

/**
 * Create or update a student.
 *
 *   <StudentCreationDialog
 *     open={open}
 *     student={editing}          // null to create
 *     onClose={close}
 *     onSaved={(s) => refresh()}
 *   />
 */
export function StudentCreationDialog({
                                          open,
                                          student,
                                          onClose,
                                          onSaved,
                                      }: StudentCreationDialogProps) {
    const toast = useToast();
    const isEdit = student !== null && student !== undefined;

    const [id, setId] = useState('');
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    // Reset form when the dialog opens (or when switching between
    // create and edit modes).
    useEffect(() => {
        if (!open) return;
        setId(student?.id ?? '');
        setName(student?.name ?? '');
        setErrors({});
        setFormError(null);
    }, [open, student]);

    // Client-side validation. Mirrors the backend constraints.
    const validate = (): boolean => {
        const next: Record<string, string> = {};

        if (!id.trim()) {
            next.id = 'Student ID is required.';
        } else if (!/^[0-9]{1,8}$/.test(id.trim())) {
            next.id = 'Student ID must be 1–8 digits.';
        }

        if (!name.trim()) {
            next.name = 'Name is required.';
        } else if (!/^[a-zA-Z0-9 ]+$/.test(name.trim())) {
            next.name = 'Name may only contain letters, digits, and spaces.';
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
            const payload = { id: id.trim(), name: name.trim() };

            const saved = isEdit
                ? await updateStudent(student.id, payload)
                : await createStudent(payload);

            toast.success(
                isEdit
                    ? `Student "${saved.name}" updated`
                    : `Student "${saved.name}" created`,
            );
            onSaved?.(saved);
            onClose();
        } catch (e) {
            if (e instanceof ApiError) {
                // Server-side validation errors land in `validationErrors`.
                if (e.validationErrors) {
                    setErrors(e.validationErrors);
                } else {
                    setFormError(e.message);
                }
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
            title={isEdit ? 'Update student' : 'New student'}
            subtitle={
                isEdit
                    ? `Editing ${student.name} (ID: ${student.id})`
                    : 'Add a student to your roster.'
            }
            onClose={handleCancel}
            locked={saving}
            maxWidth={460}
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
                        {isEdit ? 'Save changes' : 'Create student'}
                    </Button>
                </>
            }
        >
            <div className="student-dialog__form">
                <Input
                    label="Student ID"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="Up to 8 digits"
                    icon={<FontAwesomeIcon icon={faIdCard} />}
                    disabled={saving || isEdit}
                    error={errors.id ?? null}
                    constraints={{
                        required: true,
                        maxLength: 8,
                        pattern: '^[0-9]{1,8}$',
                        title: 'Student ID must be 1–8 digits',
                    }}
                    hint={
                        isEdit
                            ? 'The student ID cannot be changed.'
                            : undefined
                    }
                    fullWidth
                />

                <Input
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alice Nguyen"
                    icon={<FontAwesomeIcon icon={faUser} />}
                    disabled={saving}
                    error={errors.name ?? null}
                    constraints={{
                        required: true,
                        maxLength: 120,
                        pattern: '^[a-zA-Z0-9 ]+$',
                        title: 'Letters, digits, and spaces only',
                    }}
                    fullWidth
                />

                {formError && (
                    <div className="student-dialog__error" role="alert">
                        {formError}
                    </div>
                )}
            </div>
        </Dialog>
    );
}