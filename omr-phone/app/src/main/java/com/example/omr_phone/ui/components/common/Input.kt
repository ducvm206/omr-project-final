package com.example.omr_phone.ui.components.common

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.omr_phone.ui.theme.PrimaryBlue
import com.example.omr_phone.ui.theme.PrimaryDarkBlue
import com.example.omr_phone.ui.theme.SecondaryBlue

/**
 * Text input with label, optional leading icon, hint, and error handling.
 *
 * Mirrors the web `<Input>` API: label, hint, error, icon, fullWidth,
 * disabled state. File-input handling from the web version is intentionally
 * omitted — pick a separate composable for file picking on Android.
 *
 *   FormInput(
 *       label = "Name",
 *       value = name,
 *       onValueChange = { name = it },
 *   )
 *
 *   FormInput(
 *       label = "Password",
 *       value = password,
 *       onValueChange = { password = it },
 *       isPassword = true,
 *       error = errors["password"],
 *   )
 *
 * @param label            Field label shown above the input.
 * @param value            Current text value.
 * @param onValueChange    Called with the new text on every keystroke.
 * @param modifier         Optional modifier applied to the outer column.
 * @param placeholder      Placeholder text shown when empty.
 * @param hint             Helper text shown under the input. Ignored when [error] is set.
 * @param error            Error message. When non-null, applies error styling and overrides [hint].
 * @param icon             Optional leading icon.
 * @param isPassword       When true, hides the input text and shows a password keyboard.
 * @param enabled          When false, the field is greyed out and non-interactive.
 * @param required         Shows a red asterisk next to the label. Purely visual.
 * @param fullWidth        Stretch to fill the container width. Defaults to true.
 * @param keyboardOptions  Keyboard configuration (type, IME action).
 * @param keyboardActions  IME action handlers (e.g. Done → submit).
 */
@Composable
fun FormInput(
    label: String? = null,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    hint: String? = null,
    error: String? = null,
    icon: ImageVector? = null,
    isPassword: Boolean = false,
    enabled: Boolean = true,
    required: Boolean = false,
    fullWidth: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val focused by interactionSource.collectIsFocusedAsState()

    // Colors — mirror Input.css.
    val borderColor = when {
        error != null -> Color(0xFFDC2626)
        focused -> PrimaryBlue
        else -> Color(0xFFB6CBE5)
    }
    val textColor = if (enabled) Color(0xFF1E293B) else Color(0xFF8AA3C0)
    val placeholderColor = Color(0xFF8AA3C0)
    val iconColor = Color(0xFF8AA3C0)
    val backgroundColor = if (enabled) Color.White else Color(0xFFF1F5FB)

    Column(
        modifier = modifier
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier)
            .alpha(if (enabled) 1f else 0.85f),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        // ----- Label -----
        if (label != null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = label,
                    fontSize = 12.8.sp, // 0.8rem
                    fontWeight = FontWeight.SemiBold,
                    color = PrimaryDarkBlue,
                )
                if (required) {
                    Text(
                        text = " *",
                        fontSize = 12.8.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFDC2626),
                    )
                }
            }
        }

        // ----- Field wrapper -----
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(40.dp)
                .background(backgroundColor, RoundedCornerShape(4.dp))
                .border(1.dp, borderColor, RoundedCornerShape(4.dp))
                .padding(horizontal = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(16.dp),
                )
            }

            Box(
                modifier = Modifier.weight(1f),
                contentAlignment = Alignment.CenterStart,
            ) {
                if (value.isEmpty() && placeholder != null) {
                    Text(
                        text = placeholder,
                        color = placeholderColor,
                        fontSize = 14.4.sp, // 0.9rem
                        maxLines = 1,
                    )
                }
                BasicTextField(
                    value = value,
                    onValueChange = onValueChange,
                    enabled = enabled,
                    singleLine = true,
                    textStyle = LocalTextStyle.current.merge(
                        TextStyle(
                            color = textColor,
                            fontSize = 14.4.sp, // 0.9rem
                        )
                    ),
                    cursorBrush = SolidColor(PrimaryBlue),
                    visualTransformation = if (isPassword) {
                        PasswordVisualTransformation()
                    } else {
                        VisualTransformation.None
                    },
                    keyboardOptions = keyboardOptions,
                    keyboardActions = keyboardActions,
                    interactionSource = interactionSource,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        // ----- Error / hint -----
        when {
            error != null -> Text(
                text = error,
                fontSize = 12.5.sp, // 0.78rem
                color = Color(0xFFDC2626),
                lineHeight = 17.5.sp,
            )
            hint != null -> Text(
                text = hint,
                fontSize = 12.5.sp, // 0.78rem
                color = SecondaryBlue,
                lineHeight = 17.5.sp,
            )
        }
    }
}