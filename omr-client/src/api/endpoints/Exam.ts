// src/api/endpoints/Exam.ts

import type { ExamConfig } from '../../types/Exam';
import { apiFetch } from '../client';

/**
 * Create a new exam.
 * POST /api/exams/create
 *
 * The backend calls the OMR engine and persists the exam, then
 * returns 200 with an empty body. The new exam id is not returned.
 */
export async function createExam(config: ExamConfig): Promise<void> {
    await apiFetch<void>('/api/exams/create', {
        method: 'POST',
        body: config,
        // OMR engine can be slow.
        timeoutMs: 120_000,
    });
}

/**
 * Delete an exam.
 * POST /api/exams/{id}/delete
 */
export async function deleteExam(id: number): Promise<void> {
    await apiFetch<void>(`/api/exams/${id}/delete`, { method: 'POST' });
}