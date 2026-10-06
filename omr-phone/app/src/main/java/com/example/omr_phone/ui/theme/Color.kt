package com.example.omr_phone.ui.theme

import androidx.compose.ui.graphics.Color

// Primary brand colors (from React CSS)
val PrimaryBlue = Color(0xFF2563EB)          // #2563eb - main accent, hover, focus
val PrimaryDarkBlue = Color(0xFF1E3A5F)      // #1e3a5f - titles, name text
val SecondaryBlue = Color(0xFF4A688A)        // #4a688a - heading icon, ID text
val LightBlueBg = Color(0xFFEAF2FD)          // #eaf2fd - avatar background
val HoverBlueBg = Color(0xFFF8FBFF)          // #f8fbff - clickable hover background

// Neutral / surface colors
val White = Color(0xFFFFFFFF)                // #ffffff - item background
val BorderBlue = Color(0xFFE5EEFB)           // #e5eefb - item border

// Dark-mode neutrals
val DarkBackground  = Color(0xFF0F172A)
val DarkSurface     = Color(0xFF1E293B)
val DarkSurfaceVar  = Color(0xFF334155)
val DarkOnSurface   = Color(0xFFE5EEFB)
val DarkOutline     = Color(0xFF475569)
val DarkOnSurfaceVariant = Color(0xFF94A3B8)

// Semantic aliases
val Accent = PrimaryBlue
val TextPrimary = PrimaryDarkBlue
val TextSecondary = SecondaryBlue
val Surface = White
val SurfaceVariant = HoverBlueBg
val Outline = BorderBlue
val AvatarBackground = LightBlueBg