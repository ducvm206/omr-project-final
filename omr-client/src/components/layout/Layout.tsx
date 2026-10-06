// src/components/layout/Layout.tsx

import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import './Layout.css';

export interface LayoutProps {
    /** Content rendered to the right of the sidebar. */
    children: ReactNode;
}

/**
 * App shell for authenticated routes.
 *
 *   <Layout>
 *     <SomePage />
 *   </Layout>
 *
 * Or, with React Router, use it as a layout route:
 *
 *   <Route element={<Layout><Outlet /></Layout>}>
 *     ...
 *   </Route>
 */
export function Layout({ children }: LayoutProps) {
    return (
        <div className="layout">
            <Sidebar />
            <main className="layout__content">
                {children}
            </main>
        </div>
    );
}