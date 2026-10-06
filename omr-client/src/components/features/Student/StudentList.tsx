// src/components/features/Student/StudentList.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faIdCard,
    faUser,
    faPen,
    faTrash,
    faUserGraduate,
    faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { SearchForm } from '../../common/SearchForm';
import type { SearchField } from '../../common/SearchForm';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Loading } from '../../common/Loading';
import { EmptyState } from '../../common/EmptyState';
import { ErrorState } from '../../common/ErrorState';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { useToast } from '../../common/Toast';
import {
    searchStudents,
    deleteStudent,
} from '../../../api/endpoints/Student';
import type { Student } from '../../../types/Student';
import type { SearchForm as SearchFormData } from '../../../types/Common';
import './StudentList.css';

const SEARCH_FIELDS: SearchField[] = [
    {
        name: 'id',
        label: 'Student ID',
        placeholder: 'Up to 8 digits',
        icon: <FontAwesomeIcon icon={faIdCard} />,
        pattern: '^[0-9]{0,8}$',
        maxLength: 8,
    },
    {
        name: 'name',
        label: 'Name',
        placeholder: 'Letters and digits',
        icon: <FontAwesomeIcon icon={faUser} />,
        pattern: '^[a-zA-Z0-9 ]*$',
    },
];

export interface StudentListProps {
    /** Called when the user clicks "New student". */
    onCreate?: () => void;
    /** Called when the user clicks "Update" on a card. */
    onEdit?: (student: Student) => void;
    /** Called when the user clicks a card to view its details. */
    onView?: (studentId: string) => void;
    /** Called after a successful delete. */
    onDeleted?: (student: Student) => void;
}

export function StudentList({
                                onCreate,
                                onEdit,
                                onView,
                                onDeleted,
                            }: StudentListProps) {
    const toast = useToast();

    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [lastForm, setLastForm] = useState<SearchFormData>({ searchParams: {} });

    const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
    const [deleting, setDeleting] = useState(false);

    const runSearch = useCallback(async (form: SearchFormData) => {
        setLoading(true);
        setError(null);
        setLastForm(form);
        try {
            const data = await searchStudents(form);
            setStudents(data);
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void runSearch({ searchParams: {} });
    }, [runSearch]);

    const handleDelete = useCallback(async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            await deleteStudent(pendingDelete.id);
            toast.success(`Student "${pendingDelete.name}" deleted`);
            setStudents((prev) => prev.filter((s) => s.id !== pendingDelete.id));
            onDeleted?.(pendingDelete);
            setPendingDelete(null);
        } catch (e) {
            toast.danger(e instanceof Error ? e.message : 'Delete failed');
        } finally {
            setDeleting(false);
        }
    }, [pendingDelete, onDeleted, toast]);

    const fields = useMemo(() => SEARCH_FIELDS, []);
    const hasResults = students.length > 0;

    return (
        <div className="student-list">
            <div className="student-list__header">
                <h1 className="student-list__title">Students</h1>
                {onCreate && (
                    <Button
                        icon={<FontAwesomeIcon icon={faPlus} />}
                        onClick={onCreate}
                    >
                        New student
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
                <Loading message="Loading students…" />
            ) : error ? (
                <ErrorState error={error} onRetry={() => runSearch(lastForm)} />
            ) : !hasResults ? (
                <EmptyState
                    icon={<FontAwesomeIcon icon={faUserGraduate} />}
                    title="No students found"
                    description="Try adjusting your search, or create a new student."
                    action={
                        onCreate && (
                            <Button
                                icon={<FontAwesomeIcon icon={faPlus} />}
                                onClick={onCreate}
                            >
                                New student
                            </Button>
                        )
                    }
                />
            ) : (
                <div className="student-list__grid">
                    {students.map((student) => (
                        <Card
                            key={student.id}
                            title={student.name}
                            subtitle={`ID: ${student.id}`}
                            onClick={
                                onView ? () => onView(student.id) : undefined
                            }
                            actions={
                                <>
                                    <button
                                        type="button"
                                        className="student-list__action"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit?.(student);
                                        }}
                                        aria-label={`Update ${student.name}`}
                                        title="Update student"
                                    >
                                        <FontAwesomeIcon icon={faPen} />
                                    </button>
                                    <button
                                        type="button"
                                        className="student-list__action student-list__action--danger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPendingDelete(student);
                                        }}
                                        aria-label={`Delete ${student.name}`}
                                        title="Delete student"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </>
                            }
                        />
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={pendingDelete !== null}
                title="Delete student?"
                message={
                    pendingDelete && (
                        <>
                            Delete <strong>{pendingDelete.name}</strong> (ID:{' '}
                            {pendingDelete.id})? This action cannot be undone.
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