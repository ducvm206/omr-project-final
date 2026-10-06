// src/components/features/Template/TemplatePreviewDialog.tsx

import { Dialog } from '../../common/Dialog';
import { TemplatePreviewPanel } from './TemplatePreviewPanel';
import type { TemplateDS } from '../../../types/Template';

export interface TemplatePreviewDialogProps {
    /** The template to preview, or null to keep the dialog closed. */
    template: TemplateDS | null;
    /** Called when the dialog should close. */
    onClose: () => void;
}

/**
 * Dialog wrapper around TemplatePreviewPanel.
 *
 *   <TemplatePreviewDialog
 *     template={selected}
 *     onClose={() => setSelected(null)}
 *   />
 */
export function TemplatePreviewDialog({
    template,
    onClose,
}: TemplatePreviewDialogProps) {
    return (
        <Dialog
            open={template !== null}
            title="Template preview"
            onClose={onClose}
            maxWidth={520}
        >
            {template && <TemplatePreviewPanel template={template} />}
        </Dialog>
    );
}