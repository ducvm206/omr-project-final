// src/types/Student.ts

import type { CourseDS } from './Course';
import type { GradingResultDS } from './Grading';

/** Student as returned by search/list endpoints. */
export interface Student {
    id: string;
    name: string;
    ownerId: number;
}

/**
 * Payload for creating or updating a student.
 * The owner is set server-side from the authenticated session.
 */
export interface StudentDS {
    id: string;
    name: string;
}

/** Full student details with courses and results. */
export interface StudentDetailsDS {
    id: string;
    name: string;
    courses: CourseDS[];
    gradingResults: GradingResultDS[];
}

