// src/api/endpoints/Grading.ts

import type { GradingConfig, GradingResultDS } from '../../types/Grading';
import { apiFetch } from '../client';

/**
 * Grade a single answer sheet.
 * POST /api/grade
 *
 * The backend blocks on the OMR engine, persists the GradingResult,
 * and returns the full result including per-question results and an
 * annotated image.
 *
 * `answer_sheet.bytes` must be base64 with NO `data:` prefix.
 */
export async function gradeAnswerSheet(
    config: GradingConfig,
): Promise<GradingResultDS> {
    return apiFetch<GradingResultDS>('/api/grade', {
        method: 'POST',
        body: config,
        // Grading is slow; give it two minutes before timing out.
        timeoutMs: 120_000,
    });
}