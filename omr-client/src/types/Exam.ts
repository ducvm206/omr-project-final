// src/types/Exam.ts

import type { GradingResultDS } from './Grading';


export type ExamCreationMode = 'manual' | 'extraction';

/**
 * Exam entity as exposed by the API.
 * Maps to com.ducvm.omrserver.entity.Exam, with the JPA relations
 * flattened for the frontend:
 *   - `template` (Template) -> `templateId: number`
 *   - `course`   (Course)   -> `courseId: number`
 *
 * `examJson` is a JSON blob stored as a string on the backend.
 * Parse it on the client if you need structured access.
 */
export interface Exam {
    /** Exam id. */
    id: number;
    /** Name of the exam. */
    name: string;
    /** Total points for MCQ section. */
    mcqPoints: number;
    /** Total points for written section. */
    writtenPoints: number;
    /** Combined total points. */
    totalPoints: number;
    /** Number of answer keys. */
    noOfKeys: number;
    /** JSON configuration (raw string). */
    examJson: string;
    /** Grade A threshold. */
    gradeAThreshold: number;
    /** Grade B threshold. */
    gradeBThreshold: number;
    /** Grade C threshold. */
    gradeCThreshold: number;
    /** Grade D threshold. */
    gradeDThreshold: number;
    /** Id of the template used by this exam. */
    templateId: number;
    /** Id of the course this exam belongs to. */
    courseId: number;
    /** Created at (ISO-8601 string from the backend). */
    createdAt: string;
}

/**
 * Exam data structure returned by list/detail endpoints.
 * Maps to com.ducvm.omrserver.dataset.ExamDS.
 *
 * Note: this shape does NOT include `examJson` or `createdAt`.
 */
export interface ExamDS {
    /** Id of exam. */
    id: number;
    /** Id of used template. */
    templateId: number;
    /** Id of course. */
    courseId: number;
    /** Name of the exam. */
    name: string;
    /** Total points for MCQ section. */
    mcqPoints: number;
    /** Total points for written section. */
    writtenPoints: number;
    /** Combined total points. */
    totalPoints: number;
    /** Number of answer keys. */
    noOfKeys: number;
    /** Grade A threshold. */
    gradeAThreshold: number;
    /** Grade B threshold. */
    gradeBThreshold: number;
    /** Grade C threshold. */
    gradeCThreshold: number;
    /** Grade D threshold. */
    gradeDThreshold: number;
}

/**
 * Payload used when creating or configuring an exam.
 * Maps to com.ducvm.omrserver.dataset.ExamConfig.
 *
 * The `keyXFile` fields carry base64-encoded file bytes for each
 * answer key variant. `keyX` fields carry the parsed/structured
 * answer key data when it's provided inline.
 */
export interface ExamConfig {
    /** Exam mode. Must be 'manual' or 'extraction'. */
    mode: ExamCreationMode;
    /** Exam name. */
    name: string;
    /** Id of the course this exam belongs to. */
    courseId: number;
    /** Id of the template used by this exam. */
    templateId: number;
    /** Number of answer keys. */
    numberOfKeys: number;
    /** Total points for MCQ section. */
    mcqPoints: number;
    /** Total points for written section. */
    writtenPoints: number;
    /** Grade thresholds. */
    gradeAThreshold: number;
    gradeBThreshold: number;
    gradeCThreshold: number;
    gradeDThreshold: number;

    /** Inline answer keys, keyed by variant. */
    keyA?: Record<string, unknown>;
    keyB?: Record<string, unknown>;
    keyC?: Record<string, unknown>;
    keyD?: Record<string, unknown>;
    keyE?: Record<string, unknown>;

    /** Base64-encoded answer key files, keyed by variant. */
    keyAFile?: ExamConfigFileData;
    keyBFile?: ExamConfigFileData;
    keyCFile?: ExamConfigFileData;
    keyDFile?: ExamConfigFileData;
    keyEFile?: ExamConfigFileData;
}

/**
 * Base64 file payload used inside ExamConfig.
 * Maps to the nested static class
 * com.ducvm.omrserver.dataset.ExamConfig.FileData.
 */
export interface ExamConfigFileData {
    /** Base64-encoded file contents. */
    bytes: string;
}

/**
 * Aggregated exam results, used inside CourseDetailDS.examResults.
 * Maps to com.ducvm.omrserver.dataset.ExamResultDS.
 *
 * Note: `averageScore` and `medianScore` are `null` on the backend
 * when there are no grading results yet (see CourseService: dividing
 * by an empty list yields NaN, which Jackson serializes as null).
 */
export interface ExamResultDS {
    /** Exam id. */
    id: number;
    /** Name of the exam. */
    name: string;
    /** Number of answer keys. */
    noOfKeys: number;
    /** List of grading results. */
    gradingResults: GradingResultDS[];
    /** Average score across all graded submissions, or null if none. */
    averageScore: number | null;
    /** Median score across all graded submissions, or null if none. */
    medianScore: number | null;
}