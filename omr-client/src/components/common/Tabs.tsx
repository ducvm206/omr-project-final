// src/components/common/Tabs.tsx

import { useRef } from 'react';
import type { ReactNode } from 'react';
import './Tabs.css';

export interface TabItem {
    /** Unique key for this tab. Used as the value in onChange. */
    key: string;
    /** Label shown on the tab button. */
    label: ReactNode;
    /** Optional icon before the label. */
    icon?: ReactNode;
    /** Disable the tab. */
    disabled?: boolean;
    /** Optional content rendered when this tab is active. */
    content?: ReactNode;
}

export interface TabsProps {
    /** Tab definitions, rendered in order. */
    tabs: TabItem[];
    /** Currently active tab key. */
    activeKey: string;
    /** Called when the user selects a different tab. */
    onChange: (key: string) => void;
    /**
     * Visual variant.
     * - 'line'    underlined active tab (default)
     * - 'pill'    active tab gets a filled background
     */
    variant?: 'line' | 'pill';
    /** Stretch tabs to fill the container width. */
    fullWidth?: boolean;
    /** Extra className applied to the root. */
    className?: string;
}

/**
 * Tab navigation.
 *
 * Controlled: the parent owns `activeKey` and updates it via `onChange`.
 * Tab content is optional — pass `content` on each tab, or render your
 * own content outside the component based on `activeKey`.
 *
 *   <Tabs
 *     tabs={[
 *       { key: 'students', label: 'Students' },
 *       { key: 'byExam',   label: 'By exam' },
 *     ]}
 *     activeKey={active}
 *     onChange={setActive}
 *   />
 */
export function Tabs({
                         tabs,
                         activeKey,
                         onChange,
                         variant = 'line',
                         fullWidth = false,
                         className,
                     }: TabsProps) {
    const listRef = useRef<HTMLDivElement>(null);

    // Arrow-key navigation between tabs.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        const enabledIndices = tabs
            .map((t, i) => (!t.disabled ? i : -1))
            .filter((i) => i !== -1);
        if (enabledIndices.length === 0) return;

        const currentPos = enabledIndices.indexOf(index);
        let nextPos: number | null = null;

        if (e.key === 'ArrowRight') {
            nextPos = (currentPos + 1) % enabledIndices.length;
        } else if (e.key === 'ArrowLeft') {
            nextPos = (currentPos - 1 + enabledIndices.length) % enabledIndices.length;
        } else if (e.key === 'Home') {
            nextPos = 0;
        } else if (e.key === 'End') {
            nextPos = enabledIndices.length - 1;
        }

        if (nextPos !== null) {
            e.preventDefault();
            const targetIndex = enabledIndices[nextPos];
            onChange(tabs[targetIndex].key);
            // Move focus to the newly selected tab button.
            const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
                '.tabs__tab',
            );
            buttons?.[targetIndex]?.focus();
        }
    };

    const classes = [
        'tabs',
        `tabs--${variant}`,
        fullWidth ? 'tabs--full' : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    const activeTab = tabs.find((t) => t.key === activeKey);

    return (
        <div className={classes}>
            <div className="tabs__list" role="tablist" ref={listRef}>
                {tabs.map((tab, index) => {
                    const isActive = tab.key === activeKey;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            id={`tab-${tab.key}`}
                            aria-selected={isActive}
                            aria-controls={`tabpanel-${tab.key}`}
                            tabIndex={isActive ? 0 : -1}
                            className={
                                'tabs__tab' +
                                (isActive ? ' tabs__tab--active' : '')
                            }
                            disabled={tab.disabled}
                            onClick={() => !tab.disabled && onChange(tab.key)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                        >
                            {tab.icon && (
                                <span className="tabs__icon" aria-hidden="true">
                                    {tab.icon}
                                </span>
                            )}
                            <span className="tabs__label">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {activeTab?.content !== undefined && (
                <div
                    className="tabs__panel"
                    role="tabpanel"
                    id={`tabpanel-${activeTab.key}`}
                    aria-labelledby={`tab-${activeTab.key}`}
                >
                    {activeTab.content}
                </div>
            )}
        </div>
    );
}