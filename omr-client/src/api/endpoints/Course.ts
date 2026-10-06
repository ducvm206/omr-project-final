// src/api/endpoints/Course.ts

import type { SearchForm } from '../../types/Common';
import type { CourseDS, CourseDetailDS } from '../../types/Course';
import type { StudentDS } from '../../types/Student';
import { apiFetch } from '../client';

/**
 * Search courses owned by the current user.
 * POST /api/courses
 *
 *   { searchParams: { name?: string, academicYear?: string } }
 */
export async function searchCourses(form: SearchForm): Promise<CourseDS[]> {
    const courses = await apiFetch<CourseDS[] | null>('/api/courses', {
        method: 'POST',
        body: form,
    });
    return courses ?? [];
}

/**
 * Create a new course.
 * POST /api/courses/create
 *
 * The owner is set server-side from the authenticated session.
 */
export async function createCourse(
    ds: Omit<CourseDS, 'id'>,
): Promise<CourseDS> {
    return apiFetch<CourseDS>('/api/courses/create', {
        method: 'POST',
        body: ds,
    });
}

/**
 * Update an existing course.
 * POST /api/courses/update
 *
 * The id is taken from the request body (`ds.id`), not the URL.
 */
export async function updateCourse(ds: CourseDS): Promise<CourseDS> {
    return apiFetch<CourseDS>('/api/courses/update', {
        method: 'POST',
        body: ds,
    });
}

/**
 * Delete a course.
 * POST /api/courses/{id}/delete
 */
export async function deleteCourse(id: number): Promise<void> {
    await apiFetch<void>(`/api/courses/${id}/delete`, { method: 'POST' });
}

/**
 * Get full details for a course, including students and results.
 * GET /api/courses/{id}
 */
export async function getCourseDetails(id: number): Promise<CourseDetailDS> {
    return apiFetch<CourseDetailDS>(`/api/courses/${id}`);
}

/**
 * Enroll a student into a course.
 * POST /api/courses/{courseId}/enroll/{studentId}
 */
export async function enrollStudent(
    courseId: number,
    studentId: string,
): Promise<void> {
    await apiFetch<void>(
        `/api/courses/${courseId}/enroll/${encodeURIComponent(studentId)}`,
        { method: 'POST' },
    );
}

/**
 * Convenience: get the enrolled students of a course.
 * Derived from getCourseDetails — no dedicated endpoint exists.
 */
export async function getCourseStudents(courseId: number): Promise<StudentDS[]> {
    const details = await getCourseDetails(courseId);
    return details.students ?? [];
}