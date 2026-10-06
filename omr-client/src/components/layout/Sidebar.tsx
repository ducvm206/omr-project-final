// src/components/layout/Sidebar.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHouse,
    faBook,
    faFileLines,
    faGraduationCap,
    faUsers,
    faUser,
    faRightFromBracket,
    faChevronLeft,
    faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/Auth';
import { UserDetailDialog } from '../features/User/UserDetailDialog';
import './Sidebar.css';

const NAV_ITEMS = [
    { to: '/', label: 'Home', icon: faHouse, end: true },
    { to: '/templates', label: 'Templates', icon: faFileLines },
    { to: '/students', label: 'Students', icon: faUsers },
    { to: '/courses', label: 'Courses', icon: faBook },
    { to: '/grading', label: 'Grading', icon: faGraduationCap },
] as const;

const STORAGE_KEY = 'sidebar.collapsed';

export interface SidebarProps {
    /** Extra className applied to the root. */
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Persist collapsed state across reloads.
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    });

    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const userRef = useRef<HTMLDivElement>(null);

    // Persist collapse state on change.
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(collapsed));
        } catch {
            // ignore (e.g. private browsing)
        }
        if (collapsed) setMenuOpen(false);
    }, [collapsed]);

    // Close user menu on outside click.
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (userRef.current && !userRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    // Close user menu on Escape.
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [menuOpen]);

    const handleLogout = async () => {
        setMenuOpen(false);
        await logout();
        navigate('/login', { replace: true });
    };

    const openProfile = () => {
        setMenuOpen(false);
        setProfileOpen(true);
    };

    const classes = [
        'sidebar',
        collapsed ? 'sidebar--collapsed' : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <aside className={classes}>
            <div className="sidebar__brand">
                <span className="sidebar__brand-text">OMR Grader</span>
                <span className="sidebar__brand-mark" aria-hidden="true">OMR</span>
                <button
                    type="button"
                    className="sidebar__collapse"
                    onClick={() => setCollapsed((v) => !v)}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-expanded={!collapsed}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
                </button>
            </div>

            <nav className="sidebar__nav" aria-label="Main navigation">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={'end' in item ? item.end : undefined}
                        className={({ isActive }) =>
                            'sidebar__link' +
                            (isActive ? ' sidebar__link--active' : '')
                        }
                        title={collapsed ? item.label : undefined}
                    >
                        <span className="sidebar__link-icon" aria-hidden="true">
                            <FontAwesomeIcon icon={item.icon} />
                        </span>
                        <span className="sidebar__link-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar__spacer" />

            <Clock collapsed={collapsed} />

            <div className="sidebar__user" ref={userRef}>
                <button
                    type="button"
                    className="sidebar__user-button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    title={collapsed ? (user?.fullName || user?.userName || 'User') : undefined}
                >
                    <span className="sidebar__avatar" aria-hidden="true">
                        <FontAwesomeIcon icon={faUser} />
                    </span>
                    <span className="sidebar__user-info">
                        <span className="sidebar__user-name">
                            {user?.fullName || user?.userName || 'Unknown user'}
                        </span>
                        <span className="sidebar__user-handle">
                            @{user?.userName ?? '—'}
                        </span>
                    </span>
                </button>

                {menuOpen && (
                    <div className="sidebar__menu" role="menu">
                        <button
                            type="button"
                            className="sidebar__menu-item"
                            role="menuitem"
                            onClick={openProfile}
                        >
                            <FontAwesomeIcon icon={faUser} />
                            <span>Profile</span>
                        </button>
                        <button
                            type="button"
                            className="sidebar__menu-item sidebar__menu-item--danger"
                            role="menuitem"
                            onClick={handleLogout}
                        >
                            <FontAwesomeIcon icon={faRightFromBracket} />
                            <span>Log out</span>
                        </button>
                    </div>
                )}
            </div>

            <UserDetailDialog
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
            />
        </aside>
    );
}

/**
 * Live clock. Hidden when the sidebar is collapsed.
 */
function Clock({ collapsed }: { collapsed: boolean }) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    if (collapsed) return null;

    const time = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    const date = now.toLocaleDateString([], {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

    return (
        <div className="sidebar__clock" aria-live="off">
            <div className="sidebar__clock-time">{time}</div>
            <div className="sidebar__clock-date">{date}</div>
        </div>
    );
}