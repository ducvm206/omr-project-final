// src/components/features/Course/CourseResultsTable.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Tag } from '../../common/Tag';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { useToast } from '../../common/Toast';
import { deleteExam } from '../../../api/endpoints/Exam';
import type { StudentResultDS } from '../../../types/Course';
import type { GradingResultDS, Grade } from '../../../types/Grading';
import type { ExamResultDS } from '../../../types/Exam';
import './CourseResultsTable.css';

/* ---------------------------------------------------------------- */
/* Types                                                             */
/* ---------------------------------------------------------------- */

type ExamSortKey = 'name-asc' | 'name-desc';
type ScoreSortKey = 'score-desc' | 'score-asc';
type ActiveScoreSort = { examId: number; direction: ScoreSortKey } | null;

const EXAM_SORT_LABELS: Record<ExamSortKey, string> = {
    'name-asc': 'Name (A → Z)',
    'name-desc': 'Name (Z → A)',
};

const SCORE_SORT_LABELS: Record<ScoreSortKey, string> = {
    'score-desc': 'Score (high → low)',
    'score-asc': 'Score (low → high)',
};

export interface CourseResultsTableProps {
    examResults: ExamResultDS[];
    studentResults: StudentResultDS[];
    /** Called when the user clicks a result cell. */
    onCellClick?: (studentId: string, examId: number) => void;
    /** Called after an exam is successfully deleted. */
    onExamDeleted?: (examId: number) => void;
}

/* ---------------------------------------------------------------- */
/* Main component                                                    */
/* ---------------------------------------------------------------- */

