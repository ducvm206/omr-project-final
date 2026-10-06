// src/components/common/Dialog.tsx

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import './Dialog.css';

export interface DialogProps {
    /** Whether the dialog is open. */
    open: boolean;
    /** Optional title shown in the header. */
    title?: ReactNode;
    /** Optional content under the title. */
    subtitle?: ReactNode;
    /** Main content. */
    children?: ReactNode;
    /** Optional footer (usually action buttons). */
    footer?: ReactNode;
    /** Called when the user requests to close (Escape, backdrop, X). */
    onClose: () => void;
    /**
     * When true, Escape and backdrop clicks do not close the dialog.
     * Use while a submit is in flight.
     */
    locked?: boolean;
    /** Max width of the dialog in px. Defaults to 520. */
    maxWidth?: number;
    /** Hide the close (×) button in the header. */
    hideCloseButton?: boolean;
    /** Extra className applied to the dialog element. */
    className?: string;
}

/**
 * Generic modal dialog.
 *
 *   <Dialog
 *     open={open}
 *     title="Edit student"
 *     footer={
 *       <>
 *         <Button variant="secondary" onClick={close}>Cancel</Button>
 *         <Button onClick={save} loading={saving}>Save</Button>
 *       </>
 *     }
 *     onClose={close}
 *   >
 *     <Input label="Name" ... />
 *   </Dialog>
 */
export function Dialog({
                           open,
                           title,
                           subtitle,
                           children,
                           footer,
                           onClose,
                           locked = false,
                           maxWidth = 520,
                           hideCloseButton = false,
                           className,
                       }: DialogProps) {
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

    // Escape key handling. The native `cancel` event fires on Escape;
    // we prevent default and route through onClose, respecting `locked`.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handleCancel = (e: Event) => {
            e.preventDefault();
            if (!locked) onClose();
        };

        dialog.addEventListener('cancel', handleCancel);
        return () => dialog.removeEventListener('cancel', handleCancel);
    }, [locked, onClose]);

    // Backdrop click: clicking the dialog element itself (not its
    // content) means the user clicked the backdrop.
    const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
        if (locked) return;
        if (e.target === dialogRef.current) onClose();
    };

    const hasHeader = title !== undefined || subtitle !== undefined || !hideCloseButton;

    return (
        <dialog
            ref={dialogRef}
            className={['dialog', className ?? ''].filter(Boolean).join(' ')}
            style={{ maxWidth: `${maxWidth}px` }}
            onClick={handleBackdropClick}
        >
            <div className="dialog__content">
                {hasHeader && (
                    <div className="dialog__header">
                        <div className="dialog__heading">
                            {title && <h2 className="dialog__title">{title}</h2>}
                            {subtitle && <div className="dialog__subtitle">{subtitle}</div>}
                        </div>
                        {!hideCloseButton && (
                            <button
                                type="button"
                                className="dialog__close"
                                onClick={onClose}
                                disabled={locked}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        )}
                    </div>
                )}

                {children && <div className="dialog__body">{children}</div>}

                {footer && <div className="dialog__footer">{footer}</div>}
            </div>
        </dialog>
    );
}