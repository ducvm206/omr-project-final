CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    owner_id BIGINT NOT NULL,

    CONSTRAINT fk_courses_owner
        FOREIGN KEY (owner_id)
            REFERENCES users(id)
            ON DELETE CASCADE
);

CREATE TABLE students (
    id VARCHAR(8) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id BIGINT NOT NULL,

    CONSTRAINT fk_students_owner
        FOREIGN KEY (owner_id)
            REFERENCES users(id)
            ON DELETE CASCADE
);

CREATE TABLE course_students (
    course_id BIGINT NOT NULL,
    student_id VARCHAR(8) NOT NULL,

    PRIMARY KEY (course_id, student_id),

    CONSTRAINT fk_course_students_course
        FOREIGN KEY (course_id)
            REFERENCES courses(id)
            ON DELETE CASCADE,

    CONSTRAINT fk_course_students_student
        FOREIGN KEY (student_id)
            REFERENCES students(id)
            ON DELETE CASCADE
);

CREATE TABLE templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mcq_questions INTEGER NOT NULL,
    written_questions INTEGER NOT NULL,
    has_key_area BOOLEAN NOT NULL,
    has_student_id_area BOOLEAN NOT NULL,
    template_json JSONB NOT NULL,
    file_bytes BYTEA NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    owner_id BIGINT NOT NULL,

    CONSTRAINT fk_templates_owner
        FOREIGN KEY (owner_id)
            REFERENCES users(id)
            ON DELETE CASCADE
);

CREATE TABLE exams (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mcq_points REAL NOT NULL,
    written_points REAL NOT NULL,
    total_points REAL NOT NULL,
    no_of_keys INTEGER NOT NULL,
    exam_json JSONB NOT NULL,
    grade_a_threshold REAL NOT NULL DEFAULT 90.0,
    grade_b_threshold REAL NOT NULL DEFAULT 75.0,
    grade_c_threshold REAL NOT NULL DEFAULT 60.0,
    grade_d_threshold REAL NOT NULL DEFAULT 45.0,
    template_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,

    CONSTRAINT fk_exams_course
        FOREIGN KEY (course_id)
            REFERENCES courses(id)
            ON DELETE CASCADE,

    CONSTRAINT fk_exams_template
        FOREIGN KEY (template_id)
            REFERENCES templates(id)
            ON DELETE RESTRICT
);

CREATE TABLE grading_results (
    student_id VARCHAR(8) NOT NULL,
    exam_id BIGINT NOT NULL,
    key_used VARCHAR(1) NOT NULL,
    mcq_correct INTEGER NOT NULL,
    mcq_partial INTEGER NOT NULL,
    mcq_incorrect INTEGER NOT NULL,
    mcq_blank INTEGER NOT NULL,
    mcq_points REAL NOT NULL,
    written_correct INTEGER NOT NULL,
    written_incorrect INTEGER NOT NULL,
    written_blank INTEGER NOT NULL,
    written_points REAL NOT NULL,
    total_points REAL NOT NULL,
    percentage REAL NOT NULL,
    grade VARCHAR(1) NOT NULL,

    PRIMARY KEY (student_id, exam_id),

    CONSTRAINT fk_grading_results_exam
        FOREIGN KEY (exam_id)
            REFERENCES exams(id)
            ON DELETE CASCADE,

    CONSTRAINT fk_grading_results_student
        FOREIGN KEY (student_id)
            REFERENCES students(id)
            ON DELETE CASCADE
);

CREATE TABLE question_results (
    id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(8) NOT NULL,
    exam_id BIGINT NOT NULL,
    question_number INTEGER NOT NULL,
    question_type VARCHAR(8) NOT NULL,
    student_answer VARCHAR(64) NOT NULL,
    correct_answer VARCHAR(64) NOT NULL,
    points_earned REAL NOT NULL,
    points_max REAL NOT NULL,
    is_correct BOOLEAN NOT NULL,
    is_partial BOOLEAN NOT NULL,

    CONSTRAINT fk_question_results_grading
        FOREIGN KEY (student_id, exam_id)
            REFERENCES grading_results(student_id, exam_id)
            ON DELETE CASCADE
);