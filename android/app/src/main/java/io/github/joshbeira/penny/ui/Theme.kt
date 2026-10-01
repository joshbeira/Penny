package io.github.joshbeira.penny.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color

internal val Amber = Color(0xFFFFB703)
internal val Ink = Color(0xFF101418)
internal val Surface = Color(0xFF1C232B)
internal val Muted = Color(0xFFBCC4CF)
internal const val REPO = "https://github.com/joshbeira/Penny"
internal val pennyColors =
    darkColorScheme(
        primary = Amber,
        onPrimary = Ink,
        background = Ink,
        onBackground = Color(0xFFF5F2EB),
        surface = Surface,
        onSurface = Color(0xFFF5F2EB),
        surfaceVariant = Color(0xFF29333E),
        onSurfaceVariant = Muted,
        secondary = Amber,
        secondaryContainer = Color(0xFF4A3B16),
        onSecondaryContainer = Amber,
    )
