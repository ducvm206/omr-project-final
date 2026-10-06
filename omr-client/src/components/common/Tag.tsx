// src/components/common/Tag.tsx

import type { ReactNode } from 'react';
import './Tag.css';

/**
 * Color tone.
 * - 'neutral' gray, default
 * - 'info'    blue, for informational labels
 * - 'success' green, for positive states (graded, active)
 * - 'warning' amber, for attention (pending, partial)
 * - 'danger'  red, for failures or destructive state
 * - 'grade'   fixed grade palette — set via the `grade` prop
 */
export type TagTone =
    | 'neutral'
    | 'info'
    | 'success'
    | 'warning'
    | 'danger';

/**
 * Letter grade. When set, overrides `tone` and applies a fixed
 * color per grade (A/B/C/D/F).
 */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface TagProps {
    /** Tag content. */
    children?: ReactNode;
    /** Color tone. Defaults to 'neutral'. Ignored if `grade` is set. */
    tone?: TagTone;
    /**
     * Grade letter. When set, applies the standard grade color and
     * overrides `tone`.
     */
    grade?: Grade;
    /** Optional icon before the label. */
    icon?: ReactNode;
    /**
     * Size.
     * - 'sm'  compact, for table cells and card subtitles
     * - 'md'  default
     */
    size?: 'sm' | 'md';
    /**
     * Visual style.
     * - 'soft'  light background, dark text (default)
     * - 'solid' filled background, white text
     * - 'outline' transparent background, colored border and text
     */
    variant?: 'soft' | 'solid' | 'outline';
    /** Extra className applied to the root. */
    className?: string;
}

/**
 * Inline tag / badge.
 *
 *   <Tag>Draft</Tag>
 *   <Tag tone="success">Active</Tag>
 *   <Tag grade="A" />
 *   <Tag tone="warning" icon={<FontAwesomeIcon icon={faClock} />}>Pending</Tag>
 */
export function Tag({
                        children,
                        tone = 'neutral',
                        grade,
                        icon,
                        size = 'md',
                        variant = 'soft',
                        className,
                    }: TagProps) {
    // Grade overrides tone.
    const resolvedTone: TagTone = grade ? gradeToTone(grade) : tone;

    const classes = [
        'tag',
        `tag--${resolvedTone}`,
        `tag--${variant}`,
        `tag--${size}`,
        grade ? `tag--grade-${grade}` : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <span className={classes}>
            {icon && (
                <span className="tag__icon" aria-hidden="true">
                    {icon}
                </span>
            )}
            {(children !== undefined && children !== null) && (
                <span className="tag__label">{children}</span>
            )}
        </span>
    );
}

/**
 * Map a letter grade to the tone used for its default styling.
 * Grades share the same palette as tones; the letter-specific class
 * (tag--grade-A, etc.) lets you override each grade independently.
 */
function gradeToTone(grade: Grade): TagTone {
    switch (grade) {
        case 'A':
            return 'success';
        case 'B':
            return 'info';
        case 'C':
            return 'warning';
        case 'D':
            return 'warning';
        case 'F':
            return 'danger';
    }
}