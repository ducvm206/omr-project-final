package com.example.omr_phone.ui.components.common

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.omr_phone.ui.theme.BorderBlue
import com.example.omr_phone.ui.theme.HoverBlueBg
import com.example.omr_phone.ui.theme.LightBlueBg
import com.example.omr_phone.ui.theme.PrimaryBlue
import com.example.omr_phone.ui.theme.PrimaryDarkBlue
import com.example.omr_phone.ui.theme.SecondaryBlue

/**
 * Visual variant — mirrors `ButtonVariant` in Button.tsx.
 * - Primary:   solid blue, main action
 * - Secondary: white with blue border, secondary action
 * - Danger:    solid red, destructive action
 * - Ghost:     no border/background, tertiary action
 */
enum class ButtonVariant { Primary, Secondary, Danger, Ghost }

/**
 * Size — mirrors `ButtonSize` in Button.tsx.
 * - Sm: compact, for table rows and inline actions
 * - Md: default
 * - Lg: prominent, e.g. submit on auth pages
 */
enum class ButtonSize { Sm, Md, Lg }

/**
 * Generic button.
 *
 * Mirrors the web `<Button>` API: variant, size, leading/trailing icons,
 * loading spinner, full-width, disabled state.
 *
 *   AppButton(text = "Save", onClick = { … })
 *   AppButton(text = "Cancel", variant = ButtonVariant.Secondary, onClick = { … })
 *   AppButton(text = "Delete", variant = ButtonVariant.Danger, loading = deleting, onClick = { … })
 *   AppButton(text = "New student", icon = Icons.Filled.Add, onClick = { … })
 *
 * @param text        Button label. Pass null if the button is icon-only.
 * @param onClick     Click handler. Not invoked while [loading] or [enabled] is false.
 * @param modifier    Optional modifier.
 * @param variant     Visual variant. Defaults to [ButtonVariant.Primary].
 * @param size        Size. Defaults to [ButtonSize.Md].
 * @param icon        Optional icon shown before the label.
 * @param iconRight   Optional icon shown after the label.
 * @param loading     Shows a spinner and disables the button.
 * @param fullWidth   Stretches the button to fill its container's width.
 * @param enabled     When false (or [loading] is true), the button is disabled.
 */
@Composable
fun AppButton(
    text: String? = null,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Primary,
    size: ButtonSize = ButtonSize.Md,
    icon: ImageVector? = null,
    iconRight: ImageVector? = null,
    loading: Boolean = false,
    fullWidth: Boolean = false,
    enabled: Boolean = true,
) {
    val isEnabled = enabled && !loading
    val interactionSource = remember { MutableInteractionSource() }
    val hovered by interactionSource.collectIsHoveredAsState()

    // Resolve colors for the current variant + hover + enabled state.
    val bg: Color
    val fg: Color
    val borderColor: Color

    when (variant) {
        ButtonVariant.Primary -> {
            bg = if (hovered && isEnabled) Color(0xFF1D4ED8) else PrimaryBlue
            fg = Color.White
            borderColor = bg
        }
        ButtonVariant.Secondary -> {
            bg = if (hovered && isEnabled) LightBlueBg else Color.White
            fg = if (hovered && isEnabled) Color(0xFF1D4ED8) else PrimaryDarkBlue
            borderColor = if (hovered && isEnabled) PrimaryBlue else Color(0xFFB6CBE5)
        }
        ButtonVariant.Danger -> {
            bg = if (hovered && isEnabled) Color(0xFFB91C1C) else Color(0xFFDC2626)
            fg = Color.White
            borderColor = bg
        }
        ButtonVariant.Ghost -> {
            bg = if (hovered && isEnabled) LightBlueBg else Color.Transparent
            fg = if (hovered && isEnabled) Color(0xFF1D4ED8) else PrimaryDarkBlue
            borderColor = Color.Transparent
        }
    }

    // Size → paddings + font + min height.
    val (padH: Dp, padV: Dp, fontSize: androidx.compose.ui.unit.TextUnit, minHeight: Dp) = when (size) {
        ButtonSize.Sm -> Quad(10.dp, 5.dp, 12.8.sp, 28.dp) // 0.3rem / 0.6rem / 0.8rem
        ButtonSize.Md -> Quad(14.dp, 7.dp, 14.4.sp, 36.dp) // 0.45rem / 0.9rem / 0.9rem
        ButtonSize.Lg -> Quad(19.dp, 10.dp, 16.sp, 44.dp)  // 0.6rem / 1.2rem / 1rem
    }

    val shape = RoundedCornerShape(4.dp)

    Row(
        modifier = modifier
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier)
            .height(minHeight)
            .defaultMinSize(minWidth = 0.dp)
            .background(bg, shape)
            .border(BorderStroke(1.dp, borderColor), shape)
            .alpha(if (isEnabled) 1f else 0.6f)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = isEnabled,
                role = Role.Button,
                onClick = onClick,
            )
            .padding(horizontal = padH, vertical = padV),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        when {
            loading -> {
                CircularProgressIndicator(
                    modifier = Modifier.size(14.dp),
                    strokeWidth = 2.dp,
                    color = fg,
                )
            }
            icon != null -> {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = fg,
                    modifier = Modifier.size(fontSize.value.dp + 2.dp),
                )
            }
        }

        if (text != null) {
            // Small gap between icon and label when an icon is present.
            val gapBefore = if (loading || icon != null) 6.dp else 0.dp
            androidx.compose.foundation.layout.Spacer(Modifier.size(gapBefore))
            Text(
                text = text,
                color = fg,
                fontSize = fontSize,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
            )
        }

        if (iconRight != null && !loading) {
            androidx.compose.foundation.layout.Spacer(Modifier.size(6.dp))
            Icon(
                imageVector = iconRight,
                contentDescription = null,
                tint = fg,
                modifier = Modifier.size(fontSize.value.dp + 2.dp),
            )
        }
    }
}

/** Tiny helper so the size `when` reads cleanly. */
private data class Quad<A, B, C, D>(val a: A, val b: B, val c: C, val d: D)
