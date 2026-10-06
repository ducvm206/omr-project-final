package com.example.omr_phone.ui.components.common

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.omr_phone.ui.theme.PrimaryBlue
import com.example.omr_phone.ui.theme.PrimaryDarkBlue
import com.example.omr_phone.ui.theme.SecondaryBlue

/**
 * Visual variant — mirrors `variant` in Card.tsx.
 * - Default:  bordered white card
 * - Outlined: same as Default (kept for API symmetry)
 * - Flat:     no border, soft background (#f5f8fd)
 * - Plain:    no border, no background
 */
enum class CardVariant { Default, Outlined, Flat, Plain }

/**
 * Padding preset — mirrors `padding` in Card.tsx.
 * - None: 0
 * - Sm:   0.5rem / 0.75rem
 * - Md:   0.9rem / 1rem  (default)
 * - Lg:   1.25rem / 1.5rem
 */
enum class CardPadding { None, Sm, Md, Lg }

/**
 * Generic card container.
 *
 * Mirrors the web `<Card>` API: title, subtitle, icon, actions, footer,
 * variant, padding, onClick, disabled.
 *
 *   AppCard(title = "Students") { Text("…") }
 *
 *   AppCard(
 *       title = "Math 101",
 *       subtitle = "2025–2026",
 *       actions = { IconButton(...) },
 *   ) { Text("…") }
 *
 *   AppCard(
 *       variant = CardVariant.Flat,
 *       onClick = { navigate(…) },
 *   ) { Text("Clickable card") }
 *
 * @param title     Optional title shown in the header.
 * @param subtitle  Optional subtitle shown under the title.
 * @param icon      Optional icon shown to the left of the title.
 * @param actions   Optional composable slot shown to the right of the header.
 * @param footer    Optional footer composable. Rendered below a top divider.
 * @param variant   Visual variant. Defaults to [CardVariant.Default].
 * @param padding   Padding preset. Defaults to [CardPadding.Md].
 * @param onClick   Makes the card clickable. Ignored when [disabled] is true.
 * @param disabled  Disables click interaction and dims the card.
 * @param modifier  Optional modifier.
 * @param content   Card body content.
 */
@Composable
fun AppCard(
    title: String? = null,
    subtitle: String? = null,
    icon: ImageVector? = null,
    actions: (@Composable () -> Unit)? = null,
    footer: (@Composable () -> Unit)? = null,
    variant: CardVariant = CardVariant.Default,
    padding: CardPadding = CardPadding.Md,
    onClick: (() -> Unit)? = null,
    disabled: Boolean = false,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit = {},
) {
    val shape = RoundedCornerShape(6.dp)
    val clickable = onClick != null && !disabled

    val interactionSource = remember { MutableInteractionSource() }
    val hovered by interactionSource.collectIsHoveredAsState()

    // Background + border per variant (mirrors Card.css).
    val background: Color = when (variant) {
        CardVariant.Default, CardVariant.Outlined -> Color.White
        CardVariant.Flat -> Color(0xFFF5F8FD)
        CardVariant.Plain -> Color.Transparent
    }
    val baseBorder: Color? = when (variant) {
        CardVariant.Default, CardVariant.Outlined -> Color(0xFFCFE0F5)
        CardVariant.Flat, CardVariant.Plain -> null
    }

    // Hover swaps the border to PrimaryBlue — only when clickable + enabled.
    val borderColor: Color? = when {
        clickable && hovered -> PrimaryBlue
        else -> baseBorder
    }

    // Padding per preset.
    val (padH: Dp, padV: Dp) = when (padding) {
        CardPadding.None -> 0.dp to 0.dp
        CardPadding.Sm -> 12.dp to 8.dp   // 0.5rem / 0.75rem
        CardPadding.Md -> 16.dp to 14.dp  // 0.9rem / 1rem
        CardPadding.Lg -> 24.dp to 20.dp  // 1.25rem / 1.5rem
    }

    val hasHeader = title != null || subtitle != null || icon != null || actions != null

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(background, shape)
            .then(
                if (borderColor != null) {
                    Modifier.border(BorderStroke(1.dp, borderColor), shape)
                } else {
                    Modifier
                }
            )
            .then(
                if (clickable) {
                    Modifier.clickable(
                        interactionSource = interactionSource,
                        indication = null,
                        role = Role.Button,
                        onClick = onClick!!,
                    )
                } else {
                    Modifier
                }
            )
            .alpha(if (disabled) 0.6f else 1f)
            .padding(horizontal = padH, vertical = padV),
    ) {
        // ----- Header -----
        if (hasHeader) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (icon != null) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = PrimaryBlue,
                        modifier = Modifier
                            .padding(top = 2.dp)
                            .size(18.dp),
                    )
                }

                Column(modifier = Modifier.weight(1f)) {
                    if (title != null) {
                        Text(
                            text = title,
                            fontSize = 16.sp, // 1rem
                            fontWeight = FontWeight.SemiBold,
                            color = PrimaryDarkBlue,
                            lineHeight = 20.sp,
                        )
                    }
                    if (subtitle != null) {
                        Spacer(Modifier.size(2.dp))
                        Text(
                            text = subtitle,
                            fontSize = 12.8.sp, // 0.8rem
                            color = SecondaryBlue,
                            lineHeight = 17.sp,
                        )
                    }
                }

                if (actions != null) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        actions()
                    }
                }
            }
            // Header → body gap (0.6rem).
            Spacer(Modifier.size(10.dp))
        }

        // ----- Body -----
        content()

        // ----- Footer -----
        if (footer != null) {
            Spacer(Modifier.size(12.dp))
            androidx.compose.material3.HorizontalDivider(
                color = Color(0xFFE5EEFB),
                thickness = 1.dp,
            )
            Spacer(Modifier.size(10.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                footer()
            }
        }
    }
}