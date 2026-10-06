// src/pages/ExamConfig.tsx

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { ExamConfigForm } from '../components/features/Exam/ExamConfigForm';
import { getCourseDetails } from '../api/endpoints/Course';
import type { CourseDetailDS } from '../types/Course';
import './ExamConfig.css';

/**
 * Route page for /courses/:courseId/exams/new.
 *
 * Loads the course so the form header can show which course the new
 * exam belongs to, then renders ExamConfigForm.
 */
export function ExamConfigPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    const [course, setCourse] = useState<CourseDetailDS | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);

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

    const goBack = useCallback(() => {
        navigate(`/courses/${numericId}`, { replace: true });
    }, [navigate, numericId]);

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

    // --- Render -----------------------------------------------------------

    return (
        <div className="exam-config-page">
            <header className="exam-config-page__header">
                <Button
                    variant="ghost"
                    icon={<FontAwesomeIcon icon={faArrowLeft} />}
                    onClick={goBack}
                >
                    Back to course
                </Button>

                <div className="exam-config-page__heading">
                    <h1 className="exam-config-page__title">New exam</h1>
                    <p className="exam-config-page__subtitle">
                        {course.name} · {course.academicYear}
                    </p>
                </div>
            </header>

            <ExamConfigForm
                courseId={numericId}
                onCreated={goBack}
                onCancel={goBack}
            />
        </div>
    );
}