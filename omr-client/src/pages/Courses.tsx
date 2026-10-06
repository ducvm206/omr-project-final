// src/pages/Courses.tsx

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourseList } from '../components/features/Course/CourseList';
import { CourseCreationDialog } from '../components/features/Course/CourseCreationDialog';
import type { CourseDS } from '../types/Course';

type DialogState =
    | { kind: 'closed' }
    | { kind: 'create' }
    | { kind: 'edit'; course: CourseDS };

/**
 * Courses page.
 *
 * - CourseList renders the search form and the grid of course cards.
 * - CourseCreationDialog handles create and update.
 * - Clicking a card navigates to the course detail page.
 */
export function CoursesPage() {
    const navigate = useNavigate();
    const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' });
    const [refreshKey, setRefreshKey] = useState(0);

    const closeDialog = useCallback(() => setDialog({ kind: 'closed' }), []);

    const refresh = useCallback(() => {
        setRefreshKey((k) => k + 1);
    }, []);

    const handleCreate = useCallback(() => {
        setDialog({ kind: 'create' });
    }, []);

    const handleEdit = useCallback((course: CourseDS) => {
        setDialog({ kind: 'edit', course });
    }, []);

    const handleView = useCallback(
        (courseId: number) => {
            navigate(`/courses/${courseId}`);
        },
        [navigate],
    );

    return (
        <>
            <CourseList
                key={refreshKey}
                onCreate={handleCreate}
                onEdit={handleEdit}
                onView={handleView}
                onDeleted={refresh}
            />

            <CourseCreationDialog
                open={dialog.kind === 'create' || dialog.kind === 'edit'}
                course={dialog.kind === 'edit' ? dialog.course : null}
                onClose={closeDialog}
                onSaved={refresh}
            />
        </>
    );
}