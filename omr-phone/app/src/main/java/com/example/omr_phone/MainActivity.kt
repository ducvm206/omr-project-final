package com.example.omr_phone

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.omr_phone.data.api.RetrofitClient
import com.example.omr_phone.data.repository.AuthRepository
import com.example.omr_phone.data.repository.UserRepository
import com.example.omr_phone.ui.components.layout.Navbar
import com.example.omr_phone.ui.components.layout.NavbarTab
import com.example.omr_phone.ui.screens.login.LoginScreen
import com.example.omr_phone.ui.screens.main.HomeScreen
import com.example.omr_phone.ui.screens.main.ProfileScreen
import com.example.omr_phone.ui.theme.OmrphoneTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            OmrphoneTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFFF8FBFF),
                ) {
                    AppRoot()
                }
            }
        }
    }
}

/**
 * Root of the app. Owns the auth state and swaps between the login
 * screen and the authenticated shell.
 */
@Composable
private fun AppRoot() {
    // Singletons for the whole composition — created once, shared
    // across every tab.
    val authRepository = remember { AuthRepository(RetrofitClient.api) }
    val userRepository = remember { UserRepository(RetrofitClient.api) }

    // Auth state. Starts logged out; flips to true on successful login.
    // Flips back to false when ProfileScreen's logout completes.
    var isAuthenticated by remember { mutableStateOf(false) }

    if (!isAuthenticated) {
        LoginScreen(
            authRepository = authRepository,
            onSuccess = { isAuthenticated = true },
        )
    } else {
        AuthenticatedShell(
            authRepository = authRepository,
            userRepository = userRepository,
            onLogout = { isAuthenticated = false },
        )
    }
}

/**
 * The logged-in shell: a Scaffold with the three-tab [Navbar] at the
 * bottom and the active tab's screen filling the rest.
 *
 * @param authRepository Shared AuthRepository — used by ProfileScreen
 *                       for the logout call.
 * @param userRepository Shared UserRepository — used by HomeScreen and
 *                       ProfileScreen so both see consistent data.
 * @param onLogout       Invoked after ProfileScreen's logout completes.
 *                       Clears the auth flag at the [AppRoot] level.
 */
@Composable
private fun AuthenticatedShell(
    authRepository: AuthRepository,
    userRepository: UserRepository,
    onLogout: () -> Unit,
) {
    var currentTab by remember { mutableStateOf(NavbarTab.Home) }

    Scaffold(
        bottomBar = {
            Navbar(
                selected = currentTab,
                onSelect = { currentTab = it },
            )
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            when (currentTab) {
                NavbarTab.Home -> HomeScreen(
                    userRepository = userRepository,
                    onOpenCourses = { currentTab = NavbarTab.Courses },
                    onOpenExams = {
                        // TODO: navigate to Exams. Since Exams is reached
                        // via a course, this may want to push into
                        // Courses first, or open a dedicated exams list.
                    },
                    onOpenGrading = {
                        // TODO: navigate to Grading. Currently grading
                        // happens inside an exam, so this may want to
                        // open Courses as well.
                    },
                )

                NavbarTab.Courses -> PlaceholderScreen(
                    title = "Courses",
                    message = "Course list coming soon.",
                )

                NavbarTab.Profile -> ProfileScreen(
                    userRepository = userRepository,
                    authRepository = authRepository,
                    onLoggedOut = onLogout,
                )
            }
        }
    }
}

/**
 * Temporary screen used until Courses is built.
 * Keeps the navbar testable end-to-end.
 */
@Composable
private fun PlaceholderScreen(
    title: String,
    message: String,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = title,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(text = message)
    }
}

@Preview(showBackground = true, widthDp = 400, heightDp = 800)
@Composable
fun HomePreview() {
    OmrphoneTheme {
        HomeScreen(
            userRepository = remember { UserRepository(RetrofitClient.api) },
        )
    }
}