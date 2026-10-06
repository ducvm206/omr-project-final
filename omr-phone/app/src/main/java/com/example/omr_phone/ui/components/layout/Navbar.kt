package com.example.omr_phone.ui.components.layout

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.School
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.omr_phone.ui.theme.PrimaryBlue
import com.example.omr_phone.ui.theme.SecondaryBlue

/**
 * The three top-level destinations in the app.
 * Order here is the order they appear in the navbar.
 */
enum class NavbarTab(
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
) {
    Home(
        label = "Home",
        selectedIcon = Icons.Filled.Home,
        unselectedIcon = Icons.Outlined.Home,
    ),
    Courses(
        label = "Courses",
        selectedIcon = Icons.Filled.School,
        unselectedIcon = Icons.Outlined.School,
    ),
    Profile(
        label = "Profile",
        selectedIcon = Icons.Filled.Person,
        unselectedIcon = Icons.Outlined.Person,
    ),
}

/**
 * Bottom navigation bar with three tabs: Home, Courses, Profile.
 *
 * Mirrors the light-blue accent palette used elsewhere in the app.
 * Doesn't own navigation itself — the caller decides what
 * [onSelect] does (typically swaps the current screen).
 *
 *   Navbar(
 *       selected = currentTab,
 *       onSelect = { currentTab = it },
 *   )
 *
 * @param selected   The currently active tab.
 * @param onSelect   Called with the tab the user tapped.
 * @param modifier   Optional modifier.
 */
@Composable
fun Navbar(
    selected: NavbarTab,
    onSelect: (NavbarTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.White)
            .windowInsetsPadding(WindowInsets.navigationBars)
            .selectableGroup()
            .height(64.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        NavbarTab.entries.forEach { tab ->
            NavbarItem(
                tab = tab,
                isSelected = tab == selected,
                onClick = { onSelect(tab) },
                modifier = Modifier.weight(1f),
            )
        }
    }
}

/**
 * A single tappable tab item: icon on top, label below.
 */
@Composable
private fun NavbarItem(
    tab: NavbarTab,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val tint = if (isSelected) PrimaryBlue else SecondaryBlue
    val icon = if (isSelected) tab.selectedIcon else tab.unselectedIcon

    Column(
        modifier = modifier
            .fillMaxWidth()
            .selectable(
                selected = isSelected,
                onClick = onClick,
                role = Role.Tab,
            )
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = tab.label,
            tint = tint,
            modifier = Modifier.size(24.dp),
        )
        Text(
            text = tab.label,
            fontSize = 12.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            color = tint,
            modifier = Modifier.padding(top = 2.dp),
        )
    }
}