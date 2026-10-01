package io.github.joshbeira.penny.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.joshbeira.penny.PennyState
import io.github.joshbeira.penny.PennyViewModel
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
internal fun Eyebrow(text: String) {
    Text(text, color = Amber, fontSize = 12.sp, letterSpacing = 1.sp)
}

@Composable
internal fun Heading(text: String) {
    Text(text, fontSize = 30.sp, lineHeight = 36.sp, fontWeight = FontWeight.Bold)
}

@Composable
internal fun Panel(content: @Composable ColumnScope.() -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(Surface, RoundedCornerShape(22.dp)).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        content = content,
    )
}

@Composable
internal fun Primary(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    Button(
        onClick,
        Modifier.fillMaxWidth().heightIn(min = 54.dp),
        enabled = enabled,
        contentPadding = PaddingValues(16.dp),
    ) {
        Text(text, fontSize = 17.sp)
    }
}

@Composable
internal fun Secondary(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    OutlinedButton(
        onClick,
        Modifier.fillMaxWidth().heightIn(min = 52.dp),
        enabled = enabled,
        contentPadding = PaddingValues(14.dp),
    ) {
        Text(text, fontSize = 16.sp)
    }
}

@Composable
internal fun Stat(value: String, label: String, modifier: Modifier) {
    Column(
        modifier.background(Surface, RoundedCornerShape(18.dp)).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(value, fontSize = 28.sp, color = Amber, fontWeight = FontWeight.Bold)
        Text(label, color = Muted, fontSize = 14.sp)
    }
}

@Composable
internal fun SwitchRow(
    title: String,
    detail: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit,
) {
    Panel {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(title, Modifier.weight(1f), fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Switch(
                checked,
                onChange,
                modifier =
                    Modifier.semantics {
                        this[androidx.compose.ui.semantics.SemanticsProperties.ContentDescription] =
                            listOf(title)
                    },
            )
        }
        Text(detail, color = Muted)
    }
}

@Composable
internal fun ReadingControls(state: PennyState, vm: PennyViewModel, stop: () -> Unit) {
    Column {
        Text("Text size · ${state.fontSize.toInt()}", color = Muted)
        Slider(
            value = state.fontSize,
            onValueChange = { vm.settings(fontSize = it) },
            valueRange = 18f..34f,
            steps = 7,
            modifier =
                Modifier.semantics {
                    this[androidx.compose.ui.semantics.SemanticsProperties.ContentDescription] =
                        listOf("Text size")
                },
        )
        Text("Reading speed · ${"%.1f".format(state.speechRate)}×", color = Muted)
        Slider(
            value = state.speechRate,
            onValueChange = {
                stop()
                vm.settings(rate = it)
            },
            valueRange = .5f..1.5f,
            steps = 9,
            modifier =
                Modifier.semantics {
                    this[androidx.compose.ui.semantics.SemanticsProperties.ContentDescription] =
                        listOf("Reading speed")
                },
        )
    }
}

internal fun displayDate(value: String): String =
    runCatching {
            DateTimeFormatter.ofPattern("d MMM yyyy")
                .withZone(ZoneId.systemDefault())
                .format(Instant.parse(value))
        }
        .getOrDefault(value)
