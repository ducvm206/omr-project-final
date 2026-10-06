package com.example.omr_phone.ui.screens.main

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.omr_phone.data.repository.UserRepository
import com.example.omr_phone.ui.components.common.AppCard
import com.example.omr_phone.ui.components.common.CardPadding
import com.example.omr_phone.ui.components.common.CardVariant
import com.example.omr_phone.ui.theme.PrimaryDarkBlue
import com.example.omr_phone.ui.theme.SecondaryBlue

/**
 * One entry in the home grid. Mirrors one `<Card variant="flat">` in Home.tsx.
 */
private data class HomeCard(
    val title: String,
    val subtitle: String,
    val body: String,
    val onClick: () -> Unit,
)

/**
 * Home screen — the default authenticated landing page.
 *
 * Greets the user by their real name (fetched from [userRepository]) and
 * shows quick access to Courses, Exams, and Grading. Student-result details
 * are intentionally omitted; grading is the only "action" surface exposed here.
 *
 * @param userRepository Source of the authenticated user's profile.
 * @param onOpenCourses  Called when the "Courses" card is tapped.
 * @param onOpenExams    Called when the "Exams" card is tapped.
 * @param onOpenGrading  Called when the "Grading" card is tapped.
 */
@Composable
fun HomeScreen(
    userRepository: UserRepository,
    onOpenCourses: () -> Unit = {},
    onOpenExams: () -> Unit = {},
    onOpenGrading: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    // Holds the display name once loaded. Null until then; the greeting
    // falls back to "there" while loading and on failure.
    var displayName by remember { mutableStateOf<String?>(null) }

    // Fetch the user once when the screen first composes.
    LaunchedEffect(userRepository) {
        userRepository.getCurrentUser()
            .onSuccess { user ->
                // Prefer fullName, fall back to userName — same precedence
                // as the web Home.tsx (user?.fullName || user?.userName).
                displayName = user.fullName?.takeIf { it.isNotBlank() }
                    ?: user.userName.takeIf { it.isNotBlank() }
            }
            .onFailure {
                // Leave displayName null → greeting renders "there".
                // If you want to surface an error, do it here.
            }
    }

    val greeting = displayName ?: "there"

    val cards = listOf(
        HomeCard(
            title = "Courses",
            subtitle = "Classes and groups",
            body = "Organize students into courses and manage enrollments.",
            onClick = onOpenCourses,
        ),
        HomeCard(
            title = "Exams",
            subtitle = "Assessments",
            body = "Browse the exams defined for each course.",
            onClick = onOpenExams,
        ),
        HomeCard(
            title = "Grading",
            subtitle = "Score answer sheets",
            body = "Upload scanned answer sheets and grade them automatically.",
            onClick = onOpenGrading,
        ),
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8FBFF))
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        // ----- Hero -----
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = "Welcome, $greeting",
                fontSize = 25.6.sp, // 1.6rem
                fontWeight = FontWeight.Bold,
                color = PrimaryDarkBlue,
            )
            Text(
                text = "Browse courses, review exams, and grade answer sheets.",
                fontSize = 14.4.sp, // 0.9rem
                color = SecondaryBlue,
            )
        }

        // ----- Grid -----
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 220.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            items(cards) { card ->
                HomeCardItem(card)
            }
        }
    }
}

/**
 * One card in the home grid, using the shared [AppCard] component.
 * Matches the web `<Card variant="flat">` usage from Home.tsx.
 */
@Composable
private fun HomeCardItem(card: HomeCard) {
    AppCard(
        title = card.title,
        subtitle = card.subtitle,
        variant = CardVariant.Flat,
        padding = CardPadding.Md,
        onClick = card.onClick,
    ) {
        Text(
            text = card.body,
            fontSize = 14.4.sp,
            lineHeight = 21.6.sp,
            color = Color(0xFF1E293B),
        )
    }
}
