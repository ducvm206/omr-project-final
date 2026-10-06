-- Add created_at column to exams
ALTER TABLE exams
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- =============================================================================
-- GRADING RESULTS TABLE
-- =============================================================================

-- Add graded_at column to grading_results (already in entity, but missing in DB)
ALTER TABLE grading_results
    ADD COLUMN graded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;