export function CourseResultsTable({
    examResults,
    studentResults,
    onCellClick,
    onExamDeleted,
}: CourseResultsTableProps) {
    const toast = useToast();

    const [pendingDelete, setPendingDelete] = useState<ExamResultDS | null>(
        null,
    );
    const [deleting, setDeleting] = useState(false);

    const [examSort, setExamSort] = useState<ExamSortKey>('name-asc');
    const [scoreSort, setScoreSort] = useState<ActiveScoreSort>(null);

    const sortedExams = useMemo(
        () => sortExams(examResults, examSort),
        [examResults, examSort],
    );

    const sortedStudents = useMemo(
        () => sortStudents(studentResults, scoreSort),
        [studentResults, scoreSort],
    );

    const byStudent = useMemo(() => {
        const map = new Map<string, Map<number, GradingResultDS>>();
        for (const sr of studentResults) {
            const examMap = new Map<number, GradingResultDS>();
            for (const gr of sr.gradingResults) {
                examMap.set(gr.examId, gr);
            }
            map.set(sr.id, examMap);
        }
        return map;
    }, [studentResults]);

    const handleDelete = useCallback(async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            await deleteExam(pendingDelete.id);
            toast.success(`Exam "${pendingDelete.name}" deleted`);
            onExamDeleted?.(pendingDelete.id);
            setPendingDelete(null);
        } catch (e) {
            toast.danger(e instanceof Error ? e.message : 'Delete failed');
        } finally {
            setDeleting(false);
        }
    }, [pendingDelete, onExamDeleted, toast]);

    return (
        <>
            <div className="course-results__table-toolbar">
                <span className="course-results__table-count">
                    {studentResults.length} students × {examResults.length} exams
                </span>
                <GlobalSortMenu value={examSort} onChange={setExamSort} />
            </div>

            <div className="course-results__scroll">
                <table className="course-results__table">
                    <thead>
                        <tr>
                            <th
                                scope="col"
                                className="course-results__th course-results__th--student"
                            >
                                <div className="course-results__student-header">
                                    <span>Student</span>
                                    {scoreSort && (
                                        <button
                                            type="button"
                                            className="course-results__clear-sort"
                                            onClick={() => setScoreSort(null)}
                                            title="Clear row sort"
                                            aria-label="Clear row sort"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </th>

                            {sortedExams.map((exam) => {
                                const isActive = scoreSort?.examId === exam.id;
                                return (
                                    <th
                                        key={exam.id}
                                        scope="col"
                                        className={
                                            'course-results__th course-results__th--exam' +
                                            (isActive
                                                ? ' course-results__th--sorted'
                                                : '')
                                        }
                                    >
                                        <div className="course-results__exam-header">
                                            <span
                                                className="course-results__exam-name"
                                                title={exam.name}
                                            >
                                                {exam.name}
                                            </span>

                                            <ScoreSortMenu
                                                exam={exam}
                                                active={isActive}
                                                activeDirection={
                                                    isActive
                                                        ? scoreSort.direction
                                                        : null
                                                }
                                                onChange={(dir) =>
                                                    setScoreSort(
                                                        dir
                                                            ? {
                                                                  examId: exam.id,
                                                                  direction: dir,
                                                              }
                                                            : null,
                                                    )
                                                }
                                            />

                                            <button
                                                type="button"
                                                className="course-results__exam-delete"
                                                onClick={() =>
                                                    setPendingDelete(exam)
                                                }
                                                aria-label={`Delete exam ${exam.name}`}
                                                title="Delete exam"
                                            >
                                                <FontAwesomeIcon
                                                    icon={faTrash}
                                                />
                                            </button>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {sortedStudents.map((student) => {
                            const examMap = byStudent.get(student.id);
                            return (
                                <tr
                                    key={student.id}
                                    className="course-results__row"
                                >
                                    <th
                                        scope="row"
                                        className="course-results__th course-results__th--student"
                                    >
                                        <span className="course-results__student-name">
                                            {student.name}
                                        </span>
                                        <span className="course-results__student-id">
                                            {student.id}
                                        </span>
                                    </th>

                                    {sortedExams.map((exam) => {
                                        const result = examMap?.get(exam.id);
                                        return (
                                            <td
                                                key={exam.id}
                                                className="course-results__td"
                                            >
                                                {result ? (
                                                    <ResultCell
                                                        result={result}
                                                        onClick={
                                                            onCellClick
                                                                ? () =>
                                                                      onCellClick(
                                                                          student.id,
                                                                          exam.id,
                                                                      )
                                                                : undefined
                                                        }
                                                    />
                                                ) : (
                                                    <span className="course-results__missing">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>

                    <tfoot>
                        <tr className="course-results__stats-row">
                            <th
                                scope="row"
                                className="course-results__th course-results__th--student course-results__th--stats-label"
                            >
                                Exam average
                            </th>
                            {sortedExams.map((exam) => (
                                <td
                                    key={exam.id}
                                    className="course-results__td course-results__td--stats"
                                >
                                    {formatScore(exam.averageScore)}
                                </td>
                            ))}
                        </tr>
                        <tr className="course-results__stats-row">
                            <th
                                scope="row"
                                className="course-results__th course-results__th--student course-results__th--stats-label"
                            >
                                Exam median
                            </th>
                            {sortedExams.map((exam) => (
                                <td
                                    key={exam.id}
                                    className="course-results__td course-results__td--stats"
                                >
                                    {formatScore(exam.medianScore)}
                                </td>
                            ))}
                        </tr>
                        <tr className="course-results__stats-row">
                            <th
                                scope="row"
                                className="course-results__th course-results__th--student course-results__th--stats-label"
                            >
                                Graded
                            </th>
                            {sortedExams.map((exam) => (
                                <td
                                    key={exam.id}
                                    className="course-results__td course-results__td--stats"
                                >
                                    {exam.gradingResults.length} /{' '}
                                    {studentResults.length}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>

            <ConfirmDialog
                open={pendingDelete !== null}
                title="Delete exam?"
                message={
                    pendingDelete && (
                        <>
                            Delete <strong>{pendingDelete.name}</strong> and all{' '}
                            {pendingDelete.gradingResults.length} grading result
                            {pendingDelete.gradingResults.length === 1
                                ? ''
                                : 's'}{' '}
                            associated with it? This action cannot be undone.
                        </>
                    )
                }
                variant="danger"
                confirmLabel="Delete"
                loading={deleting}
                onConfirm={handleDelete}
                onCancel={() => !deleting && setPendingDelete(null)}
            />
        </>
    );
}

/* ---------------------------------------------------------------- */
/* Filter menu (portal-based)                                        */
/* ---------------------------------------------------------------- */

interface MenuOption<T extends string> {
    value: T;
    label: string;
    active?: boolean;
}

function FilterMenu<T extends string>({
    options,
    onSelect,
    triggerContent,
    triggerTitle,
    triggerAriaLabel,
    triggerClass,
    allowClear,
}: {
    options: MenuOption<T>[];
    onSelect: (value: T | null) => void;
    triggerContent: React.ReactNode;
    triggerTitle: string;
    triggerAriaLabel: string;
    triggerClass?: string;
    allowClear?: boolean;
}) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number }>({
        top: 0,
        left: 0,
    });

    const reposition = useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setPos({
            top: rect.bottom + 4,
            left: rect.right,
        });
    }, []);

    useEffect(() => {
        if (!open) return;
        reposition();

        const onScrollOrResize = () => reposition();
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);

        const onPointerDown = (e: PointerEvent) => {
            const t = e.target as Node;
            if (
                !triggerRef.current?.contains(t) &&
                !panelRef.current?.contains(t)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, reposition]);

    const handleSelect = (value: T | null) => {
        onSelect(value);
        setOpen(false);
    };

    const hasActive = options.some((o) => o.active);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className={triggerClass}
                title={triggerTitle}
                aria-label={triggerAriaLabel}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                {triggerContent}
            </button>

            {open &&
                createPortal(
                    <div
                        ref={panelRef}
                        className="filter-menu__panel"
                        role="menu"
                        style={{
                            position: 'fixed',
                            top: pos.top,
                            left: pos.left,
                            transform: 'translateX(-100%)',
                        }}
                    >
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                role="menuitemradio"
                                aria-checked={opt.active ?? false}
                                className={
                                    'filter-menu__item' +
                                    (opt.active
                                        ? ' filter-menu__item--active'
                                        : '')
                                }
                                onClick={() => handleSelect(opt.value)}
                            >
                                {opt.label}
                            </button>
                        ))}

                        {allowClear && hasActive && (
                            <button
                                type="button"
                                className="filter-menu__item filter-menu__item--clear"
                                onClick={() => handleSelect(null)}
                            >
                                Clear sort
                            </button>
                        )}
                    </div>,
                    document.body,
                )}
        </>
    );
}

/* ---------------------------------------------------------------- */
/* Specific menus                                                    */
/* ---------------------------------------------------------------- */

function GlobalSortMenu({
    value,
    onChange,
}: {
    value: ExamSortKey;
    onChange: (next: ExamSortKey) => void;
}) {
    return (
        <FilterMenu<ExamSortKey>
            options={[
                {
                    value: 'name-asc',
                    label: EXAM_SORT_LABELS['name-asc'],
                    active: value === 'name-asc',
                },
                {
                    value: 'name-desc',
                    label: EXAM_SORT_LABELS['name-desc'],
                    active: value === 'name-desc',
                },
            ]}
            onSelect={(v) => v && onChange(v)}
            triggerContent={
                <>
                    <FontAwesomeIcon icon={faFilter} />
                    <span className="sort-menu__trigger-label">
                        {EXAM_SORT_LABELS[value]}
                    </span>
                </>
            }
            triggerTitle={`Exam order: ${EXAM_SORT_LABELS[value]}`}
            triggerAriaLabel="Sort exam columns"
            triggerClass="sort-menu__trigger"
        />
    );
}

function ScoreSortMenu({
    exam,
    active,
    activeDirection,
    onChange,
}: {
    exam: ExamResultDS;
    active: boolean;
    activeDirection: ScoreSortKey | null;
    onChange: (next: ScoreSortKey | null) => void;
}) {
    return (
        <FilterMenu<ScoreSortKey>
            options={[
                {
                    value: 'score-desc',
                    label: SCORE_SORT_LABELS['score-desc'],
                    active: activeDirection === 'score-desc',
                },
                {
                    value: 'score-asc',
                    label: SCORE_SORT_LABELS['score-asc'],
                    active: activeDirection === 'score-asc',
                },
            ]}
            onSelect={onChange}
            allowClear
            triggerContent={<FontAwesomeIcon icon={faFilter} />}
            triggerTitle={
                active
                    ? `Sorted by ${exam.name}: ${SCORE_SORT_LABELS[activeDirection!]}`
                    : `Sort rows by ${exam.name} score`
            }
            triggerAriaLabel={`Sort by ${exam.name} score`}
            triggerClass={
                'course-results__exam-filter' +
                (active ? ' course-results__exam-filter--active' : '')
            }
        />
    );
}

/* ---------------------------------------------------------------- */
/* Cell                                                              */
/* ---------------------------------------------------------------- */

function ResultCell({
    result,
    onClick,
}: {
    result: GradingResultDS;
    onClick?: () => void;
}) {
    const classes = [
        'course-results__cell',
        onClick ? 'course-results__cell--clickable' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={classes}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={
                onClick
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onClick();
                          }
                      }
                    : undefined
            }
        >
            <div className="course-results__cell-score">
                {result.totalPoints.toFixed(1)}
            </div>
            <Tag
                size="sm"
                grade={result.grade as Grade}
                className="course-results__cell-grade"
            >
                {result.grade}
            </Tag>
        </div>
    );
}

/* ---------------------------------------------------------------- */
/* Sorting                                                           */
/* ---------------------------------------------------------------- */

function sortExams(exams: ExamResultDS[], key: ExamSortKey): ExamResultDS[] {
    const copy = [...exams];
    copy.sort((a, b) => {
        switch (key) {
            case 'name-asc':
                return a.name.localeCompare(b.name, undefined, {
                    sensitivity: 'base',
                });
            case 'name-desc':
                return b.name.localeCompare(a.name, undefined, {
                    sensitivity: 'base',
                });
        }
    });
    return copy;
}

function sortStudents(
    students: StudentResultDS[],
    active: ActiveScoreSort,
): StudentResultDS[] {
    if (!active) return students;

    const { examId, direction } = active;

    const scoreFor = new Map<string, number | null>();
    for (const s of students) {
        const gr = s.gradingResults.find((g) => g.examId === examId);
        scoreFor.set(s.id, gr ? gr.totalPoints : null);
    }

    const copy = [...students];
    copy.sort((a, b) => {
        const aScore = scoreFor.get(a.id) ?? null;
        const bScore = scoreFor.get(b.id) ?? null;

        if (aScore === null && bScore === null) return 0;
        if (aScore === null) return 1;
        if (bScore === null) return -1;

        return direction === 'score-desc' ? bScore - aScore : aScore - bScore;
    });
    return copy;
}

function formatScore(value: unknown): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '—';
    }
    return value.toFixed(1);
}