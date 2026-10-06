// src/pages/CourseDetails.tsx

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faChartBar } from '@fortawesome/free-solid-svg-icons';
import { CourseDetailsInfo } from '../components/features/Course/CourseDetailsInfo';
import { CourseStudentsTab } from '../components/features/Course/CourseStudentsTab';
import { CourseResultsAnalytics } from '../components/features/Course/CourseResultsAnalytics';
import { EnrollmentDialog } from '../components/features/Course/EnrollmentDialog';
import { Tabs } from '../components/common/Tabs';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import {
    getCourseDetails,
    deleteCourse,
} from '../api/endpoints/Course';
import type { CourseDetailDS } from '../types/Course';

type TabKey = 'students' | 'results';

export function CourseDetailsPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const toast = useToast();

    const [course, setCourse] = useState<CourseDetailDS | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const [tab, setTab] = useState<TabKey>('students');
    const [enrollOpen, setEnrollOpen] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const numericId = courseId ? Number(courseId) : NaN;

    const loadCourse = useCallback(async () => {
        if (Number.isNaN(numericId)) {
            setError(new Error('Invalid course id'));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await getCourseDetails(numericId);
            setCourse(data);
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    }, [numericId]);

    useEffect(() => {
        void loadCourse();
    }, [loadCourse]);

    const handleDelete = useCallback(async () => {
        if (Number.isNaN(numericId)) return;
        setDeleting(true);
        try {
            await deleteCourse(numericId);
            toast.success('Course deleted');
            navigate('/courses', { replace: true });
        } catch (e) {
            toast.danger(e instanceof Error ? e.message : 'Delete failed');
        } finally {
            setDeleting(false);
        }
    }, [numericId, navigate, toast]);

    const handleEnrolled = useCallback(() => {
        setEnrollOpen(false);
        void loadCourse();
    }, [loadCourse]);

    // --- States -----------------------------------------------------------

    if (loading) {
        return <Loading message="Loading course…" />;
    }

    if (error) {
        return <ErrorState error={error} onRetry={loadCourse} />;
    }

    if (!course) {
        return null;
    }

    const totalResults = course.studentResults.reduce(
        (sum, s) => sum + s.gradingResults.length,
        0,
    );

    // --- Render -----------------------------------------------------------

    return (
        <>
            <div className="course-details">
                <CourseDetailsInfo
                    course={course}
                    onCreateExam={() => navigate(`/courses/${numericId}/exams/new`)}
                    onDelete={() => setConfirmDelete(true)}
                />

                <Tabs
                    tabs={[
                        {
                            key: 'students',
                            label: `Students (${course.students.length})`,
                            icon: <FontAwesomeIcon icon={faUsers} />,
                        },
                        {
                            key: 'results',
                            label: `Results (${totalResults})`,
                            icon: <FontAwesomeIcon icon={faChartBar} />,
                        },
                    ]}
                    activeKey={tab}
                    onChange={(k) => setTab(k as TabKey)}
                />

                {tab === 'students' && (
                    <CourseStudentsTab
                        students={course.students}
                        onEnroll={() => setEnrollOpen(true)}
                    />
                )}

                {tab === 'results' && (
                    <CourseResultsAnalytics
                        course={course}
                        onExamDeleted={() => {
                            void loadCourse();
                        }}
                    />
                )}
            </div>

            <EnrollmentDialog
                open={enrollOpen}
                courseId={numericId}
                enrolledIds={course.students.map((s) => s.id)}
                onClose={() => setEnrollOpen(false)}
                onEnrolled={handleEnrolled}
            />

            <ConfirmDialog
                open={confirmDelete}
                title="Delete course?"
                message={
                    <>
                        Delete <strong>{course.name}</strong> (
                        {course.academicYear})? This action cannot be undone.
                    </>
                }
                variant="danger"
                confirmLabel="Delete"
                loading={deleting}
                onConfirm={handleDelete}
                onCancel={() => !deleting && setConfirmDelete(false)}
            />
        </>
    );
}