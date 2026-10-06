// src/components/features/Course/CourseList.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBook,
    faCalendarDays,
    faPen,
    faTrash,
    faPlus,
    faUserGraduate,
} from '@fortawesome/free-solid-svg-icons';
import { SearchForm } from '../../common/SearchForm';
import type { SearchField } from '../../common/SearchForm';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Loading } from '../../common/Loading';
import { EmptyState } from '../../common/EmptyState';
import { ErrorState } from '../../common/ErrorState';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { Tag } from '../../common/Tag';
import { useToast } from '../../common/Toast';
import { searchCourses, deleteCourse } from '../../../api/endpoints/Course';
import type { CourseDS } from '../../../types/Course';
import type { SearchForm as SearchFormData } from '../../../types/Common';
import './CourseList.css';

/**
 * Compute the current academic year as "YYYY-YY".
 * Academic years roll over in September — before that month, the
 * previous year is the active one.
 *
 *   Sep 2026 → "2026-27"
 *   Aug 2026 → "2025-26"
 */
function currentAcademicYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const startYear = now.getMonth() >= 8 ? year : year - 1; // 8 = September
    const endYear = (startYear + 1) % 100;
    return `${startYear}-${String(endYear).padStart(2, '0')}`;
}

export interface CourseListProps {
    /** Called when the user clicks "New course". */
    onCreate?: () => void;
    /** Called when the user clicks "Update" on a card. */
    onEdit?: (course: CourseDS) => void;
    /** Called when the user clicks a card to view its details. */
    onView?: (courseId: number) => void;
    /** Called after a successful delete. */
    onDeleted?: (course: CourseDS) => void;
}

export function CourseList({
    onCreate,
    onEdit,
    onView,
    onDeleted,
}: CourseListProps) {
    const toast = useToast();

    const [courses, setCourses] = useState<CourseDS[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [lastForm, setLastForm] = useState<SearchFormData>({
        searchParams: {},
    });

    const [pendingDelete, setPendingDelete] = useState<CourseDS | null>(null);
    const [deleting, setDeleting] = useState(false);

    const runSearch = useCallback(async (form: SearchFormData) => {
        setLoading(true);
        setError(null);
        setLastForm(form);
        try {
            const data = await searchCourses(form);
            setCourses(data);
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    }, []);

    // The search fields are built once. The academic year field has a
    // default value, so the initial search below sends it.
    const fields = useMemo<SearchField[]>(
        () => [
            {
                name: 'name',
                label: 'Course name',
                placeholder: 'e.g. Math 101',
                icon: <FontAwesomeIcon icon={faBook} />,
            },
            {
                name: 'academicYear',
                label: 'Academic year',
                placeholder: 'YYYY-YY',
                defaultValue: currentAcademicYear(),
                icon: <FontAwesomeIcon icon={faCalendarDays} />,
                pattern: '^[0-9]{4}-[0-9]{2}$',
                maxLength: 7,
                minLength: 7,
                title: 'Format: YYYY-YY (e.g. 2026-27)',
            },
        ],
        [],
    );

    // Initial load — same defaults the SearchForm starts with.
    useEffect(() => {
        void runSearch({
            searchParams: { academicYear: currentAcademicYear() },
        });
    }, [runSearch]);

    const handleDelete = useCallback(async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            await deleteCourse(pendingDelete.id);
            toast.success(`Course "${pendingDelete.name}" deleted`);
            setCourses((prev) => prev.filter((c) => c.id !== pendingDelete.id));
            onDeleted?.(pendingDelete);
            setPendingDelete(null);
        } catch (e) {
            toast.danger(e instanceof Error ? e.message : 'Delete failed');
        } finally {
            setDeleting(false);
        }
    }, [pendingDelete, onDeleted, toast]);

    const hasResults = courses.length > 0;

    return (
        <div className="course-list">
            <div className="course-list__header">
                <h1 className="course-list__title">Courses</h1>
                {onCreate && (
                    <Button
                        icon={<FontAwesomeIcon icon={faPlus} />}
                        onClick={onCreate}
                    >
                        New course
                    </Button>
                )}
            </div>

            <SearchForm
                fields={fields}
                onSubmit={runSearch}
                loading={loading}
                submitLabel="Search"
            />

            {loading ? (
                <Loading message="Loading courses…" />
            ) : error ? (
                <ErrorState error={error} onRetry={() => runSearch(lastForm)} />
            ) : !hasResults ? (
                <EmptyState
                    icon={<FontAwesomeIcon icon={faBook} />}
                    title="No courses found"
                    description="Try adjusting your search, or create a new course."
                    action={
                        onCreate && (
                            <Button
                                icon={<FontAwesomeIcon icon={faPlus} />}
                                onClick={onCreate}
                            >
                                New course
                            </Button>
                        )
                    }
                />
            ) : (
                <div className="course-list__grid">
                    {courses.map((course) => (
                        <Card
                            key={course.id}
                            title={course.name}
                            subtitle={course.description}
                            onClick={
                                onView ? () => onView(course.id) : undefined
                            }
                            actions={
                                <>
                                    <button
                                        type="button"
                                        className="course-list__action"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit?.(course);
                                        }}
                                        aria-label={`Update ${course.name}`}
                                        title="Update course"
                                    >
                                        <FontAwesomeIcon icon={faPen} />
                                    </button>
                                    <button
                                        type="button"
                                        className="course-list__action course-list__action--danger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPendingDelete(course);
                                        }}
                                        aria-label={`Delete ${course.name}`}
                                        title="Delete course"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </>
                            }
                            footer={
                                <div className="course-list__meta">
                                    <Tag size="sm" tone="info">
                                        {course.academicYear}
                                    </Tag>
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={pendingDelete !== null}
                title="Delete course?"
                message={
                    pendingDelete && (
                        <>
                            Delete <strong>{pendingDelete.name}</strong> (
                            {pendingDelete.academicYear})? This action cannot be
                            undone.
                        </>
                    )
                }
                variant="danger"
                confirmLabel="Delete"
                loading={deleting}
                onConfirm={handleDelete}
                onCancel={() => !deleting && setPendingDelete(null)}
            />
        </div>
    );
}