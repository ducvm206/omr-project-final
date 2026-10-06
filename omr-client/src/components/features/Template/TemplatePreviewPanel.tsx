// src/components/features/Template/TemplatePreviewPanel.tsx

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilePdf,
    faEye,
    faListOl,
    faPenNib,
    faKey,
    faIdCard,
    faCalendarDays,
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '../../common/Button';
import { Tag } from '../../common/Tag';
import { useToast } from '../../common/Toast';
import { getTemplatePdf } from '../../../api/endpoints/Template';
import type { TemplateDS } from '../../../types/Template';
import './TemplatePreviewPanel.css';

export interface TemplatePreviewPanelProps {
    /** The template to display. */
    template: TemplateDS;
    /**
     * Called when the user clicks "View PDF". If omitted, the panel
     * handles opening the PDF itself in a new tab.
     */
    onView?: (template: TemplateDS) => void;
    /** Extra className applied to the root. */
    className?: string;
}

/**
 * Read-only panel showing a template's configuration with a
 * "View PDF" action.
 *
 *   <TemplatePreviewPanel template={template} />
 *
 * The View PDF button fetches the file from GET /api/templates/{id}/view
 * as a Blob, wraps it in an object URL, and opens it in a new tab.
 * The object URL is revoked when the tab is closed or after a timeout.
 */
export function TemplatePreviewPanel({
    template,
    onView,
    className,
}: TemplatePreviewPanelProps) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);

    const handleView = async () => {
        if (onView) {
            onView(template);
            return;
        }

        if (loading) return;
        setLoading(true);
        try {
            const blob = await getTemplatePdf(template.id);
            const url = URL.createObjectURL(blob);
            const newTab = window.open(url, '_blank');

            if (!newTab) {
                // Popup blocked — offer a manual link as fallback.
                toast.danger(
                    'Could not open the PDF. Please allow popups for this site.',
                );
                URL.revokeObjectURL(url);
                return;
            }

            // The browser will keep the URL alive while the tab is open.
            // Revoke it after a minute as a safety net; if the tab is
            // still using it, the browser has already loaded the bytes.
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (e) {
            toast.danger(
                e instanceof Error ? e.message : 'Failed to load template PDF',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <section
            className={['template-preview', className ?? ''].filter(Boolean).join(' ')}
        >
            <header className="template-preview__header">
                <div className="template-preview__heading">
                    <FontAwesomeIcon
                        icon={faFilePdf}
                        className="template-preview__heading-icon"
                        aria-hidden="true"
                    />
                    <h2 className="template-preview__name">{template.name}</h2>
                </div>

                <Button
                    variant="primary"
                    icon={<FontAwesomeIcon icon={faEye} />}
                    onClick={handleView}
                    loading={loading}
                >
                    View PDF
                </Button>
            </header>

            <dl className="template-preview__fields">
                <div className="template-preview__field">
                    <dt>
                        <FontAwesomeIcon
                            icon={faListOl}
                            className="template-preview__field-icon"
                            aria-hidden="true"
                        />
                        MCQ questions
                    </dt>
                    <dd>{template.mcqQuestions}</dd>
                </div>

                <div className="template-preview__field">
                    <dt>
                        <FontAwesomeIcon
                            icon={faPenNib}
                            className="template-preview__field-icon"
                            aria-hidden="true"
                        />
                        Written questions
                    </dt>
                    <dd>{template.writtenQuestions}</dd>
                </div>

                <div className="template-preview__field">
                    <dt>
                        <FontAwesomeIcon
                            icon={faKey}
                            className="template-preview__field-icon"
                            aria-hidden="true"
                        />
                        Answer key area
                    </dt>
                    <dd>
                        <Tag
                            size="sm"
                            tone={template.hasKeyArea ? 'success' : 'neutral'}
                        >
                            {template.hasKeyArea ? 'Included' : 'Not included'}
                        </Tag>
                    </dd>
                </div>

                <div className="template-preview__field">
                    <dt>
                        <FontAwesomeIcon
                            icon={faIdCard}
                            className="template-preview__field-icon"
                            aria-hidden="true"
                        />
                        Student ID area
                    </dt>
                    <dd>
                        <Tag
                            size="sm"
                            tone={
                                template.hasStudentIdArea ? 'success' : 'neutral'
                            }
                        >
                            {template.hasStudentIdArea
                                ? 'Included'
                                : 'Not included'}
                        </Tag>
                    </dd>
                </div>

                <div className="template-preview__field">
                    <dt>
                        <FontAwesomeIcon
                            icon={faCalendarDays}
                            className="template-preview__field-icon"
                            aria-hidden="true"
                        />
                        Created
                    </dt>
                    <dd>{formatDateTime(template.createdAt)}</dd>
                </div>

                <div className="template-preview__field">
                    <dt>
                        <FontAwesomeIcon
                            icon={faCalendarDays}
                            className="template-preview__field-icon"
                            aria-hidden="true"
                        />
                        Last used
                    </dt>
                    <dd>
                        {template.lastUsedAt
                            ? formatDateTime(template.lastUsedAt)
                            : '—'}
                    </dd>
                </div>
            </dl>
        </section>
    );
}

/* ---------------------------------------------------------------- */

/**
 * Format an ISO-8601 string as a short local date-time.
 * Falls back to the raw string if parsing fails.
 */
function formatDateTime(value: string): string {
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString([], {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return value;
    }
}