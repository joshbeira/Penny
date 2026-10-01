package io.github.joshbeira.penny

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.net.Uri
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.joshbeira.penny.core.Receipt
import io.github.joshbeira.penny.data.LetterRecognizer
import io.github.joshbeira.penny.data.PennyStore
import java.io.File
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class PennyAppTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    private fun click(text: String) {
        compose.onNodeWithText(text, useUnmergedTree = true).performScrollTo().performClick()
    }

    private fun screenshot(name: String) {
        compose.waitForIdle()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val image = instrumentation.uiAutomation.takeScreenshot()
        val file = File(compose.activity.getExternalFilesDir(null), "$name.png")
        file.outputStream().use { image.compress(Bitmap.CompressFormat.PNG, 100, it) }
        image.recycle()
    }

    @Test
    fun sampleCanBeCorrectedSavedReopenedAndDeleted() {
        val store = PennyStore(compose.activity)
        store.clearLetters()
        store.close()
        screenshot("android-home")
        click("Read a letter")
        click("Try a sample letter")
        val field = compose.onNode(hasSetTextAction() and hasText("Letter text · tap to correct"))
        field
            .performScrollTo()
            .performTextReplacement("Oak Street Library\nYour books are ready until Friday.")
        click("Save to library")
        compose.onNodeWithText("Save letter", useUnmergedTree = true).performClick()
        compose.waitUntil(5000) {
            compose
                .onAllNodesWithText("Saved to your device library. No photo was saved.")
                .fetchSemanticsNodes()
                .isNotEmpty()
        }
        compose.onNodeWithText("Library", useUnmergedTree = true).performClick()
        compose.onNodeWithText("Oak Street Library", useUnmergedTree = true).assertExists()
        screenshot("android-library")
        click("Open letter")
        compose
            .onNode(hasSetTextAction() and hasText("Letter text · tap to correct"))
            .assertTextContains("Oak Street Library\nYour books are ready until Friday.")
        screenshot("android-reader")
        compose.activityRule.scenario.recreate()
        compose.onNodeWithText("Library", useUnmergedTree = true).performClick()
        click("Add favourite")
        click("Delete Oak Street Library")
        compose.onNodeWithText("Delete letter", useUnmergedTree = true).performClick()
        compose.waitUntil(5000) {
            compose
                .onAllNodesWithText("Your next letter belongs here.")
                .fetchSemanticsNodes()
                .isNotEmpty()
        }
    }

    @Test
    fun practiceRequiresConfirmationAndProducesVerifiableReceipt() {
        val store = PennyStore(compose.activity)
        store.clearReceipts()
        store.close()
        click("Open banking sandbox")
        screenshot("android-practice")
        click("Practise ordering a replacement card")
        compose.onNodeWithText("Cancel", useUnmergedTree = true).performClick()
        PennyStore(compose.activity).use { assertEquals(0, it.receipts().size) }
        click("Practise ordering a replacement card")
        compose.onNodeWithText("Confirm practice action", useUnmergedTree = true).performClick()
        compose.waitUntil(5000) { PennyStore(compose.activity).use { it.receipts().size == 1 } }
        PennyStore(compose.activity).use { assertTrue(Receipt.verify(it.receipts())) }
    }

    @Test
    fun recognisesRealImageWithoutInternetPermission() = runBlocking {
        val context = compose.activity
        assertEquals(
            PackageManager.PERMISSION_DENIED,
            context.checkSelfPermission(Manifest.permission.INTERNET),
        )
        val bitmap = Bitmap.createBitmap(1200, 500, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)
        val paint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.BLACK
                textSize = 48f
            }
        canvas.drawText("Oak Street Library", 50f, 100f, paint)
        canvas.drawText("Your books are ready to collect.", 50f, 200f, paint)
        canvas.drawText("Please visit by Friday.", 50f, 300f, paint)
        val file = File(context.cacheDir, "ocr-test.png")
        file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        bitmap.recycle()
        try {
            val text = LetterRecognizer(context).read(Uri.fromFile(file))
            assertTrue(text.contains("Oak Street Library"))
            assertTrue(text.contains("Friday"))
        } finally {
            file.delete()
        }
    }

    @Test
    fun savedDataSurvivesDatabaseReopenAndDeletesCleanly() {
        val name = "penny-test.db"
        compose.activity.deleteDatabase(name)
        PennyStore(compose.activity, name).use { it.save("Test letter", "Only synthetic text.") }
        PennyStore(compose.activity, name).use { db ->
            assertEquals("Only synthetic text.", db.letters().single().text)
            db.favourite(db.letters().single())
            assertTrue(db.letters().single().favourite)
            db.clearLetters()
            assertTrue(db.letters().isEmpty())
        }
        compose.activity.deleteDatabase(name)
    }

    @Test
    fun pendingExportSurvivesRotationAndIsConsumedOnlyOnce() {
        compose.activityRule.scenario.onActivity { activity ->
            androidx.lifecycle
                .ViewModelProvider(activity)[PennyViewModel::class.java]
                .prepareExport("Synthetic export contents")
        }
        compose.activityRule.scenario.recreate()
        compose.activityRule.scenario.onActivity { activity ->
            val vm = androidx.lifecycle.ViewModelProvider(activity)[PennyViewModel::class.java]
            assertEquals("Synthetic export contents", vm.consumeExport())
            assertNull(vm.consumeExport())
        }
    }

    @Test
    fun openingSavedLetterCancelsPendingRecognitionAndRemovesCameraFile() {
        val photo = File(compose.activity.cacheDir, "pending-camera.png")
        val bitmap = Bitmap.createBitmap(1200, 500, Bitmap.Config.ARGB_8888)
        Canvas(bitmap).drawColor(Color.WHITE)
        photo.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        bitmap.recycle()
        compose.activityRule.scenario.onActivity { activity ->
            val vm = androidx.lifecycle.ViewModelProvider(activity)[PennyViewModel::class.java]
            vm.readPhoto(Uri.fromFile(photo), photo)
            vm.open(
                io.github.joshbeira.penny.data.SavedLetter(
                    "test",
                    "Saved letter",
                    "Keep this reviewed text.",
                    "2026-10-01T00:00:00Z",
                    false,
                )
            )
        }
        compose.waitUntil(5000) { !photo.exists() }
        compose.activityRule.scenario.onActivity { activity ->
            val state =
                androidx.lifecycle
                    .ViewModelProvider(activity)[PennyViewModel::class.java]
                    .state
                    .value
            assertEquals("Keep this reviewed text.", state.text)
            assertFalse(state.busy)
        }
    }
}
