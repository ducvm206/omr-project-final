// src/types/User.ts

/**
 * User entity as exposed by the API.
 * Maps to com.ducvm.omrserver.entity.User, but with the password field
 * intentionally omitted — the backend should never return it.
 */
export interface User {
    id: number;
    userName: string;
    fullName: string;
}

/**
 * Login data structure.
 * Maps to com.ducvm.omrserver.dataset.LoginDS
 */
export interface LoginDS {
    userName: string;
    password: string;
}

/**
 * Register data structure.
 * Maps to com.ducvm.omrserver.dataset.RegisterDS
 */
export interface RegisterDS {
    userName: string;
    fullName: string;
    password: string;
}

/**
 * Payload for editing the current user's profile.
 * Maps to com.ducvm.omrserver.dataset.UserDS.
 *
 * The id is not part of the payload — the backend updates the
 * authenticated user from the session.
 */
export interface UserDS {
    userName: string;
    fullName: string;
}