// src/components/features/Student/StudentDetailDialog.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBook,
    faGraduationCap,
    faPen,
    faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import { Dialog } from '../../common/Dialog';
import { Button } from '../../common/Button';
import { Loading } from '../../common/Loading';
import { EmptyState } from '../../common/EmptyState';
import { ErrorState } from '../../common/ErrorState';
import { Tag } from '../../common/Tag';
import { useToast } from '../../common/Toast';
import {
    getStudentDetails,
    deleteStudent,
} from '../../../api/endpoints/Student';
import type { StudentDetailsDS } from '../../../types/Student';
import type { CourseDS } from '../../../types/Course';
import type { GradingResultDS, Grade } from '../../../types/Grading';
import './StudentDetailDialog.css';

export interface StudentDetailDialogProps {
    open: boolean;
    studentId: string | null;
    onClose: () => void;
    onEdit?: (studentId: string) => void;
    onDeleted?: (studentId: string) => void;
}

export function StudentDetailDialog({
                                        open,
                                        studentId,
                                        onClose,
                                        onEdit,
                                        onDeleted,
                                    }: StudentDetailDialogProps) {
    const toast = useToast();

    const [details, setDetails] = useState<StudentDetailsDS | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!open || !studentId) return;

        let cancelled = false;
        setLoading(true);
        setError(null);
        setDetails(null);

        getStudentDetails(studentId)
            .then((data) => {
                if (!cancelled) setDetails(data);
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
    }, [open, studentId]);

    const handleDelete = async () => {
        if (!studentId || deleting) return;
        setDeleting(true);
        try {
            await deleteStudent(studentId);
            toast.success('Student deleted');
            onDeleted?.(studentId);
            onClose();
        } catch (e) {
            toast.danger(
                e instanceof Error ? e.message : 'Failed to delete student',
            );
        } finally {
            setDeleting(false);
        }
    };

    const title = details?.name ?? 'Student';
    const subtitle = details ? `ID: ${details.id}` : undefined;

    return (
        <Dialog
            open={open}
            title={title}
            subtitle={subtitle}
            onClose={onClose}
            locked={deleting}
            maxWidth={640}
            footer={
                <div className="student-detail__footer">
                    <div className="student-detail__footer-left">
                        <Button
                            variant="danger"
                            icon={<FontAwesomeIcon icon={faTrash} />}
                            onClick={handleDelete}
                            loading={deleting}
                            disabled={loading || !!error}
                        >
                            Delete
                        </Button>
                    </div>
                    <div className="student-detail__footer-right">
                        <Button variant="secondary" onClick={onClose} disabled={deleting}>
                            Close
                        </Button>
                        {onEdit && details && (
                            <Button
                                variant="primary"
                                icon={<FontAwesomeIcon icon={faPen} />}
                                onClick={() => onEdit(details.id)}
                                disabled={deleting}
                            >
                                Edit
                            </Button>
                        )}
                    </div>
                </div>
            }
        >
            {loading ? (
                <Loading message="Loading student…" />
            ) : error ? (
                <ErrorState error={error} />
            ) : details ? (
                <div className="student-detail">
                    <Section
                        title="Courses"
                        count={details.courses.length}
                        icon={<FontAwesomeIcon icon={faBook} />}
                    >
                        {details.courses.length === 0 ? (
                            <EmptyState
                                size="sm"
                                title="Not enrolled in any course"
                            />
                        ) : (
                            <div className="student-detail__list student-detail__list--courses">
                                {details.courses.map((c) => (
                                    <CourseItem key={c.id} course={c} />
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section
                        title="Results"
                        count={details.gradingResults.length}
                        icon={<FontAwesomeIcon icon={faGraduationCap} />}
                    >
                        {details.gradingResults.length === 0 ? (
                            <EmptyState
                                size="sm"
                                title="No grading results yet"
                            />
                        ) : (
                            <div className="student-detail__list student-detail__list--results">
                                {details.gradingResults.map((r) => (
                                    <ResultItem
                                        key={`${r.studentId}-${r.examId}`}
                                        result={r}
                                    />
                                ))}
                            </div>
                        )}
                    </Section>
                </div>
            ) : null}
        </Dialog>
    );
}

function Section({
                     title,
                     count,
                     icon,
                     children,
                 }: {
    title: string;
    count: number;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="student-detail__section">
            <header className="student-detail__section-header">
                <span className="student-detail__section-icon" aria-hidden="true">
                    {icon}
                </span>
                <h3 className="student-detail__section-title">{title}</h3>
                <Tag size="sm" tone="neutral">{count}</Tag>
            </header>
            {children}
        </section>
    );
}

function CourseItem({ course }: { course: CourseDS }) {
    return (
        <div className="student-detail__course">
            <span className="student-detail__course-name">{course.name}</span>
            <Tag size="sm" tone="info">{course.academicYear}</Tag>
        </div>
    );
}

function ResultItem({ result }: { result: GradingResultDS }) {
    return (
        <div className="student-detail__result">
            <div className="student-detail__result-row">
                <Tag grade={result.grade as Grade}>{result.grade}</Tag>
                <span className="student-detail__result-exam">
                    Exam #{result.examId}
                </span>
                <span className="student-detail__result-score">
                    {result.totalPoints.toFixed(1)} pts ·{' '}
                    {result.percentage.toFixed(1)}%
                </span>
            </div>

            <div className="student-detail__result-meta">
                <Tag size="sm" tone="neutral">Key {result.keyUsed}</Tag>

                <span className="student-detail__result-stats">
                    MCQ: {result.mcqCorrect} correct
                    {result.mcqPartial > 0 && (
                        <>
                            {', '}
                            <Tag size="sm" tone="warning">
                                {result.mcqPartial} partial
                            </Tag>
                        </>
                    )}
                    {result.mcqIncorrect > 0 && (
                        <>
                            {', '}
                            <Tag size="sm" tone="danger">
                                {result.mcqIncorrect} wrong
                            </Tag>
                        </>
                    )}
                    {result.mcqBlank > 0 && (
                        <>
                            {', '}
                            <Tag size="sm" tone="neutral">
                                {result.mcqBlank} blank
                            </Tag>
                        </>
                    )}
                </span>

                <span className="student-detail__result-stats">
                    Written: {result.writtenCorrect} correct
                    {result.writtenIncorrect > 0 && (
                        <>
                            {', '}
                            <Tag size="sm" tone="danger">
                                {result.writtenIncorrect} wrong
                            </Tag>
                        </>
                    )}
                    {result.writtenBlank > 0 && (
                        <>
                            {', '}
                            <Tag size="sm" tone="neutral">
                                {result.writtenBlank} blank
                            </Tag>
                        </>
                    )}
                </span>
            </div>
        </div>
    );
}