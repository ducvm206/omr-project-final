// src/components/features/Template/TemplateConfigTab.tsx

import { useCallback, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileCirclePlus } from '@fortawesome/free-solid-svg-icons';
import { TemplateConfigPanel } from './TemplateConfigPanel';
import { TemplatePreviewPanel } from './TemplatePreviewPanel';
import { EmptyState } from '../../common/EmptyState';
import type { TemplateDS } from '../../../types/Template';
import './TemplateConfigTab.css';

export interface TemplateConfigTabProps {
    /**
     * Optional existing template to show in the preview panel on mount.
     * When omitted, the preview starts empty until a new template is
     * created through the config panel.
     */
    initialTemplate?: TemplateDS | null;
    /** Called after a template is successfully created. */
    onCreated?: (template: TemplateDS) => void;
}

/**
 * Two-column template editor tab.
 *
 *   ┌─────────────────────┬─────────────────────┐
 *   │ Config panel        │ Preview panel       │
 *   │ (create a template) │ (view the result)   │
 *   └─────────────────────┴─────────────────────┘
 *
 * The preview panel updates as soon as the config panel creates a
 * new template.
 */
export function TemplateConfigTab({
    initialTemplate = null,
    onCreated,
}: TemplateConfigTabProps) {
    const [template, setTemplate] = useState<TemplateDS | null>(
        initialTemplate,
    );

    const handleCreated = useCallback(
        (created: TemplateDS) => {
            setTemplate(created);
            onCreated?.(created);
        },
        [onCreated],
    );

    return (
        <div className="template-config-tab">
            <div className="template-config-tab__pane">
                <TemplateConfigPanel onCreated={handleCreated} />
            </div>

            <div className="template-config-tab__pane">
                {template ? (
                    <TemplatePreviewPanel template={template} />
                ) : (
                    <div className="template-config-tab__empty">
                        <EmptyState
                            size="sm"
                            icon={<FontAwesomeIcon icon={faFileCirclePlus} />}
                            title="No template yet"
                            description="Fill in the configuration on the left and create a template to preview it here."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}