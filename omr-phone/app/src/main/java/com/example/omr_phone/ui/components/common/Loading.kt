package com.example.omr_phone.ui.components.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.omr_phone.ui.theme.PrimaryBlue
import com.example.omr_phone.ui.theme.SecondaryBlue

/**
 * Size preset — mirrors the `size` prop on the web `<Loading>` component.
 * - Sm: inline, e.g. next to a form or inside a button row.
 * - Md: default, e.g. section-level loading indicator.
 * - Lg: full-screen or prominent loading indicator.
 */
enum class LoadingSize { Sm, Md, Lg }

/**
 * Loading indicator with an optional message.
 *
 * Mirrors the web `<Loading>` component: size presets, optional message,
 * and a full-screen variant that centers itself in its container.
 *
 *   Loading()                                    // default md, no message
 *   Loading(size = LoadingSize.Sm, message = "Saving…")
 *   Loading(fullscreen = true)                   // fills and centers
 *
 * @param modifier   Optional modifier.
 * @param size       Size preset. Defaults to [LoadingSize.Md].
 * @param message    Optional caption shown under the spinner.
 * @param color      Spinner (and message) color. Defaults to the app's primary blue.
 * @param fullscreen When true, expands to fill the container and centers
 *                   both the spinner and the message.
 */
@Composable
fun Loading(
    modifier: Modifier = Modifier,
    size: LoadingSize = LoadingSize.Md,
    message: String? = null,
    color: Color = PrimaryBlue,
    fullscreen: Boolean = false,
) {
    val spinnerSize: Dp
    val strokeWidth: Dp
    val gap: Dp
    val messageSize: Int

    when (size) {
        LoadingSize.Sm -> {
            spinnerSize = 16.dp
            strokeWidth = 2.dp
            gap = 6.dp
            messageSize = 12
        }
        LoadingSize.Md -> {
            spinnerSize = 28.dp
            strokeWidth = 3.dp
            gap = 10.dp
            messageSize = 13
        }
        LoadingSize.Lg -> {
            spinnerSize = 40.dp
            strokeWidth = 4.dp
            gap = 14.dp
            messageSize = 14
        }
    }

    // Layout: row when inline + message present, column otherwise.
    // Web `<Loading>` typically stacks spinner over message; we keep
    // that for the default/fullscreen case, and go horizontal for Sm.
    val isHorizontal = size == LoadingSize.Sm && message != null

    if (fullscreen) {
        Box(
            modifier = modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            LoadingContent(
                spinnerSize = spinnerSize,
                strokeWidth = strokeWidth,
                gap = gap,
                messageSize = messageSize,
                color = color,
                message = message,
                horizontal = false,
            )
        }
    } else {
        LoadingContent(
            spinnerSize = spinnerSize,
            strokeWidth = strokeWidth,
            gap = gap,
            messageSize = messageSize,
            color = color,
            message = message,
            horizontal = isHorizontal,
            modifier = modifier,
        )
    }
}

@Composable
private fun LoadingContent(
    spinnerSize: Dp,
    strokeWidth: Dp,
    gap: Dp,
    messageSize: Int,
    color: Color,
    message: String?,
    horizontal: Boolean,
    modifier: Modifier = Modifier,
) {
    val spinner: @Composable () -> Unit = {
        CircularProgressIndicator(
            modifier = Modifier.size(spinnerSize),
            strokeWidth = strokeWidth,
            color = color,
        )
    }

    val label: @Composable () -> Unit = {
        if (message != null) {
            Text(
                text = message,
                fontSize = messageSize.sp,
                color = color,
                textAlign = TextAlign.Center,
            )
        }
    }

    if (horizontal) {
        Row(
            modifier = modifier,
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(gap),
        ) {
            spinner()
            label()
        }
    } else {
        Column(
            modifier = modifier,
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(gap),
        ) {
            spinner()
            label()
        }
    }
}