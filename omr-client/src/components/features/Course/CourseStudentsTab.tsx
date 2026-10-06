// src/components/features/Course/CourseStudentsTab.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUserGraduate, faUsers } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../../common/Button';
import { EmptyState } from '../../common/EmptyState';
import { Tag } from '../../common/Tag';
import type { StudentDS } from '../../../types/Student';
import './CourseStudentsTab.css';

export interface CourseStudentsTabProps {
    /** Enrolled students for the course. */
    students: StudentDS[];
    /** Called when the user clicks "Enroll student". */
    onEnroll?: () => void;
    /** Called when the user clicks a student row. */
    onStudentClick?: (studentId: string) => void;
}

/**
 * Tab content for a course's enrolled students.
 *
 * Renders the list of students plus an "Enroll student" action in
 * the header. The parent (CourseDetailsPage) owns the enrollment
 * dialog and passes `onEnroll` to open it.
 */
export function CourseStudentsTab({
    students,
    onEnroll,
    onStudentClick,
}: CourseStudentsTabProps) {
    return (
        <section className="course-students">
            <header className="course-students__header">
                <div className="course-students__heading">
                    <FontAwesomeIcon
                        icon={faUsers}
                        className="course-students__heading-icon"
                        aria-hidden="true"
                    />
                    <h2 className="course-students__title">
                        Students
                        <Tag size="sm" tone="neutral" className="course-students__count">
                            {students.length}
                        </Tag>
                    </h2>
                </div>

                {onEnroll && (
                    <Button
                        variant="primary"
                        icon={<FontAwesomeIcon icon={faPlus} />}
                        onClick={onEnroll}
                    >
                        Enroll student
                    </Button>
                )}
            </header>

            {students.length === 0 ? (
                <EmptyState
                    size="sm"
                    icon={<FontAwesomeIcon icon={faUserGraduate} />}
                    title="No students enrolled"
                    description="Enroll a student to add them to this course."
                    action={
                        onEnroll && (
                            <Button
                                icon={<FontAwesomeIcon icon={faPlus} />}
                                onClick={onEnroll}
                            >
                                Enroll student
                            </Button>
                        )
                    }
                />
            ) : (
                <ul className="course-students__list">
                    {students.map((student) => (
                        <li
                            key={student.id}
                            className={
                                'course-students__item' +
                                (onStudentClick ? ' course-students__item--clickable' : '')
                            }
                            onClick={
                                onStudentClick
                                    ? () => onStudentClick(student.id)
                                    : undefined
                            }
                            role={onStudentClick ? 'button' : undefined}
                            tabIndex={onStudentClick ? 0 : undefined}
                            onKeyDown={
                                onStudentClick
                                    ? (e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              onStudentClick(student.id);
                                          }
                                      }
                                    : undefined
                            }
                        >
                            <span className="course-students__avatar" aria-hidden="true">
                                <FontAwesomeIcon icon={faUserGraduate} />
                            </span>
                            <span className="course-students__info">
                                <span className="course-students__name">
                                    {student.name}
                                </span>
                                <span className="course-students__id">
                                    ID: {student.id}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}