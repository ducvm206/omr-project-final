// src/types/Course.ts

import type { GradingResultDS } from './Grading';
import type { ExamResultDS } from './Exam';

export interface Course {
    id: number;
    name: string;
    academicYear: string;
    description: string;
    ownerId: number;
}

export interface CourseDS {
    id: number;
    name: string;
    academicYear: string;
    description: string;
}

export interface CourseDetailDS {
    name: string;
    academicYear: string;
    description: string;
    students: import('./Student').StudentDS[];
    studentResults: StudentResultDS[];
    examResults: ExamResultDS[];
}

export interface StudentResultDS {
    id: string;
    name: string;
    gradingResults: GradingResultDS[];
}