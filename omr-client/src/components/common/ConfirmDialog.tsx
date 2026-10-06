// src/components/common/ConfirmDialog.tsx

import { useEffect, useRef } from 'react';
import { Button } from './Button';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
    /** Whether the dialog is open. */
    open: boolean;
    /** Dialog title. */
    title: string;
    /** Main message. Accepts plain text or JSX. */
    message?: React.ReactNode;
    /** Confirm button label. Defaults to 'Confirm'. */
    confirmLabel?: string;
    /** Cancel button label. Defaults to 'Cancel'. */
    cancelLabel?: string;
    /**
     * Visual style of the confirm button.
     * - 'primary' for non-destructive actions
     * - 'danger'  for destructive actions (delete, etc.)
     */
    variant?: 'primary' | 'danger';
    /** Shows a spinner on the confirm button and disables both. */
    loading?: boolean;
    /** Called when the user confirms. */
    onConfirm: () => void | Promise<void>;
    /** Called when the user cancels, presses Escape, or clicks the backdrop. */
    onCancel: () => void;
}

/**
 * Confirmation dialog.
 *
 *   <ConfirmDialog
 *     open={confirmOpen}
 *     title="Delete course?"
 *     message="This action cannot be undone."
 *     variant="danger"
 *     confirmLabel="Delete"
 *     loading={deleting}
 *     onConfirm={handleDelete}
 *     onCancel={() => setConfirmOpen(false)}
 *   />
 */
export function ConfirmDialog({
                                  open,
                                  title,
                                  message,
                                  confirmLabel = 'Confirm',
                                  cancelLabel = 'Cancel',
                                  variant = 'primary',
                                  loading = false,
                                  onConfirm,
                                  onCancel,
                              }: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    // Sync the `open` prop with the native dialog's show/close methods.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    // Close on Escape. The native dialog fires 'cancel' for Escape,
    // so we listen for that and route it through onCancel.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handleCancel = (e: Event) => {
            e.preventDefault(); // prevent the default close
            if (!loading) onCancel();
        };

        dialog.addEventListener('cancel', handleCancel);
        return () => dialog.removeEventListener('cancel', handleCancel);
    }, [loading, onCancel]);

    // Clicking the backdrop (outside the dialog content) closes it.
    // The native dialog renders the backdrop as a pseudo-element, so
    // clicking it registers as a click on the dialog element itself
    // with target === dialog.
    const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
        if (loading) return;
        if (e.target === dialogRef.current) {
            onCancel();
        }
    };

    const handleConfirm = async () => {
        if (loading) return;
        await onConfirm();
    };

    return (
        <dialog
            ref={dialogRef}
            className="confirm-dialog"
            onClick={handleBackdropClick}
        >
            <div className="confirm-dialog__content">
                <h2 className="confirm-dialog__title">{title}</h2>

                {message && (
                    <div className="confirm-dialog__message">{message}</div>
                )}

                <div className="confirm-dialog__actions">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={handleConfirm}
                        loading={loading}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </dialog>
    );
}