// src/types/Grading.ts

/**
 * Letter grade awarded by the grading engine.
 * The backend stores this as a string; the frontend narrows it to
 * the five known values so `<Tag grade={...} />` type-checks.
 */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Composite primary key for a grading result.
 * Maps to com.ducvm.omrserver.entity.GradingResultId.
 *
 * On the frontend this is usually inlined into the result shape
 * (studentId + examId fields), but it's useful as a standalone type
 * when keying maps or caches.
 */
export interface GradingResultId {
    /** Student identifier. */
    studentId: string;
    /** Exam identifier. */
    examId: number;
}

/**
 * Grading result for a student's exam.
 * Maps to com.ducvm.omrserver.dataset.GradingResultDS.
 *
 * Note: the DTO adds `annotatedImage` (a base64 image of the graded
 * answer sheet) which is not part of the JPA entity.
 */
export interface GradingResultDS {
    /** Student identifier (part of composite PK). */
    studentId: string;
    /** Exam identifier (part of composite PK). */
    examId: number;
    /** Answer key used for grading. */
    keyUsed: string;

    /** MCQ breakdown. */
    mcqCorrect: number;
    mcqPartial: number;
    mcqIncorrect: number;
    mcqBlank: number;
    /** Total points earned from MCQ section. */
    mcqPoints: number;

    /** Written breakdown. */
    writtenCorrect: number;
    writtenIncorrect: number;
    writtenBlank: number;
    /** Total points earned from written section. */
    writtenPoints: number;

    /** Total points earned overall. */
    totalPoints: number;
    /** Percentage score. */
    percentage: number;
    /** Letter grade awarded. */
    grade: Grade;

    /** Per-question results. */
    questionResults: QuestionResultDS[];
    /**
     * Base64-encoded annotated answer-sheet image.
     * Can be very large; avoid logging or stringifying this field.
     */
    annotatedImage: string;
}

/**
 * Individual question result.
 * Maps to com.ducvm.omrserver.dataset.QuestionResultDS.
 *
 * Note: this DTO excludes the DB id, studentId, and examId present
 * on the QuestionResult entity. It only carries what the UI needs.
 */
export interface QuestionResultDS {
    /** Question number in the exam. */
    questionNumber: number;
    /** Type of question (MCQ/WRITTEN). */
    questionType: 'MCQ' | 'WRITTEN';
    /** Student's submitted answer. */
    studentAnswer: string;
    /** Correct answer for the question. */
    correctAnswer: string;
    /** Points earned for this question. */
    pointsEarned: number;
    /** Maximum points available. */
    pointsMax: number;
    /** Whether the answer is fully correct. */
    isCorrect: boolean;
    /** Whether the answer is partially correct. */
    isPartial: boolean;
}

/**
 * Grading result as it comes back from the student-results endpoints.
 * Alias kept for readability at call sites — same shape as GradingResultDS.
 */
export type StudentGradingResult = GradingResultDS;

/**
 * Payload sent to start grading a single answer sheet.
 * Maps to com.ducvm.omrserver.dataset.GradingConfig.
 *
 * Note the JSON property names differ from the Java field names:
 *   examId      -> "exam_id"
 *   answerSheet -> "answer_sheet"
 * This is what the backend's @JsonProperty annotations produce, so
 * the TypeScript field names follow the wire format.
 */
export interface GradingConfig {
    /** Exam id. */
    exam_id: number;
    /** Allow partial points. Defaults to true. */
    partial?: boolean;
    /** Answer sheet file payload. */
    answer_sheet: GradingFileData;
}

/**
 * Base64 file payload used inside GradingConfig.
 * Maps to the nested static class
 * com.ducvm.omrserver.dataset.GradingConfig.FileData.
 */
export interface GradingFileData {
    /** Base64-encoded file contents (no data: prefix). */
    bytes: string;
}