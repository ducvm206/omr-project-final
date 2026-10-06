// src/components/features/Template/TemplateListTab.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileLines,
    faMagnifyingGlass,
    faEye,
    faTrash,
    faPlus,
    faCalendarDays,
    faClock,
} from '@fortawesome/free-solid-svg-icons';
import { SearchForm } from '../../common/SearchForm';
import type { SearchField } from '../../common/SearchForm';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Loading } from '../../common/Loading';
import { EmptyState } from '../../common/EmptyState';
import { ErrorState } from '../../common/ErrorState';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { Tag } from '../../common/Tag';
import { useToast } from '../../common/Toast';
import {
    searchTemplates,
    deleteTemplate,
} from '../../../api/endpoints/Template';
import type { TemplateDS } from '../../../types/Template';
import type { SearchForm as SearchFormData } from '../../../types/Common';
import './TemplateListTab.css';

const SEARCH_FIELDS: SearchField[] = [
    {
        name: 'name',
        label: 'Template name',
        placeholder: 'e.g. Midterm A4',
        icon: <FontAwesomeIcon icon={faMagnifyingGlass} />,
    },
];

export interface TemplateListTabProps {
    onCreate?: () => void;
    onView?: (template: TemplateDS) => void;
    onDeleted?: (template: TemplateDS) => void;
}

/**
 * List of the user's templates as cards.
 * Each card shows the template name, its config summary, and when it
 * was created and last used.
 */
export function TemplateListTab({
    onCreate,
    onView,
    onDeleted,
}: TemplateListTabProps) {
    const toast = useToast();

    const [templates, setTemplates] = useState<TemplateDS[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [lastForm, setLastForm] = useState<SearchFormData>({
        searchParams: {},
    });

    const [pendingDelete, setPendingDelete] = useState<TemplateDS | null>(null);
    const [deleting, setDeleting] = useState(false);

    const runSearch = useCallback(async (form: SearchFormData) => {
        setLoading(true);
        setError(null);
        setLastForm(form);
        try {
            const data = await searchTemplates(form);
            setTemplates(data);
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void runSearch({ searchParams: {} });
    }, [runSearch]);

    const handleDelete = useCallback(async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            await deleteTemplate(pendingDelete.id);
            toast.success(`Template "${pendingDelete.name}" deleted`);
            setTemplates((prev) =>
                prev.filter((t) => t.id !== pendingDelete.id),
            );
            onDeleted?.(pendingDelete);
            setPendingDelete(null);
        } catch (e) {
            toast.danger(e instanceof Error ? e.message : 'Delete failed');
        } finally {
            setDeleting(false);
        }
    }, [pendingDelete, onDeleted, toast]);

    const fields = useMemo(() => SEARCH_FIELDS, []);
    const hasResults = templates.length > 0;

    return (
        <div className="template-list">
            <div className="template-list__header">
                <h1 className="template-list__title">Templates</h1>
                {onCreate && (
                    <Button
                        icon={<FontAwesomeIcon icon={faPlus} />}
                        onClick={onCreate}
                    >
                        New template
                    </Button>
                )}
            </div>

            <SearchForm
                fields={fields}
                onSubmit={runSearch}
                loading={loading}
                submitLabel="Search"
            />

            {loading ? (
                <Loading message="Loading templates…" />
            ) : error ? (
                <ErrorState error={error} onRetry={() => runSearch(lastForm)} />
            ) : !hasResults ? (
                <EmptyState
                    icon={<FontAwesomeIcon icon={faFileLines} />}
                    title="No templates found"
                    description="Try adjusting your search, or create a new template."
                    action={
                        onCreate && (
                            <Button
                                icon={<FontAwesomeIcon icon={faPlus} />}
                                onClick={onCreate}
                            >
                                New template
                            </Button>
                        )
                    }
                />
            ) : (
                <div className="template-list__grid">
                    {templates.map((template) => (
                        <Card
                            key={template.id}
                            title={template.name}
                            onClick={
                                onView ? () => onView(template) : undefined
                            }
                            actions={
                                <>
                                    <button
                                        type="button"
                                        className="template-list__action"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onView?.(template);
                                        }}
                                        aria-label={`View ${template.name}`}
                                        title="View template PDF"
                                    >
                                        <FontAwesomeIcon icon={faEye} />
                                    </button>
                                    <button
                                        type="button"
                                        className="template-list__action template-list__action--danger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPendingDelete(template);
                                        }}
                                        aria-label={`Delete ${template.name}`}
                                        title="Delete template"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </>
                            }
                            footer={
                                <div className="template-list__footer">
                                    <div className="template-list__meta">
                                        <Tag size="sm" tone="info">
                                            {template.mcqQuestions} MCQ
                                        </Tag>
                                        <Tag size="sm" tone="info">
                                            {template.writtenQuestions} written
                                        </Tag>
                                        {template.hasKeyArea && (
                                            <Tag size="sm" tone="success">
                                                Key area
                                            </Tag>
                                        )}
                                        {template.hasStudentIdArea && (
                                            <Tag size="sm" tone="success">
                                                Student ID
                                            </Tag>
                                        )}
                                    </div>

                                    <div className="template-list__dates">
                                        <span className="template-list__date">
                                            <FontAwesomeIcon
                                                icon={faCalendarDays}
                                                className="template-list__date-icon"
                                                aria-hidden="true"
                                            />
                                            Created{' '}
                                            {formatDate(template.createdAt)}
                                        </span>
                                        <span className="template-list__date">
                                            <FontAwesomeIcon
                                                icon={faClock}
                                                className="template-list__date-icon"
                                                aria-hidden="true"
                                            />
                                            {template.lastUsedAt
                                                ? `Last used ${formatDate(template.lastUsedAt)}`
                                                : 'Never used'}
                                        </span>
                                    </div>
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={pendingDelete !== null}
                title="Delete template?"
                message={
                    pendingDelete && (
                        <>
                            Delete <strong>{pendingDelete.name}</strong>? Any
                            exams using this template may be affected. This
                            action cannot be undone.
                        </>
                    )
                }
                variant="danger"
                confirmLabel="Delete"
                loading={deleting}
                onConfirm={handleDelete}
                onCancel={() => !deleting && setPendingDelete(null)}
            />
        </div>
    );
}

/* ---------------------------------------------------------------- */

/**
 * Short local date, e.g. "16 Sep 2026".
 * Falls back to the raw string if the value can't be parsed.
 */
function formatDate(value: string): string {
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleDateString([], {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return value;
    }
}