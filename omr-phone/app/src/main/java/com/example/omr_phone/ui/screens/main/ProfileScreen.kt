package com.example.omr_phone.ui.screens.main

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.omr_phone.data.dataset.UpdateUserRequest
import com.example.omr_phone.data.model.User
import com.example.omr_phone.data.repository.AuthRepository
import com.example.omr_phone.data.repository.UserRepository
import com.example.omr_phone.ui.components.common.AppButton
import com.example.omr_phone.ui.components.common.AppCard
import com.example.omr_phone.ui.components.common.ButtonSize
import com.example.omr_phone.ui.components.common.ButtonVariant
import com.example.omr_phone.ui.components.common.CardPadding
import com.example.omr_phone.ui.components.common.CardVariant
import com.example.omr_phone.ui.components.common.FormInput
import com.example.omr_phone.ui.components.common.Loading
import com.example.omr_phone.ui.components.common.LoadingSize
import com.example.omr_phone.ui.theme.PrimaryBlue
import com.example.omr_phone.ui.theme.PrimaryDarkBlue
import com.example.omr_phone.ui.theme.SecondaryBlue
import kotlinx.coroutines.launch

// Validation rules — mirror UserDetailDialog.tsx
private const val USERNAME_MIN = 4
private const val USERNAME_MAX = 16
private val USERNAME_REGEX = Regex("^[a-zA-Z0-9]+$")
private val FULL_NAME_REGEX = Regex("^[a-zA-Z ]+$")

/**
 * Profile screen — the authenticated user's account page.
 *
 * Shows the user's name, handle, and account fields. Tap the pencil to
 * switch into edit mode (inline form with the same validation rules as
 * the web dialog), or use "Log out" to sign out via [authRepository].
 *
 * @param userRepository Source of the current user, and sink for updates.
 * @param authRepository Source of the logout call.
 * @param onLoggedOut    Invoked after a successful (or failed) logout —
 *                       the caller clears the auth flag either way so the
 *                       user is never stuck on this screen.
 * @param modifier       Optional modifier.
 */
@Composable
fun ProfileScreen(
    userRepository: UserRepository,
    authRepository: AuthRepository,
    onLoggedOut: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    // ----- State -----
    var user by remember { mutableStateOf<User?>(null) }
    var isLoadingUser by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }

    var editing by remember { mutableStateOf(false) }

    // Edit-form state — only meaningful while `editing == true`.
    var userName by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var userNameError by remember { mutableStateOf<String?>(null) }
    var fullNameError by remember { mutableStateOf<String?>(null) }
    var formError by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }

    // Logout state — shows a spinner on the Log out button.
    var loggingOut by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    // ----- Initial load -----
    LaunchedEffect(userRepository) {
        isLoadingUser = true
        loadError = null
        userRepository.getCurrentUser()
            .onSuccess { user = it }
            .onFailure { loadError = it.message ?: "Failed to load profile." }
        isLoadingUser = false
    }

    // ----- Validation -----
    fun validate(): Boolean {
        val trimmedUser = userName.trim()
        userNameError = when {
            trimmedUser.isEmpty() -> "Username is required."
            trimmedUser.length !in USERNAME_MIN..USERNAME_MAX ->
                "Username should be between $USERNAME_MIN and $USERNAME_MAX characters."
            !USERNAME_REGEX.matches(trimmedUser) ->
                "Username should only contain letters and numbers without spaces."
            else -> null
        }

        val trimmedName = fullName.trim()
        fullNameError = when {
            trimmedName.isEmpty() -> "Full name is required."
            !FULL_NAME_REGEX.matches(trimmedName) ->
                "Full name should only contain letters and spaces."
            else -> null
        }

        return userNameError == null && fullNameError == null
    }

    // ----- Enter / cancel edit -----
    fun enterEdit() {
        val u = user ?: return
        userName = u.userName
        fullName = u.fullName ?: ""
        userNameError = null
        fullNameError = null
        formError = null
        editing = true
    }

    fun cancelEdit() {
        if (saving) return
        editing = false
        userNameError = null
        fullNameError = null
        formError = null
    }

    // ----- Save -----
    fun save() {
        if (saving) return
        formError = null
        if (!validate()) return

        scope.launch {
            saving = true
            val result = userRepository.updateUser(
                UpdateUserRequest(
                    userName = userName.trim(),
                    fullName = fullName.trim(),
                )
            )
            saving = false

            result
                .onSuccess { updated ->
                    user = updated
                    editing = false
                }
                .onFailure { e ->
                    formError = e.message
                        ?.takeIf { it.isNotBlank() }
                        ?: "Unexpected error. Please try again."
                }
        }
    }

    // ----- Log out -----
    fun logout() {
        if (loggingOut) return

        scope.launch {
            loggingOut = true
            authRepository.logout()
            loggingOut = false
            onLoggedOut()
        }
    }

    // ----- UI -----
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8FBFF))
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        when {
            isLoadingUser -> Loading(fullscreen = true)

            loadError != null -> ProfileMessage(loadError!!)

            user == null -> ProfileMessage("Not signed in.")

            editing -> EditProfileForm(
                userName = userName,
                fullName = fullName,
                userNameError = userNameError,
                fullNameError = fullNameError,
                formError = formError,
                saving = saving,
                onUserNameChange = { userName = it },
                onFullNameChange = { fullName = it },
                onCancel = { cancelEdit() },
                onSave = { save() },
            )

            else -> ViewProfile(
                user = user!!,
                loggingOut = loggingOut,
                onEdit = { enterEdit() },
                onLogout = { logout() },
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Shared message state
// ---------------------------------------------------------------------------

@Composable
private fun ProfileMessage(message: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = message,
            fontSize = 14.sp,
            color = SecondaryBlue,
            textAlign = TextAlign.Center,
        )
    }
}

