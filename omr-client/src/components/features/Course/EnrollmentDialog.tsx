// src/components/features/Course/EnrollmentDialog.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMagnifyingGlass,
    faUserGraduate,
    faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog } from '../../common/Dialog';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { Loading } from '../../common/Loading';
import { EmptyState } from '../../common/EmptyState';
import { ErrorState } from '../../common/ErrorState';
import { useToast } from '../../common/Toast';
import { searchStudents } from '../../../api/endpoints/Student';
import type { Student } from '../../../types/Student';
import { enrollStudent } from '../../../api/endpoints/Course';
import { ApiError } from '../../../api/client';
import './EnrollmentDialog.css';

export interface EnrollmentDialogProps {
    /** Whether the dialog is open. */
    open: boolean;
    /** The course to enroll students into. */
    courseId: number;
    /**
     * Student ids already enrolled. These are filtered out of the
     * list so the user can't try to enroll a duplicate.
     */
    enrolledIds: string[];
    /** Called when the dialog should close. */
    onClose: () => void;
    /** Called after a successful enrollment. */
    onEnrolled?: (studentId: string) => void;
}

/**
 * Dialog to pick a student from the current user's roster and
 * enroll them into the course.
 *
 *   <EnrollmentDialog
 *     open={open}
 *     courseId={course.id}
 *     enrolledIds={course.students.map((s) => s.id)}
 *     onClose={close}
 *     onEnrolled={refresh}
 *   />
 */
export function EnrollmentDialog({
    open,
    courseId,
    enrolledIds,
    onClose,
    onEnrolled,
}: EnrollmentDialogProps) {
    const toast = useToast();

    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [query, setQuery] = useState('');
    const [enrollingId, setEnrollingId] = useState<string | null>(null);

    // Load the current user's students whenever the dialog opens.
    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        setLoading(true);
        setError(null);
        setQuery('');

        searchStudents({ searchParams: {} })
            .then((data) => {
                if (!cancelled) setStudents(data);
            })
            .catch((e) => {
                if (!cancelled) setError(e);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open]);

    // The enrolled set is a lookup for O(1) filtering.
    const enrolledSet = useMemo(() => new Set(enrolledIds), [enrolledIds]);

    // Students eligible for enrollment: not already enrolled, and
    // matching the query filter (by name or id, case-insensitive).
    const availableStudents = useMemo(() => {
        const q = query.trim().toLowerCase();
        return students.filter((s) => {
            if (enrolledSet.has(s.id)) return false;
            if (!q) return true;
            return (
                s.name.toLowerCase().includes(q) ||
                s.id.toLowerCase().includes(q)
            );
        });
    }, [students, enrolledSet, query]);

    const handleEnroll = useCallback(
        async (student: Student) => {
            if (enrollingId) return;
            setEnrollingId(student.id);
            try {
                await enrollStudent(courseId, student.id);
                toast.success(`Enrolled ${student.name}`);
                onEnrolled?.(student.id);
                onClose();
            } catch (e) {
                if (e instanceof ApiError) {
                    toast.danger(e.message);
                } else {
                    toast.danger('Failed to enroll student');
                }
            } finally {
                setEnrollingId(null);
            }
        },
        [courseId, enrollingId, onEnrolled, onClose, toast],
    );

    return (
        <Dialog
            open={open}
            title="Enroll student"
            subtitle="Pick a student to add to this course."
            onClose={onClose}
            locked={enrollingId !== null}
            maxWidth={480}
            footer={
                <Button variant="secondary" onClick={onClose} disabled={enrollingId !== null}>
                    Close
                </Button>
            }
        >
            <div className="enrollment">
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or ID…"
                    icon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
                    disabled={loading}
                    fullWidth
                />

                {loading ? (
                    <Loading size="sm" message="Loading students…" />
                ) : error ? (
                    <ErrorState error={error} />
                ) : availableStudents.length === 0 ? (
                    <EmptyState
                        size="sm"
                        icon={<FontAwesomeIcon icon={faUserGraduate} />}
                        title={
                            students.length === 0
                                ? 'No students in your roster'
                                : 'No available students'
                        }
                        description={
                            students.length === 0
                                ? 'Create students first, then enroll them here.'
                                : 'Every matching student is already enrolled.'
                        }
                    />
                ) : (
                    <ul className="enrollment__list">
                        {availableStudents.map((student) => {
                            const isEnrolling = enrollingId === student.id;
                            return (
                                <li key={student.id} className="enrollment__item">
                                    <span className="enrollment__avatar" aria-hidden="true">
                                        <FontAwesomeIcon icon={faUserGraduate} />
                                    </span>
                                    <span className="enrollment__info">
                                        <span className="enrollment__name">
                                            {student.name}
                                        </span>
                                        <span className="enrollment__id">
                                            ID: {student.id}
                                        </span>
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        icon={<FontAwesomeIcon icon={faUserPlus} />}
                                        onClick={() => handleEnroll(student)}
                                        loading={isEnrolling}
                                        disabled={enrollingId !== null && !isEnrolling}
                                    >
                                        Enroll
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </Dialog>
    );
}