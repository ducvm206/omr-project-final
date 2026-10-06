// src/main.tsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import App from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) {
    throw new Error('Root element #root not found in index.html');
}

createRoot(container).render(
    <StrictMode>
        <BrowserRouter>
            <ToastProvider>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </ToastProvider>
        </BrowserRouter>
    </StrictMode>,
);