// src/pages/Home.tsx

import { useAuth } from '../hooks/Auth';
import { Card } from '../components/common/Card';
import './Home.css';

/**
 * Home page — the default authenticated landing page.
 * Greets the user and shows quick links to the main sections.
 */
export function HomePage() {
    const { user } = useAuth();

    const displayName = user?.fullName || user?.userName || 'there';

    return (
        <div className="home">
            <header className="home__hero">
                <h1 className="home__title">Welcome, {displayName}</h1>
                <p className="home__subtitle">
                    Grade exams, manage students, and organize your courses.
                </p>
            </header>

            <div className="home__grid">
                <Card
                    title="Templates"
                    subtitle="Answer sheet layouts"
                    variant="flat"
                >
                    Design and manage the templates used to print answer sheets.
                </Card>

                <Card
                    title="Students"
                    subtitle="Your roster"
                    variant="flat"
                >
                    Keep track of students and their grading history.
                </Card>

                <Card
                    title="Courses"
                    subtitle="Classes and groups"
                    variant="flat"
                >
                    Organize students into courses and manage enrollments.
                </Card>

                <Card
                    title="Grading"
                    subtitle="Score answer sheets"
                    variant="flat"
                >
                    Upload scanned answer sheets and grade them automatically.
                </Card>
            </div>
        </div>
    );
}