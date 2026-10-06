// src/components/common/Pagination.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChevronLeft,
    faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import './Pagination.css';

export interface PaginationProps {
    /** Current page, 1-based. */
    page: number;
    /** Total number of pages. */
    totalPages: number;
    /** Called when the user selects a different page. */
    onPageChange: (page: number) => void;
    /**
     * How many page numbers to show around the current page.
     * Defaults to 1 (i.e. current ± 1).
     */
    siblingCount?: number;
    /** Show First / Last buttons. Defaults to true. */
    showEdges?: boolean;
    /** Disable the whole control (e.g. while loading). */
    disabled?: boolean;
    /** Extra className applied to the root. */
    className?: string;
}

/**
 * Build a compact list of page tokens for rendering.
 * Example: page=5, totalPages=10, siblingCount=1
 *   -> [1, '…', 4, 5, 6, '…', 10]
 */
function buildPages(
    page: number,
    totalPages: number,
    siblingCount: number,
): (number | '…')[] {
    const totalNumbers = siblingCount * 2 + 5; // first + last + current ± sibling + 2 ellipses

    // If everything fits, show all pages.
    if (totalPages <= totalNumbers) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const left = Math.max(page - siblingCount, 2);
    const right = Math.min(page + siblingCount, totalPages - 1);

    const showLeftEllipsis = left > 2;
    const showRightEllipsis = right < totalPages - 1;

    const pages: (number | '…')[] = [1];
    if (showLeftEllipsis) pages.push('…');
    for (let i = left; i <= right; i++) pages.push(i);
    if (showRightEllipsis) pages.push('…');
    pages.push(totalPages);

    return pages;
}

/**
 * Page navigation control.
 *
 * Controlled: the parent owns `page` and updates it via `onPageChange`.
 *
 *   <Pagination page={page} totalPages={12} onPageChange={setPage} />
 */
export function Pagination({
                               page,
                               totalPages,
                               onPageChange,
                               siblingCount = 1,
                               showEdges = true,
                               disabled = false,
                               className,
                           }: PaginationProps) {
    if (totalPages <= 1) return null;

    const pages = buildPages(page, totalPages, siblingCount);

    const go = (next: number) => {
        if (disabled) return;
        if (next < 1 || next > totalPages) return;
        if (next === page) return;
        onPageChange(next);
    };

    const classes = ['pagination', disabled ? 'pagination--disabled' : '', className ?? '']
        .filter(Boolean)
        .join(' ');

    return (
        <nav className={classes} aria-label="Pagination">
            {showEdges && (
                <button
                    type="button"
                    className="pagination__button"
                    onClick={() => go(1)}
                    disabled={disabled || page === 1}
                    aria-label="First page"
                >
                    «
                </button>
            )}

            <button
                type="button"
                className="pagination__button"
                onClick={() => go(page - 1)}
                disabled={disabled || page === 1}
                aria-label="Previous page"
            >
                <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            {pages.map((token, idx) =>
                token === '…' ? (
                    <span
                        key={`ellipsis-${idx}`}
                        className="pagination__ellipsis"
                        aria-hidden="true"
                    >
                        …
                    </span>
                ) : (
                    <button
                        key={token}
                        type="button"
                        className={
                            'pagination__button' +
                            (token === page ? ' pagination__button--active' : '')
                        }
                        onClick={() => go(token)}
                        disabled={disabled}
                        aria-current={token === page ? 'page' : undefined}
                    >
                        {token}
                    </button>
                ),
            )}

            <button
                type="button"
                className="pagination__button"
                onClick={() => go(page + 1)}
                disabled={disabled || page === totalPages}
                aria-label="Next page"
            >
                <FontAwesomeIcon icon={faChevronRight} />
            </button>

            {showEdges && (
                <button
                    type="button"
                    className="pagination__button"
                    onClick={() => go(totalPages)}
                    disabled={disabled || page === totalPages}
                    aria-label="Last page"
                >
                    »
                </button>
            )}
        </nav>
    );
}