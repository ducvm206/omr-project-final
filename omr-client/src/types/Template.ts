// src/types/Template.ts

/**
 * Template entity as exposed by the API.
 * Maps to com.ducvm.omrserver.entity.Template, with the JPA `owner`
 * relation flattened to `ownerId`.
 *
 * `fileBytes` is a binary blob on the backend. Over JSON it would be
 * base64-encoded, but the entity is generally not returned directly —
 * use TemplateDS for list/detail responses.
 */
export interface Template {
    /** Template id. */
    id: number;
    /** Template name. */
    name: string;
    /** Number of MCQ questions. */
    mcqQuestions: number;
    /** Number of written questions. */
    writtenQuestions: number;
    /** Whether the template has a key area. */
    hasKeyArea: boolean;
    /** Whether the template has a student ID area. */
    hasStudentIdArea: boolean;
    /** Template JSON configuration (raw string). */
    templateJson: string;
    /** Raw template file bytes (base64 if serialized over JSON). */
    fileBytes: string;
    /** Creation timestamp (ISO-8601 string). */
    createdAt: string;
    /** Last used timestamp (ISO-8601 string), or null if never used. */
    lastUsedAt: string | null;
    /** Id of the user who owns this template. */
    ownerId: number;
}

/**
 * Template data structure returned by list/detail endpoints.
 * Maps to com.ducvm.omrserver.dataset.TemplateDS.
 *
 * Note: this shape excludes `templateJson` and `fileBytes`, which are
 * server-side implementation details not meant for the client.
 */
export interface TemplateDS {
    /** Template id. */
    id: number;
    /** Owner id. */
    ownerId: number;
    /** Template name. */
    name: string;
    /** Number of MCQ questions. */
    mcqQuestions: number;
    /** Number of written questions. */
    writtenQuestions: number;
    /** Whether the template has a key area. */
    hasKeyArea: boolean;
    /** Whether the template has a student ID area. */
    hasStudentIdArea: boolean;
    /** Creation timestamp (ISO-8601 string). */
    createdAt: string;
    /** Last used timestamp (ISO-8601 string), or null if never used. */
    lastUsedAt: string | null;
}

/**
 * Payload used to configure a template before it is sent to the
 * OMR engine. Maps to com.ducvm.omrserver.dataset.TemplateConfig.
 *
 * The backend applies defaults for all four numeric/boolean fields,
 * so they're optional on the client. If omitted, the server uses:
 *   mcqQuestions: 20
 *   writtenQuestions: 3
 *   hasKeyArea: true
 *   hasStudentIdArea: true
 */
export interface TemplateConfig {
    /** Template name. */
    name: string;
    /** Number of MCQ questions. Defaults to 20. */
    mcqQuestions?: number;
    /** Number of written questions. Defaults to 3. */
    writtenQuestions?: number;
    /** Whether the template has a key area. Defaults to true. */
    hasKeyArea?: boolean;
    /** Whether the template has a student ID area. Defaults to true. */
    hasStudentIdArea?: boolean;
}