package io.github.joshbeira.penny

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.background
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import io.github.joshbeira.penny.core.Receipt
import io.github.joshbeira.penny.data.PennyStore
import io.github.joshbeira.penny.data.SavedLetter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val Amber = Color(0xFFFFB703)
private val Ink = Color(0xFF101418)
private val Surface = Color(0xFF1C232B)
private val Muted = Color(0xFFBCC4CF)
private const val REPO = "https://github.com/joshbeira/Penny"
private val pennyColors = darkColorScheme(primary = Amber, onPrimary = Ink, background = Ink,
    onBackground = Color(0xFFF5F2EB), surface = Surface, onSurface = Color(0xFFF5F2EB),
    surfaceVariant = Color(0xFF29333E), onSurfaceVariant = Muted, secondary = Amber)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { MaterialTheme(colorScheme = pennyColors) { PennyApp() } }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PennyApp(vm: PennyViewModel = viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val lifecycle = LocalLifecycleOwner.current
    val haptics = LocalHapticFeedback.current
    var page by rememberSaveable { mutableStateOf("Home") }
    // Document contents deliberately stay out of Android saved-instance-state bundles.
    var export by remember { mutableStateOf("") }
    var cameraPath by rememberSaveable { mutableStateOf<String?>(null) }
    var showSave by remember { mutableStateOf(false) }
    var saveTitle by remember { mutableStateOf("") }
    var deleteLetter by remember { mutableStateOf<SavedLetter?>(null) }
    var confirm by remember { mutableStateOf<String?>(null) }
    val speech = remember { SpeechReader(context, vm::message) }
    val sounds = remember { PracticeSounds() }
    val currentState by rememberUpdatedState(state)
    val commands = remember { VoiceCommands(context, vm::message) { words ->
        speech.stop(); sounds.stop()
        when {
            words.contains("stop") -> vm.message("Reading stopped.")
            words.contains("home") -> { page = "Home"; vm.message("Home") }
            words.contains("library") -> { page = "Library"; vm.message("Your letter library") }
            words.contains("settings") -> { page = "Settings"; vm.message("Settings") }
            words.contains("bank") -> { page = "Practice"; vm.message("Banking sandbox · sample data") }
            words.contains("receipt") -> { page = "Receipts"; vm.message("Action receipts") }
            words.contains("read aloud") -> speech.read(currentState.text, currentState.speechRate, currentState.quiet)
            words.contains("read") || words.contains("letter") -> { page = "Read"; vm.message("Letter reader") }
            else -> vm.message("Command not recognised. Try home, read a letter, library, settings, banking or stop.")
        }
    } }
    val microphone = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { allowed ->
        if (allowed) commands.start() else vm.message("Microphone access was not granted. You can use every on-screen control.")
    }
    DisposableEffect(lifecycle, speech, commands, sounds) {
        val observer = LifecycleEventObserver { _, event -> if (event == Lifecycle.Event.ON_STOP) { speech.stop(); commands.stop(); sounds.stop() } }
        lifecycle.lifecycle.addObserver(observer)
        onDispose { lifecycle.lifecycle.removeObserver(observer); speech.close(); commands.stop(); sounds.stop() }
    }
    fun navigate(next: String) { speech.stop(); commands.stop(); sounds.stop(); page = next; vm.message("") }
    BackHandler(page != "Home") { navigate("Home") }
    fun openUrl(url: String) {
        try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
        catch (_: ActivityNotFoundException) { vm.message("No browser is available on this device.") }
    }
    val exportFile = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/plain")) { uri ->
        val contents = export
        export = ""
        if (uri != null) scope.launch {
            try {
                withContext(Dispatchers.IO) { context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { it.write(contents) } ?: error("No file") }
                vm.message("Export saved to your chosen location.")
            } catch (_: Exception) { vm.message("Export could not be saved. Try another location.") }
        }
    }
    fun download(name: String, text: String) { export = text; exportFile.launch(name) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) { speech.stop(); vm.readPhoto(uri) }
    }
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        val file = cameraPath?.let(::File)
        cameraPath = null
        if (success && file != null) {
            speech.stop()
            vm.readPhoto(FileProvider.getUriForFile(context, "${context.packageName}.files", file), file)
        } else file?.delete()
    }
    fun takePhoto() {
        val dir = File(context.cacheDir, "camera").apply { mkdirs() }
        val file = File.createTempFile("letter-", ".jpg", dir)
        cameraPath = file.absolutePath
        try { camera.launch(FileProvider.getUriForFile(context, "${context.packageName}.files", file)) }
        catch (_: ActivityNotFoundException) { file.delete(); cameraPath = null; vm.message("No camera app is available. Choose a photo instead.") }
    }
    Scaffold(
        containerColor = Ink,
        topBar = { TopAppBar(title = { Text("penny", fontWeight = FontWeight.Bold, color = Amber, fontSize = 28.sp) },
            actions = { Text("ON YOUR DEVICE", color = Muted, fontSize = 11.sp, modifier = Modifier.padding(end = 20.dp)) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Ink)) },
        bottomBar = { NavigationBar(containerColor = Surface) {
            listOf("Home" to "○", "Read" to "▤", "Library" to "▥", "Settings" to "⚙").forEach { (name, icon) ->
                NavigationBarItem(selected = page == name, onClick = { navigate(name) },
                    icon = { Text(icon, fontSize = 23.sp) }, label = { Text(name) })
            }
        } },
    ) { padding ->
        val scroll = remember(page) { ScrollState(0) }
        Column(Modifier.fillMaxSize().padding(padding).imePadding().verticalScroll(scroll)
            .padding(horizontal = 22.dp, vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            if (state.message.isNotBlank()) Text(state.message, color = Amber, modifier = Modifier.fillMaxWidth()
                .semantics { liveRegion = LiveRegionMode.Polite }.background(Surface, RoundedCornerShape(12.dp)).padding(14.dp))
            when (page) {
                "Home" -> {
                    Eyebrow("EVERY LETTER. A LITTLE CLEARER.")
                    Text("A little clarity.\nA lot more independence.", fontSize = 36.sp, lineHeight = 41.sp, fontWeight = FontWeight.Bold)
                    Text("Read everyday letters with your eyes, your ears, or both. Your pace. Your device.", color = Muted, fontSize = 18.sp)
                    Primary("Read a letter") { navigate("Read") }
                    Panel {
                        Text("Private by design", fontWeight = FontWeight.Bold, fontSize = 22.sp)
                        Text("No account. No photo uploads. Letter recognition works offline from the first launch.", color = Muted)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Stat("${state.letters.size}", "Saved letters", Modifier.weight(1f))
                        Stat("100%", "On-device OCR", Modifier.weight(1f))
                    }
                    Secondary("Open your library") { navigate("Library") }
                    Panel {
                        Eyebrow("EXPLORE ACCESSIBLE BANKING")
                        Text("Practise with confidence.", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                        Text("Try spoken account updates, payment confirmations, card orders and checkable receipts. All banking data is sample data.", color = Muted)
                        Secondary("Open banking sandbox") { navigate("Practice") }
                    }
                    TextButton(onClick = { openUrl("$REPO/issues/new?template=feedback.yml") }) { Text("Help shape Penny · share feedback") }
                }
                "Read" -> {
                    Eyebrow("YOUR POST, AT YOUR PACE")
                    Heading("Make the small print speak.")
                    Text("Photograph a printed English letter or choose a photo. Check names, dates and amounts against the original.", color = Muted)
                    Primary("Photograph a letter", !state.busy) { takePhoto() }
                    Secondary("Choose a photo", !state.busy) { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }
                    Secondary("Try a sample letter", !state.busy) { speech.stop(); vm.sample() }
                    if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                    Text(if (state.maskNumbers) "Number masking is on. It can also hide dates. Change this in Settings before your next photo." else "Number masking is off. Review personal details before saving or sharing.", color = Muted, fontSize = 14.sp)
                    Text("${state.source.ifBlank { "Paste or type a letter" }} · ${state.text.length}/16,000", color = Amber)
                    OutlinedTextField(value = state.text, onValueChange = { speech.stop(); vm.edit(it) },
                        label = { Text("Letter text · tap to correct") }, modifier = Modifier.fillMaxWidth(), minLines = 6,
                        enabled = !state.busy, textStyle = LocalTextStyle.current.copy(fontSize = state.fontSize.sp, lineHeight = (state.fontSize * 1.55f).sp))
                    ReadingControls(state, vm) { speech.stop() }
                    Primary("Read aloud", state.text.isNotBlank() && !state.busy) { speech.read(state.text, state.speechRate, state.quiet) }
                    Secondary("Stop reading") { speech.stop(); vm.message("Reading stopped.") }
                    Secondary("Save to library", state.text.isNotBlank() && !state.busy) {
                        saveTitle = state.text.lineSequence().firstOrNull()?.take(100).orEmpty(); showSave = true
                    }
                    Secondary("Export text", state.text.isNotBlank()) { download("penny-letter.txt", state.text) }
                    Secondary("Share text", state.text.isNotBlank()) {
                        try { context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, state.text) }, "Share reviewed letter text")) }
                        catch (_: ActivityNotFoundException) { vm.message("No sharing app is available. Use Export text instead.") }
                    }
                    TextButton(onClick = { speech.stop(); vm.clear() }, enabled = !state.busy) { Text("Clear letter") }
                    Text("Only Save to library keeps a letter after you close Penny. Sharing and exporting copy the text to your chosen app or location.", color = Muted, fontSize = 14.sp)
                }
                "Library" -> {
                    Eyebrow("YOUR WORDS, KEPT CLOSE")
                    Heading("Your letter library")
                    Text("Saved only on this device. Photos are never saved in your library. Clearing app data or uninstalling Penny removes these letters.", color = Muted)
                    var query by rememberSaveable { mutableStateOf("") }
                    var onlyFavourites by rememberSaveable { mutableStateOf(false) }
                    OutlinedTextField(value = query, onValueChange = { query = it }, label = { Text("Search letters") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    FilterChip(selected = onlyFavourites, onClick = { onlyFavourites = !onlyFavourites }, label = { Text("Favourites only") })
                    val matches = state.letters.filter { (!onlyFavourites || it.favourite) && (it.title.contains(query, true) || it.text.contains(query, true)) }
                    if (matches.isEmpty()) Panel {
                        Text(if (state.letters.isEmpty()) "Your next letter belongs here." else "No matching letters.", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                        Text("Save a reading to find it again, even without an internet connection.", color = Muted)
                        Secondary("Read a letter") { navigate("Read") }
                    }
                    matches.forEach { letter -> key(letter.id) { Panel {
                        Text(letter.title, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                        Text("${if (letter.favourite) "Favourite · " else ""}${displayDate(letter.savedAt)}", color = Muted)
                        Text(letter.text.take(140), maxLines = 3, color = Muted)
                        Primary("Open letter") { navigate("Read"); vm.open(letter) }
                        Secondary(if (letter.favourite) "Remove favourite" else "Add favourite") { vm.favourite(letter) }
                        TextButton(onClick = { deleteLetter = letter }) { Text("Delete ${letter.title}") }
                    } } }
                    if (state.letters.isNotEmpty()) Secondary("Export library") { download("penny-library.json", PennyStore.exportLetters(state.letters)) }
                }
                "Practice" -> {
                    Eyebrow("BANKING SANDBOX · SAMPLE DATA")
                    Heading("Hear the bigger picture.")
                    Text("Practise accessible banking interactions. Penny does not connect to a bank, move money or order real cards.", color = Muted)
                    Panel {
                        Text("Sample current account", color = Muted)
                        Text("£1,420.50", fontSize = 40.sp, fontWeight = FontWeight.Bold)
                        Text("Comfortable", color = Amber, fontSize = 24.sp)
                        Text("Two sample bills this week · £84.00", color = Muted)
                        Primary("Play the Glance") {
                            haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                            speech.read("Sample account. Balance one thousand four hundred and twenty pounds, fifty pence. Comfortable. Two sample bills this week, eighty-four pounds.", state.speechRate, state.quiet)
                        }
                        Secondary("Read my sample week") { speech.read("Sample week. Monday, groceries, thirty-two pounds forty out. Tuesday, pension, two hundred and thirty pounds in. Wednesday, unfamiliar merchant, seventy-nine pounds out. This sample payment is marked unusual for you to review.", state.speechRate, state.quiet) }
                        Secondary("Play my week as sounds") { speech.stop(); sounds.playWeek(); vm.message("Sample sounds: one beep for groceries out, rising tones for pension in, and a lower alert for the unusual payment.") }
                        Secondary("Stop reading") { speech.stop(); sounds.stop() }
                    }
                    Heading("This sample week")
                    Text("Monday · Groceries · −£32.40\nTuesday · Pension · +£230.00\nWednesday · Unfamiliar merchant · −£79.00", lineHeight = 30.sp)
                    Panel {
                        Text("Unusual sample payment", color = Amber, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                        Text("Unfamiliar merchant · £79.00. Review before confirming a practice action.", color = Muted)
                        Secondary("Practise flagging a payment") { confirm = "flag" }
                    }
                    Secondary("Practise ordering a replacement card") { confirm = "card" }
                    Secondary("Inspect action receipts (${state.receipts.size})") { navigate("Receipts") }
                    Secondary("Explore reading modes") { navigate("Journey") }
                }
                "Receipts" -> {
                    Eyebrow("TRANSPARENT PRACTICE ACTIONS")
                    Heading("Action receipts")
                    Text("Every confirmed practice action links to the previous receipt using SHA-256. Verification checks consistency; it cannot prove that a complete history has not been rewritten.", color = Muted)
                    Text(if (Receipt.verify(state.receipts)) "Chain verified · ${state.receipts.size} receipts" else "Verification failed · history has changed", color = Amber)
                    if (state.receipts.isEmpty()) Text("Confirm a practice action in the banking sandbox to create your first receipt.")
                    state.receipts.asReversed().forEach { r -> Panel {
                        Text(r.action, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                        Text(r.details)
                        Text(displayDate(r.ts), color = Muted)
                        SelectionContainer { Text("SHA-256\n${r.hash}", fontSize = 12.sp, color = Muted) }
                    } }
                    Secondary("Export receipts", state.receipts.isNotEmpty()) { download("penny-receipts.json", PennyStore.exportReceipts(state.receipts)) }
                    TextButton(onClick = { confirm = "receipts" }, enabled = state.receipts.isNotEmpty()) { Text("Delete all receipts") }
                    Secondary("Back to banking sandbox") { navigate("Practice") }
                }
                "Journey" -> {
                    Eyebrow("ACCESSIBLE INTERACTION EXPLORER")
                    Heading("One account. Different ways to read.")
                    Text("Explore the same sample account as detailed text, a large overview or spoken feedback. These are interface choices, not a simulation of anyone’s sight.", color = Muted)
                    var mode by rememberSaveable { mutableStateOf("Overview") }
                    listOf("Detail", "Overview", "Listen").forEach { choice -> FilterChip(selected = mode == choice, onClick = { speech.stop(); mode = choice }, label = { Text(choice) }) }
                    Panel {
                        when (mode) {
                            "Detail" -> Text("Sample current account\nBalance £1,420.50\nGroceries −£32.40\nPension +£230.00\nUnfamiliar merchant −£79.00\nTwo sample bills this week: £84.00", lineHeight = 32.sp)
                            "Overview" -> { Text("£1,420.50", fontSize = 40.sp); Text("Comfortable", fontSize = 32.sp, color = Amber); Text("Two sample bills · £84.00") }
                            else -> { Text("Comfortable", fontSize = 32.sp, color = Amber); Primary("Read account overview") { speech.read("Sample account. One thousand four hundred and twenty pounds, fifty pence. Comfortable. Two bills this week, eighty-four pounds.", state.speechRate, state.quiet) }; Secondary("Stop reading") { speech.stop() } }
                        }
                    }
                    Secondary("Back to banking sandbox") { navigate("Practice") }
                }
                "Settings" -> {
                    Eyebrow("MAKE PENNY YOURS")
                    Heading("Your reading preferences")
                    ReadingControls(state, vm) { speech.stop() }
                    SwitchRow("Quiet Mode", "Show feedback as text and keep Penny’s speech silent.", state.quiet) { speech.stop(); vm.settings(quiet = it) }
                    SwitchRow("Mask number sequences", "For new photos only. Hides long numbers and sort codes; may hide dates and miss personal details.", state.maskNumbers) { vm.settings(mask = it) }
                    Secondary("Android speech settings") {
                        try { context.startActivity(Intent("com.android.settings.TTS_SETTINGS")) }
                        catch (_: ActivityNotFoundException) { vm.message("Open your phone’s Settings and search for text-to-speech.") }
                    }
                    Text("Voice navigation uses Android’s on-device recognizer on supported Android 12+ devices. It listens once per tap and never switches to cloud recognition.", color = Muted, fontSize = 14.sp)
                    Panel {
                        Text("Your privacy, in plain English", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                        Text("Penny’s Android app has no internet permission, accounts, ads or analytics. The OCR model is bundled. Speech uses an installed offline English voice. Save letters only when you want to keep them.", color = Muted)
                        Text("Photos taken inside Penny use temporary app storage and are removed after reading. Existing photos stay in your photo library. Saved text is app-private, is excluded from backups, and is not separately encrypted by Penny.", color = Muted)
                    }
                    Secondary("Banking sandbox") { navigate("Practice") }
                    Secondary("Share feedback") { openUrl("$REPO/issues/new?template=feedback.yml") }
                    Secondary("Privacy and user guide") { openUrl("$REPO/blob/main/docs/ANDROID.md") }
                    Secondary("Check for updates") { openUrl("$REPO/releases/latest") }
                    TextButton(onClick = { confirm = "library" }, enabled = state.letters.isNotEmpty()) { Text("Delete all saved letters") }
                    Text("Penny ${BuildConfig.VERSION_NAME} · Public beta\nBuilt by Josh Beira.\nEnglish print. Android 8 or later.", color = Muted, fontSize = 14.sp)
                }
            }
            if (commands.available) Secondary("Talk to Penny") {
                speech.stop(); sounds.stop()
                if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) commands.start()
                else microphone.launch(Manifest.permission.RECORD_AUDIO)
            }
            Spacer(Modifier.height(16.dp))
        }
    }
    if (showSave) AlertDialog(onDismissRequest = { showSave = false }, title = { Text("Save on this device") },
        text = { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Only the reviewed text is saved. Anyone who can unlock this device and open Penny can read saved letters.")
            OutlinedTextField(saveTitle, { saveTitle = it.take(100) }, label = { Text("Letter title") }, singleLine = true)
        } }, confirmButton = { TextButton(onClick = { vm.save(saveTitle, state.text); showSave = false }) { Text("Save letter") } },
        dismissButton = { TextButton(onClick = { showSave = false }) { Text("Cancel") } })
    deleteLetter?.let { letter -> AlertDialog(onDismissRequest = { deleteLetter = null }, title = { Text("Delete this saved letter?") },
        text = { Text("${letter.title} will be removed from this device library. Exported copies are unaffected.") },
        confirmButton = { TextButton(onClick = { vm.delete(letter); deleteLetter = null }) { Text("Delete letter") } },
        dismissButton = { TextButton(onClick = { deleteLetter = null }) { Text("Cancel") } }) }
    confirm?.let { kind ->
        val description = when (kind) {
            "flag" -> "Flag the sample £79.00 payment for practice review. No report is sent to a bank."
            "card" -> "Practise ordering a replacement card to a sample address. No real card is ordered."
            "receipts" -> "Delete all practice receipts on this device. Export your history first if you want a copy."
            else -> "Delete all saved letters on this device. This cannot be undone. Export your library first if you want a copy."
        }
        AlertDialog(onDismissRequest = { confirm = null }, title = { Text("Review before confirming") }, text = { Column {
            Text(description)
            if (kind == "flag" || kind == "card") TextButton(onClick = { speech.read(description, state.speechRate, state.quiet) }) { Text("Read back action") }
        } }, confirmButton = { TextButton(onClick = {
            speech.stop()
            when (kind) {
                "flag" -> vm.receipt("Sample payment flagged", "Unfamiliar merchant · £79.00 · sample only · no report sent")
                "card" -> vm.receipt("Sample replacement card ordered", "Sample address · no real card ordered")
                "receipts" -> vm.clearReceipts()
                else -> vm.clearLibrary()
            }
            haptics.performHapticFeedback(HapticFeedbackType.LongPress); confirm = null
        }) { Text(if (kind == "flag" || kind == "card") "Confirm practice action" else "Confirm deletion") } },
            dismissButton = { TextButton(onClick = { speech.stop(); confirm = null }) { Text("Cancel") } })
    }
}

@Composable private fun Eyebrow(text: String) { Text(text, color = Amber, fontSize = 12.sp, letterSpacing = 1.sp) }
@Composable private fun Heading(text: String) { Text(text, fontSize = 30.sp, lineHeight = 36.sp, fontWeight = FontWeight.Bold) }
@Composable private fun Panel(content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxWidth().background(Surface, RoundedCornerShape(22.dp)).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp), content = content)
}
@Composable private fun Primary(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    Button(onClick, Modifier.fillMaxWidth().heightIn(min = 54.dp), enabled = enabled, contentPadding = PaddingValues(16.dp)) { Text(text, fontSize = 17.sp) }
}
@Composable private fun Secondary(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    OutlinedButton(onClick, Modifier.fillMaxWidth().heightIn(min = 52.dp), enabled = enabled, contentPadding = PaddingValues(14.dp)) { Text(text, fontSize = 16.sp) }
}
@Composable private fun Stat(value: String, label: String, modifier: Modifier) {
    Column(modifier.background(Surface, RoundedCornerShape(18.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(value, fontSize = 28.sp, color = Amber, fontWeight = FontWeight.Bold); Text(label, color = Muted, fontSize = 14.sp)
    }
}
@Composable private fun SwitchRow(title: String, detail: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Panel {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(title, Modifier.weight(1f), fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Switch(checked, onChange, modifier = Modifier.semantics { this[androidx.compose.ui.semantics.SemanticsProperties.ContentDescription] = listOf(title) })
        }
        Text(detail, color = Muted)
    }
}
@Composable private fun ReadingControls(state: PennyState, vm: PennyViewModel, stop: () -> Unit) {
    Column {
        Text("Text size · ${state.fontSize.toInt()}", color = Muted)
        Slider(value = state.fontSize, onValueChange = { vm.settings(fontSize = it) }, valueRange = 18f..34f, steps = 7,
            modifier = Modifier.semantics { this[androidx.compose.ui.semantics.SemanticsProperties.ContentDescription] = listOf("Text size") })
        Text("Reading speed · ${"%.1f".format(state.speechRate)}×", color = Muted)
        Slider(value = state.speechRate, onValueChange = { stop(); vm.settings(rate = it) }, valueRange = .5f..1.5f, steps = 9,
            modifier = Modifier.semantics { this[androidx.compose.ui.semantics.SemanticsProperties.ContentDescription] = listOf("Reading speed") })
    }
}
private fun displayDate(value: String): String = runCatching {
    DateTimeFormatter.ofPattern("d MMM yyyy").withZone(ZoneId.systemDefault()).format(Instant.parse(value))
}.getOrDefault(value)
