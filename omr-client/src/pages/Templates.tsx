// src/pages/Templates.tsx

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faFileCirclePlus } from '@fortawesome/free-solid-svg-icons';
import { Tabs } from '../components/common/Tabs';
import { TemplateListTab } from '../components/features/Template/TemplateListTab';
import { TemplateConfigTab } from '../components/features/Template/TemplateConfigTab';
import { TemplatePreviewDialog } from '../components/features/Template/TemplatePreviewDialog';
import type { TemplateDS } from '../types/Template';
import './Templates.css';

type TabKey = 'list' | 'config';

/**
 * Templates page.
 *
 * Two tabs:
 *   - All templates — grid of cards with View and Delete
 *   - New template — the config panel on the left, live preview on the right
 *
 * Viewing a template from the list opens a dialog with the preview
 * panel and a "View PDF" button.
 */
export function TemplatesPage() {
    const [tab, setTab] = useState<TabKey>('list');

    // Preview dialog state, opened from the list tab.
    const [previewTemplate, setPreviewTemplate] = useState<TemplateDS | null>(
        null,
    );

    // Bump to force the list to remount after creating or deleting,
    // which re-runs its initial search.
    const [refreshKey, setRefreshKey] = useState(0);

    const handleCreated = () => {
        // A new template exists — refresh the list and switch to it.
        setRefreshKey((k) => k + 1);
    };

    const handleDeleted = () => {
        setRefreshKey((k) => k + 1);
    };

    const closePreview = () => setPreviewTemplate(null);

    return (
        <div className="templates-page">
            <Tabs
                tabs={[
                    {
                        key: 'list',
                        label: 'All templates',
                        icon: <FontAwesomeIcon icon={faList} />,
                    },
                    {
                        key: 'config',
                        label: 'New template',
                        icon: <FontAwesomeIcon icon={faFileCirclePlus} />,
                    },
                ]}
                activeKey={tab}
                onChange={(k) => setTab(k as TabKey)}
            />

            {tab === 'list' && (
                <TemplateListTab
                    key={refreshKey}
                    onCreate={() => setTab('config')}
                    onView={(t) => setPreviewTemplate(t)}
                    onDeleted={handleDeleted}
                />
            )}

            {tab === 'config' && <TemplateConfigTab onCreated={handleCreated} />}

            <TemplatePreviewDialog
                template={previewTemplate}
                onClose={closePreview}
            />
        </div>
    );
}