// src/components/features/User/UserDetailDialog.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser,
    faIdBadge,
    faPen,
    faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../common/Dialog';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { Loading } from '../../common/Loading';
import { useToast } from '../../common/Toast';
import { useAuth } from '../../../hooks/Auth';
import { updateMe } from '../../../api/endpoints/User';
import { ApiError } from '../../../api/client';
import './UserDetailDialog.css';

export interface UserDetailDialogProps {
    /** Whether the dialog is open. */
    open: boolean;
    /** Called when the dialog should close. */
    onClose: () => void;
}

/**
 * Shows the currently authenticated user's profile.
 * Supports inline editing — click the pencil to switch to edit mode.
 */
export function UserDetailDialog({ open, onClose }: UserDetailDialogProps) {
    const { user, setUser, logout } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const [editing, setEditing] = useState(false);

    // Form state — used only in edit mode.
    const [userName, setUserName] = useState('');
    const [fullName, setFullName] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    // Reset state whenever the dialog opens or the user changes.
    useEffect(() => {
        if (!open) return;
        setEditing(false);
        setErrors({});
        setFormError(null);
        setUserName(user?.userName ?? '');
        setFullName(user?.fullName ?? '');
    }, [open, user]);

    const enterEdit = () => {
        setUserName(user?.userName ?? '');
        setFullName(user?.fullName ?? '');
        setErrors({});
        setFormError(null);
        setEditing(true);
    };

    const cancelEdit = () => {
        if (saving) return;
        setEditing(false);
        setErrors({});
        setFormError(null);
    };

    const validate = (): boolean => {
        const next: Record<string, string> = {};

        const trimmedUser = userName.trim();
        if (!trimmedUser) {
            next.userName = 'Username is required.';
        } else if (trimmedUser.length < 4 || trimmedUser.length > 16) {
            next.userName =
                'Username should be between 4 and 16 characters.';
        } else if (!/^[a-zA-Z0-9]+$/.test(trimmedUser)) {
            next.userName =
                'Username should only contain letters and numbers without spaces.';
        }

        const trimmedName = fullName.trim();
        if (!trimmedName) {
            next.fullName = 'Full name is required.';
        } else if (!/^[a-zA-Z ]+$/.test(trimmedName)) {
            next.fullName =
                'Full name should only contain letters and spaces.';
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSave = async () => {
        if (saving) return;
        setFormError(null);

        if (!validate()) return;

        setSaving(true);
        try {
            const updated = await updateMe({
                userName: userName.trim(),
                fullName: fullName.trim(),
            });
            setUser(updated);
            toast.success('Profile updated');
            setEditing(false);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.validationErrors) setErrors(e.validationErrors);
                else setFormError(e.message);
            } else {
                setFormError('Unexpected error. Please try again.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        onClose();
        await logout();
        navigate('/login', { replace: true });
    };

    // --- Footer buttons ---------------------------------------------------

    const footer = editing ? (
        <>
            <Button
                variant="secondary"
                onClick={cancelEdit}
                disabled={saving}
            >
                Cancel
            </Button>
            <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
            >
                Save changes
            </Button>
        </>
    ) : (
        <>
            <Button
                variant="danger"
                icon={<FontAwesomeIcon icon={faRightFromBracket} />}
                onClick={handleLogout}
            >
                Log out
            </Button>
            <Button
                variant="primary"
                icon={<FontAwesomeIcon icon={faPen} />}
                onClick={enterEdit}
                disabled={!user}
            >
                Edit
            </Button>
        </>
    );

    // --- Body -------------------------------------------------------------

    return (
        <Dialog
            open={open}
            title={editing ? 'Edit profile' : 'Your profile'}
            onClose={editing ? cancelEdit : onClose}
            locked={saving}
            maxWidth={420}
            footer={footer}
        >
            {!user ? (
                <p className="user-detail__empty">Not signed in.</p>
            ) : editing ? (
                <div className="user-edit">
                    <Input
                        label="Username"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="4–16 characters"
                        icon={<FontAwesomeIcon icon={faIdBadge} />}
                        disabled={saving}
                        error={errors.userName ?? null}
                        constraints={{
                            required: true,
                            minLength: 4,
                            maxLength: 16,
                            pattern: '^[a-zA-Z0-9]+$',
                            title: '4–16 characters, letters and digits only',
                        }}
                        autoComplete="username"
                        fullWidth
                    />

                    <Input
                        label="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Alice Nguyen"
                        icon={<FontAwesomeIcon icon={faUser} />}
                        disabled={saving}
                        error={errors.fullName ?? null}
                        constraints={{
                            required: true,
                            pattern: '^[a-zA-Z ]+$',
                            title: 'Letters and spaces only',
                        }}
                        autoComplete="name"
                        fullWidth
                    />

                    {formError && (
                        <div className="user-edit__error" role="alert">
                            {formError}
                        </div>
                    )}

                    {saving && <Loading size="sm" message="Saving…" />}
                </div>
            ) : (
                <div className="user-detail">
                    <div className="user-detail__avatar" aria-hidden="true">
                        <FontAwesomeIcon icon={faUser} />
                    </div>

                    <div className="user-detail__name">{user.fullName}</div>
                    <div className="user-detail__handle">@{user.userName}</div>

                    <dl className="user-detail__fields">
                        <div className="user-detail__field">
                            <dt>
                                <FontAwesomeIcon
                                    icon={faIdBadge}
                                    className="user-detail__field-icon"
                                />
                                Username
                            </dt>
                            <dd>{user.userName}</dd>
                        </div>

                        <div className="user-detail__field">
                            <dt>
                                <FontAwesomeIcon
                                    icon={faUser}
                                    className="user-detail__field-icon"
                                />
                                Full name
                            </dt>
                            <dd>{user.fullName}</dd>
                        </div>

                        <div className="user-detail__field">
                            <dt>
                                <FontAwesomeIcon
                                    icon={faIdBadge}
                                    className="user-detail__field-icon"
                                />
                                User ID
                            </dt>
                            <dd>#{user.id}</dd>
                        </div>
                    </dl>
                </div>
            )}
        </Dialog>
    );
}