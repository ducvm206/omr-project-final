// src/components/features/Course/CourseResultsAnalytics.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar } from '@fortawesome/free-solid-svg-icons';
import { EmptyState } from '../../common/EmptyState';
import { Tag } from '../../common/Tag';
import { CourseResultsTable } from './CourseResultsTable';
import type { CourseDetailDS } from '../../../types/Course';
import type { GradingResultDS, Grade } from '../../../types/Grading';
import './CourseResultsAnalytics.css';

export interface CourseResultsAnalyticsProps {
    /** The full course detail payload. */
    course: CourseDetailDS;
    /** Called when the user clicks a result cell. */
    onCellClick?: (studentId: string, examId: number) => void;
    /** Called after an exam is successfully deleted. */
    onExamDeleted?: (examId: number) => void;
}

/**
 * Analytics panel for a course's results.
 *
 * Composes:
 *   - the section header (title + counts)
 *   - the results matrix table (CourseResultsTable)
 *   - the course statistics panel
 *
 * Delete dialog, sort state, and filter menus all live inside
 * CourseResultsTable.
 */
export function CourseResultsAnalytics({
    course,
    onCellClick,
    onExamDeleted,
}: CourseResultsAnalyticsProps) {
    const { examResults, studentResults } = course;

    if (examResults.length === 0 || studentResults.length === 0) {
        return (
            <EmptyState
                size="sm"
                icon={<FontAwesomeIcon icon={faChartBar} />}
                title="No results to show"
                description={
                    examResults.length === 0
                        ? 'Create an exam to start grading.'
                        : 'No students have been graded yet.'
                }
            />
        );
    }

    const stats = computeStats(course);

    return (
        <section className="course-results">
            <header className="course-results__header">
                <div className="course-results__heading">
                    <FontAwesomeIcon
                        icon={faChartBar}
                        className="course-results__header-icon"
                        aria-hidden="true"
                    />
                    <h2 className="course-results__title">
                        Results Matrix
                        <Tag
                            size="sm"
                            tone="neutral"
                            className="course-results__count"
                        >
                            {studentResults.length} × {examResults.length}
                        </Tag>
                    </h2>
                </div>
            </header>

            <CourseResultsTable
                examResults={examResults}
                studentResults={studentResults}
                onCellClick={onCellClick}
                onExamDeleted={onExamDeleted}
            />

            {/* Course statistics panel */}

            <div className="course-stats">
                <h3 className="course-stats__title">Course statistics</h3>

                <div className="course-stats__grid">
                    <StatItem
                        label="Students"
                        value={String(stats.totalStudents)}
                    />
                    <StatItem label="Exams" value={String(stats.totalExams)} />
                    <StatItem
                        label="Total results"
                        value={String(stats.totalResults)}
                    />
                    <StatItem
                        label="Course average"
                        value={
                            stats.courseAverage === null
                                ? '—'
                                : stats.courseAverage.toFixed(2)
                        }
                    />
                </div>

                <div className="course-stats__grades">
                    {(['A', 'B', 'C', 'D', 'F'] as Grade[]).map((g) => (
                        <div key={g} className="course-stats__grade">
                            <Tag grade={g}>{g}</Tag>
                            <span className="course-stats__grade-count">
                                {stats.gradeDistribution[g]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ---------------------------------------------------------------- */
/* Stats helpers                                                     */
/* ---------------------------------------------------------------- */

interface CourseStatsShape {
    totalStudents: number;
    totalExams: number;
    totalResults: number;
    courseAverage: number | null;
    gradeDistribution: Record<Grade, number>;
}

function computeStats(course: CourseDetailDS): CourseStatsShape {
    const { studentResults, examResults } = course;

    const allResults: GradingResultDS[] = [];
    for (const sr of studentResults) {
        for (const gr of sr.gradingResults) {
            allResults.push(gr);
        }
    }

    const gradeDistribution: Record<Grade, number> = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        F: 0,
    };

    let sum = 0;
    let counted = 0;
    for (const r of allResults) {
        sum += r.totalPoints;
        counted += 1;
        if (r.grade in gradeDistribution) {
            gradeDistribution[r.grade as Grade] += 1;
        }
    }

    return {
        totalStudents: studentResults.length,
        totalExams: examResults.length,
        totalResults: allResults.length,
        courseAverage: counted > 0 ? sum / counted : null,
        gradeDistribution,
    };
}

function StatItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="course-stats__item">
            <div className="course-stats__item-label">{label}</div>
            <div className="course-stats__item-value">{value}</div>
        </div>
    );
}