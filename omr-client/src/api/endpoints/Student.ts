// src/api/endpoints/Student.ts

import type { SearchForm } from '../../types/Common';
import type {
    Student,
    StudentDetailsDS,
    StudentDS,
} from '../../types/Student';
import { apiFetch } from '../client';

/**
 * Search students owned by the current user.
 * POST /api/students
 *
 *   { searchParams: { id?: string, name?: string } }
 *
 * Returns a list of StudentDS-shaped objects (id, name, ownerId).
 */
export async function searchStudents(form: SearchForm): Promise<Student[]> {
    const students = await apiFetch<Student[] | null>('/api/students', {
        method: 'POST',
        body: form,
    });
    return students ?? [];
}

/**
 * Create a new student.
 * POST /api/students/create
 *
 * The owner is set server-side from the authenticated session.
 */
export async function createStudent(ds: StudentDS): Promise<Student> {
    return apiFetch<Student>('/api/students/create', {
        method: 'POST',
        body: ds,
    });
}

/**
 * Update an existing student.
 * POST /api/students/{id}
 *
 * The `{id}` path variable is used only for the URL — the actual
 * update reads the id from the request body (`ds.id`).
 */
export async function updateStudent(
    id: string,
    ds: StudentDS,
): Promise<Student> {
    return apiFetch<Student>(
        `/api/students/${encodeURIComponent(id)}`,
        {
            method: 'POST',
            body: ds,
        },
    );
}

/**
 * Get full details for a student.
 * GET /api/students/{id}
 *
 * Returns the student's name, id, enrolled courses, and every grading
 * result across all exams — in a single request.
 *
 * Replaces the old `/results/all` and `/results/{examId}` endpoints.
 */
export async function getStudentDetails(
    id: string,
): Promise<StudentDetailsDS> {
    return apiFetch<StudentDetailsDS>(
        `/api/students/${encodeURIComponent(id)}`,
    );
}

/**
 * Delete a student.
 * POST /api/students/{id}/delete
 */
export async function deleteStudent(id: string): Promise<void> {
    await apiFetch<void>(
        `/api/students/${encodeURIComponent(id)}/delete`,
        { method: 'POST' },
    );
}