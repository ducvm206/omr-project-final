// src/components/features/Course/CourseDetailsInfo.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBook,
    faCalendarDays,
    faPen,
    faTrash,
    faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '../../common/Button';
import { Tag } from '../../common/Tag';
import type { CourseDetailDS } from '../../../types/Course';
import './CourseDetailsInfo.css';

export interface CourseDetailsInfoProps {
    /** The course detail payload from GET /api/courses/{id}. */
    course: CourseDetailDS;
    /** Called when the user clicks "Edit". */
    onEdit?: () => void;
    /** Called when the user clicks "Delete". */
    onDelete?: () => void;
    /** Called when the user clicks "Create exam". */
    onCreateExam?: () => void;
}

/**
 * Header panel for the course detail page.
 * Shows the course name, academic year, and description, with edit,
 * delete, and create-exam actions on the right.
 */
export function CourseDetailsInfo({
    course,
    onEdit,
    onDelete,
    onCreateExam,
}: CourseDetailsInfoProps) {
    const hasActions = onEdit || onDelete || onCreateExam;

    return (
        <section className="course-info">
            <div className="course-info__main">
                <div className="course-info__heading">
                    <span className="course-info__icon" aria-hidden="true">
                        <FontAwesomeIcon icon={faBook} />
                    </span>
                    <h1 className="course-info__name">{course.name}</h1>
                </div>

                <div className="course-info__meta">
                    <Tag
                        tone="info"
                        icon={<FontAwesomeIcon icon={faCalendarDays} />}
                    >
                        {course.academicYear}
                    </Tag>
                </div>

                {course.description && (
                    <p className="course-info__description">
                        {course.description}
                    </p>
                )}
            </div>

            {hasActions && (
                <div className="course-info__actions">
                    {onCreateExam && (
                        <Button
                            variant="primary"
                            icon={<FontAwesomeIcon icon={faPlus} />}
                            onClick={onCreateExam}
                        >
                            Create exam
                        </Button>
                    )}
                    {onEdit && (
                        <Button
                            variant="secondary"
                            icon={<FontAwesomeIcon icon={faPen} />}
                            onClick={onEdit}
                        >
                            Edit
                        </Button>
                    )}
                    {onDelete && (
                        <Button
                            variant="danger"
                            icon={<FontAwesomeIcon icon={faTrash} />}
                            onClick={onDelete}
                        >
                            Delete
                        </Button>
                    )}
                </div>
            )}
        </section>
    );
}