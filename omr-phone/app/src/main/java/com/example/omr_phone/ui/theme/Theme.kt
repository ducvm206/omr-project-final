package com.example.omr_phone.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary          = PrimaryBlue,
    onPrimary        = White,
    secondary        = SecondaryBlue,
    onSecondary      = White,
    background       = DarkBackground,
    onBackground     = DarkOnSurface,
    surface          = DarkSurface,
    onSurface        = DarkOnSurface,
    surfaceVariant   = DarkSurfaceVar,
    onSurfaceVariant = DarkOnSurfaceVariant,
    outline          = DarkOutline,
)

private val LightColorScheme = lightColorScheme(
    primary          = PrimaryBlue,
    onPrimary        = White,
    secondary        = SecondaryBlue,
    onSecondary      = White,
    background       = White,
    onBackground     = PrimaryDarkBlue,
    surface          = White,
    onSurface        = PrimaryDarkBlue,
    surfaceVariant   = HoverBlueBg,
    onSurfaceVariant = SecondaryBlue,
    outline          = BorderBlue,
)

@Composable
fun OmrphoneTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}