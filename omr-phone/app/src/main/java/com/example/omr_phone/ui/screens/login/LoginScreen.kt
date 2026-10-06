package com.example.omr_phone.ui.screens.login

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.omr_phone.data.repository.AuthRepository
import com.example.omr_phone.ui.components.common.AppButton
import com.example.omr_phone.ui.components.common.ButtonSize
import com.example.omr_phone.ui.components.common.ButtonVariant
import com.example.omr_phone.ui.components.common.FormInput
import com.example.omr_phone.ui.theme.HoverBlueBg
import com.example.omr_phone.ui.theme.PrimaryDarkBlue
import com.example.omr_phone.ui.theme.SecondaryBlue
import kotlinx.coroutines.launch

// Validation constants — mirror Login.tsx
private const val USERNAME_MIN = 4
private const val USERNAME_MAX = 16
private val USERNAME_REGEX = Regex("^[a-zA-Z0-9]+$")
private const val PASSWORD_MIN = 8
private const val PASSWORD_MAX = 32

/**
 * Sign-in screen.
 *
 * Mirrors the web Login.tsx form: username + password, client-side
 * validation, inline field errors, form-level error banner, and a
 * note that new accounts must be created on the web app.
 *
 * @param authRepository Source of truth for the login call.
 * @param onSuccess      Invoked after a successful login (e.g. navigate).
 */
@Composable
fun LoginScreen(
    authRepository: AuthRepository,
    onSuccess: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    // ----- State -----
    var userName by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var userNameError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var formError by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    val focusManager = LocalFocusManager.current
    val scope = rememberCoroutineScope()
    val userNameFocus = remember { FocusRequester() }

    // Auto-focus the username field on first composition (web: autoFocus).
    LaunchedEffect(Unit) {
        userNameFocus.requestFocus()
    }

    // Clear stale banner when the user edits either field.
    LaunchedEffect(userName, password) {
        if (formError != null) formError = null
    }

    // ----- Validation -----
    fun validate(): Boolean {
        val trimmed = userName.trim()
        userNameError = when {
            trimmed.isEmpty() -> "Username is required."
            trimmed.length !in USERNAME_MIN..USERNAME_MAX ->
                "Username should be between $USERNAME_MIN and $USERNAME_MAX characters."
            !USERNAME_REGEX.matches(trimmed) ->
                "Username should only contain letters and numbers without spaces."
            else -> null
        }

        passwordError = when {
            password.isEmpty() -> "Password is required."
            password.length !in PASSWORD_MIN..PASSWORD_MAX ->
                "Password should be between $PASSWORD_MIN and $PASSWORD_MAX characters."
            else -> null
        }

        return userNameError == null && passwordError == null
    }

    // ----- Submit -----
    fun submit() {
        if (isLoading) return
        focusManager.clearFocus()
        formError = null
        if (!validate()) return

        scope.launch {
            isLoading = true
            val result = authRepository.login(userName.trim(), password)
            isLoading = false

            result
                .onSuccess { onSuccess() }
                .onFailure { e ->
                    // The repository wraps the error body in a plain Exception.
                    // If the server returns "Invalid username or password." we
                    // show it as-is; anything else goes into the form banner too,
                    // with a safe fallback for null/blank messages.
                    formError = e.message
                        ?.takeIf { it.isNotBlank() }
                        ?: "Unexpected error. Please try again."
                }
        }
    }

    // ----- UI -----
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(HoverBlueBg) // #f8fbff
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 380.dp)
                .fillMaxWidth()
                .background(Color.White, RoundedCornerShape(8.dp))
                .border(1.dp, Color(0xFFCFE0F5), RoundedCornerShape(8.dp))
                .padding(horizontal = 28.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // ----- Title -----
            Text(
                text = "Sign in",
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 21.6.sp, // 1.35rem
                ),
                color = PrimaryDarkBlue,
                textAlign = TextAlign.Center,
            )

            // ----- Subtitle -----
            Text(
                text = "Sign in to access your templates, courses, and grading.",
                style = MaterialTheme.typography.bodySmall.copy(
                    fontSize = 13.6.sp, // 0.85rem
                    lineHeight = 19.sp,
                ),
                color = SecondaryBlue,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 4.dp),
            )

            // ----- Username -----
            FormInput(
                label = "Username",
                value = userName,
                onValueChange = { userName = it },
                placeholder = "4–16 characters",
                icon = Icons.Filled.Person,
                error = userNameError,
                enabled = !isLoading,
                required = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Text,
                    imeAction = ImeAction.Next,
                ),
                modifier = Modifier.focusRequester(userNameFocus),
            )

            // ----- Password -----
            FormInput(
                label = "Password",
                value = password,
                onValueChange = { password = it },
                placeholder = "8–32 characters",
                icon = Icons.Filled.Lock,
                error = passwordError,
                isPassword = true,
                enabled = !isLoading,
                required = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(onDone = { submit() }),
            )

            // ----- Form-level error banner -----
            formError?.let { message ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFFEF2F2), RoundedCornerShape(4.dp))
                        .border(1.dp, Color(0xFFFECACA), RoundedCornerShape(4.dp))
                        .padding(horizontal = 11.dp, vertical = 9.dp),
                ) {
                    Text(
                        text = message,
                        color = Color(0xFFB91C1C),
                        fontSize = 13.1.sp, // 0.82rem
                        lineHeight = 18.sp,
                    )
                }
            }

            // ----- Submit -----
            Spacer(Modifier.height(2.dp))
            AppButton(
                text = "Sign in",
                onClick = { submit() },
                variant = ButtonVariant.Primary,
                size = ButtonSize.Lg,
                loading = isLoading,
                fullWidth = true,
            )

            // ----- Register notice -----
            Text(
                text = "New here? Create an account on the PC (web) version first, " +
                        "then sign in here with the same credentials.",
                style = MaterialTheme.typography.bodySmall.copy(
                    fontSize = 13.1.sp, // 0.82rem
                    lineHeight = 18.sp,
                ),
                color = SecondaryBlue,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
            )
        }
    }
}