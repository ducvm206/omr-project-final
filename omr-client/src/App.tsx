// src/App.tsx

import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Loading } from './components/common/Loading';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { HomePage } from './pages/Home';
import { StudentsPage } from './pages/Students';
import { useAuth } from './hooks/Auth';
import { CoursesPage } from './pages/Courses';
import { CourseDetailsPage } from './pages/CourseDetails';
import { TemplatesPage } from './pages/Templates';
import { ExamConfigPage } from './pages/ExamConfig';

function App() {
    const { isAuthenticated, isInitializing } = useAuth();

    if (isInitializing) {
        return <Loading fullscreen message="Loading…" />;
    }

    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/courses/:courseId" element={<CourseDetailsPage />} />
                <Route
                    path="/courses/:courseId/exams/new"
                    element={<ExamConfigPage />}
                />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    );
}

export default App;