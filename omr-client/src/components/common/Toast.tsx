// src/components/common/Toast.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCircleCheck,
    faCircleExclamation,
    faCircleInfo,
    faTriangleExclamation,
    faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import './Toast.css';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
    /** Tone / color. Defaults to 'info'. */
    tone?: ToastTone;
    /** Main message. */
    message: ReactNode;
    /** Optional title shown above the message. */
    title?: string;
    /** Auto-dismiss after this many ms. 0 disables auto-dismiss. Default 4000. */
    durationMs?: number;
    /** Optional action button. */
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastItem extends ToastOptions {
    id: number;
}

interface ToastContextValue {
    /** Show a toast. Returns the id so you can dismiss it early. */
    show: (options: ToastOptions) => number;
    /** Convenience helpers. */
    info: (message: ReactNode, opts?: Omit<ToastOptions, 'message' | 'tone'>) => number;
    success: (message: ReactNode, opts?: Omit<ToastOptions, 'message' | 'tone'>) => number;
    warning: (message: ReactNode, opts?: Omit<ToastOptions, 'message' | 'tone'>) => number;
    danger: (message: ReactNode, opts?: Omit<ToastOptions, 'message' | 'tone'>) => number;
    /** Dismiss a specific toast. */
    dismiss: (id: number) => void;
    /** Dismiss all toasts. */
    clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON = {
    info: faCircleInfo,
    success: faCircleCheck,
    warning: faTriangleExclamation,
    danger: faCircleExclamation,
} as const;

/**
 * Wrap your app once, near the root:
 *
 *   <ToastProvider>
 *     <App />
 *   </ToastProvider>
 */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextIdRef = useRef(1);
    // Track timeout handles so we can clear them on dismissal.
    const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
    }, []);

    const show = useCallback(
        (options: ToastOptions): number => {
            const id = nextIdRef.current++;
            const item: ToastItem = { ...options, id };
            setToasts((prev) => [...prev, item]);

            const duration = options.durationMs ?? 4000;
            if (duration > 0) {
                const timer = setTimeout(() => dismiss(id), duration);
                timersRef.current.set(id, timer);
            }
            return id;
        },
        [dismiss],
    );

    const clear = useCallback(() => {
        for (const timer of timersRef.current.values()) clearTimeout(timer);
        timersRef.current.clear();
        setToasts([]);
    }, []);

    // Clear all timers on unmount.
    useEffect(() => {
        return () => {
            for (const timer of timersRef.current.values()) clearTimeout(timer);
            timersRef.current.clear();
        };
    }, []);

    const value = useMemo<ToastContextValue>(
        () => ({
            show,
            info: (message, opts) => show({ ...opts, message, tone: 'info' }),
            success: (message, opts) => show({ ...opts, message, tone: 'success' }),
            warning: (message, opts) => show({ ...opts, message, tone: 'warning' }),
            danger: (message, opts) => show({ ...opts, message, tone: 'danger' }),
            dismiss,
            clear,
        }),
        [show, dismiss, clear],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

function ToastViewport({
                           toasts,
                           onDismiss,
                       }: {
    toasts: ToastItem[];
    onDismiss: (id: number) => void;
}) {
    return (
        <div className="toast-viewport" aria-live="polite" aria-atomic="false">
            {toasts.map((t) => (
                <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
            ))}
        </div>
    );
}

function ToastCard({
                       toast,
                       onDismiss,
                   }: {
    toast: ToastItem;
    onDismiss: () => void;
}) {
    const tone: ToastTone = toast.tone ?? 'info';

    return (
        <div className={`toast toast--${tone}`} role="status">
            <span className="toast__icon" aria-hidden="true">
                <FontAwesomeIcon icon={TONE_ICON[tone]} />
            </span>

            <div className="toast__body">
                {toast.title && <div className="toast__title">{toast.title}</div>}
                <div className="toast__message">{toast.message}</div>

                {toast.action && (
                    <button
                        type="button"
                        className="toast__action"
                        onClick={() => {
                            toast.action!.onClick();
                            onDismiss();
                        }}
                    >
                        {toast.action.label}
                    </button>
                )}
            </div>

            <button
                type="button"
                className="toast__close"
                onClick={onDismiss}
                aria-label="Dismiss"
            >
                <FontAwesomeIcon icon={faXmark} />
            </button>
        </div>
    );
}

/**
 * Access the toast API from any component inside <ToastProvider>.
 *
 *   const toast = useToast();
 *   toast.success('Course created');
 *   toast.danger(error.message, { title: 'Grading failed' });
 */
export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used within a <ToastProvider>');
    }
    return ctx;
}