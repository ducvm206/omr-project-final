// src/context/AuthProvider.tsx
import type { ReactNode } from 'react';
import { AuthContext, useAuthState } from '../hooks/Auth';

export function AuthProvider({ children }: { children: ReactNode }) {
    const value = useAuthState();
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}