// ---------------------------------------------------------------------------
// View profile
// ---------------------------------------------------------------------------

@Composable
private fun ViewProfile(
    user: User,
    loggingOut: Boolean,
    onEdit: () -> Unit,
    onLogout: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Header row: title on the left, pencil on the right.
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Your profile",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = PrimaryDarkBlue,
                modifier = Modifier.weight(1f),
            )
            IconButton(
                onClick = onEdit,
                enabled = !loggingOut,
            ) {
                Icon(
                    imageVector = Icons.Filled.Edit,
                    contentDescription = "Edit profile",
                    tint = if (loggingOut) Color(0xFF8AA3C0) else PrimaryBlue,
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // Avatar
        Box(
            modifier = Modifier
                .size(64.dp)
                .background(PrimaryBlue, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.Person,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(30.dp),
            )
        }

        Spacer(Modifier.height(8.dp))

        // Name + handle
        Text(
            text = user.fullName ?: user.userName,
            fontSize = 16.8.sp,
            fontWeight = FontWeight.Bold,
            color = PrimaryDarkBlue,
            textAlign = TextAlign.Center,
        )
        Text(
            text = "@${user.userName}",
            fontSize = 13.1.sp,
            color = SecondaryBlue,
        )

        Spacer(Modifier.height(16.dp))

        // Field list — uses AppCard for consistent look with the rest of the app.
        AppCard(
            variant = CardVariant.Default,
            padding = CardPadding.Md,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                FieldRow(
                    label = "Username",
                    value = user.userName,
                    icon = Icons.Filled.Badge,
                )
                FieldRow(
                    label = "Full name",
                    value = user.fullName ?: "—",
                    icon = Icons.Filled.Person,
                )
                FieldRow(
                    label = "User ID",
                    value = "#${user.id}",
                    icon = Icons.Filled.Badge,
                )
            }
        }

        Spacer(Modifier.height(24.dp))

        // Log out
        AppButton(
            text = "Log out",
            onClick = onLogout,
            variant = ButtonVariant.Danger,
            size = ButtonSize.Md,
            icon = Icons.Filled.Logout,
            loading = loggingOut,
            enabled = !loggingOut,
            fullWidth = true,
        )
    }
}

@Composable
private fun FieldRow(
    label: String,
    value: String,
    icon: ImageVector,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Color(0xFF8AA3C0),
                modifier = Modifier.size(14.dp),
            )
            Text(
                text = label.uppercase(),
                fontSize = 12.8.sp,
                fontWeight = FontWeight.SemiBold,
                color = SecondaryBlue,
                letterSpacing = 0.4.sp,
            )
        }
        Text(
            text = value,
            fontSize = 14.1.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF1E293B),
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1f, fill = false),
        )
    }
}

// ---------------------------------------------------------------------------
// Edit form
// ---------------------------------------------------------------------------

@Composable
private fun EditProfileForm(
    userName: String,
    fullName: String,
    userNameError: String?,
    fullNameError: String?,
    formError: String?,
    saving: Boolean,
    onUserNameChange: (String) -> Unit,
    onFullNameChange: (String) -> Unit,
    onCancel: () -> Unit,
    onSave: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(
            text = "Edit profile",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = PrimaryDarkBlue,
        )

        FormInput(
            label = "Username",
            value = userName,
            onValueChange = onUserNameChange,
            placeholder = "4–16 characters",
            icon = Icons.Filled.Badge,
            error = userNameError,
            enabled = !saving,
            required = true,
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                keyboardType = KeyboardType.Text,
                imeAction = ImeAction.Next,
            ),
        )

        FormInput(
            label = "Full name",
            value = fullName,
            onValueChange = onFullNameChange,
            placeholder = "e.g. Alice Nguyen",
            icon = Icons.Filled.Person,
            error = fullNameError,
            enabled = !saving,
            required = true,
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                keyboardType = KeyboardType.Text,
                capitalization = KeyboardCapitalization.Words,
                imeAction = ImeAction.Done,
            ),
        )

        if (formError != null) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFFEF2F2), RoundedCornerShape(4.dp))
                    .border(1.dp, Color(0xFFFECACA), RoundedCornerShape(4.dp))
                    .padding(horizontal = 11.dp, vertical = 9.dp),
            ) {
                Text(
                    text = formError,
                    color = Color(0xFFB91C1C),
                    fontSize = 13.1.sp,
                    lineHeight = 18.sp,
                )
            }
        }

        // Inline "Saving…" — matches the web `<Loading size="sm" message="Saving…" />`.
        if (saving) {
            Loading(
                size = LoadingSize.Sm,
                message = "Saving…",
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            AppButton(
                text = "Cancel",
                onClick = onCancel,
                variant = ButtonVariant.Secondary,
                size = ButtonSize.Md,
                enabled = !saving,
                fullWidth = true,
                modifier = Modifier.weight(1f),
            )
            AppButton(
                text = "Save changes",
                onClick = onSave,
                variant = ButtonVariant.Primary,
                size = ButtonSize.Md,
                loading = saving,
                fullWidth = true,
                modifier = Modifier.weight(1f),
            )
        }
    }
}