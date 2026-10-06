// src/pages/Students.tsx

import { useCallback, useState } from 'react';
import { StudentList } from '../components/features/Student/StudentList';
import { StudentCreationDialog } from '../components/features/Student/StudentCreationDialog';
import { StudentDetailDialog } from '../components/features/Student/StudentDetailDialog';
import type { Student } from '../types/Student';

type DialogState =
    | { kind: 'closed' }
    | { kind: 'create' }
    | { kind: 'edit'; student: Student }
    | { kind: 'view'; studentId: string };

export function StudentsPage() {
    const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' });
    const [refreshKey, setRefreshKey] = useState(0);

    const closeDialog = useCallback(() => setDialog({ kind: 'closed' }), []);

    const refresh = useCallback(() => {
        setRefreshKey((k) => k + 1);
    }, []);

    const handleCreate = useCallback(() => {
        setDialog({ kind: 'create' });
    }, []);

    const handleEdit = useCallback((student: Student) => {
        setDialog({ kind: 'edit', student });
    }, []);

    const handleView = useCallback((studentId: string) => {
        setDialog({ kind: 'view', studentId });
    }, []);

    const handleSaved = useCallback(() => {
        refresh();
    }, [refresh]);

    const handleDeleted = useCallback(() => {
        refresh();
    }, [refresh]);

    return (
        <>
            <StudentList
                key={refreshKey}
                onCreate={handleCreate}
                onEdit={handleEdit}
                onView={handleView}
                onDeleted={handleDeleted}
            />

            <StudentCreationDialog
                open={dialog.kind === 'create' || dialog.kind === 'edit'}
                student={dialog.kind === 'edit' ? dialog.student : null}
                onClose={closeDialog}
                onSaved={handleSaved}
            />

            <StudentDetailDialog
                open={dialog.kind === 'view'}
                studentId={dialog.kind === 'view' ? dialog.studentId : null}
                onClose={closeDialog}
                onEdit={(_id) => {
                    // Edit-from-detail not wired yet. Close the dialog
                    // and let the user click the card's pencil icon.
                    setDialog({ kind: 'closed' });
                }}
                onDeleted={handleDeleted}
            />
        </>
    );
}