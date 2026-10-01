package io.github.joshbeira.penny

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import io.github.joshbeira.penny.core.LetterText
import io.github.joshbeira.penny.core.Receipt
import io.github.joshbeira.penny.data.LetterRecognizer
import io.github.joshbeira.penny.data.PennyStore
import io.github.joshbeira.penny.data.SavedLetter
import java.io.File
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

data class PennyState(
    val text: String = "",
    val source: String = "",
    val busy: Boolean = false,
    val message: String = "",
    val letters: List<SavedLetter> = emptyList(),
    val receipts: List<Receipt> = emptyList(),
    val fontSize: Float = 22f,
    val speechRate: Float = 1f,
    val quiet: Boolean = false,
    val maskNumbers: Boolean = true,
)

class PennyViewModel(application: Application) : AndroidViewModel(application) {
    private val store = PennyStore(application)
    private val prefs = application.getSharedPreferences("penny.settings.v1", 0)
    private val mutable =
        MutableStateFlow(
            PennyState(
                fontSize = prefs.getFloat("fontSize", 22f).coerceIn(18f, 34f),
                speechRate = prefs.getFloat("speechRate", 1f).coerceIn(.5f, 1.5f),
                quiet = prefs.getBoolean("quiet", false),
                maskNumbers = prefs.getBoolean("maskNumbers", true),
            )
        )
    val state = mutable.asStateFlow()
    private var pendingExport: String? = null
    private var recognition: Job? = null
    private var readingRevision = 0
    private val storageWrites = Mutex()

    private fun cancelRecognition() {
        readingRevision += 1
        recognition?.cancel()
        recognition = null
        mutable.update { it.copy(busy = false) }
    }

    fun prepareExport(text: String) {
        pendingExport = text
    }

    fun consumeExport(): String? = pendingExport.also { pendingExport = null }

    init {
        task {
            File(application.cacheDir, "camera")
                .listFiles()
                ?.filter { System.currentTimeMillis() - it.lastModified() > 86_400_000 }
                ?.forEach { it.delete() }
            refresh()
        }
    }

    private suspend fun refresh() {
        val letters = store.letters()
        val receipts = store.receipts()
        mutable.update { it.copy(letters = letters, receipts = receipts) }
    }

    private fun task(work: suspend () -> Unit) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                storageWrites.withLock { work() }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                message(
                    "Could not update device storage. Your current reading is still here. Free some space and try again."
                )
            }
        }
    }

    fun message(text: String) {
        mutable.update { it.copy(message = text) }
    }

    fun sample() {
        cancelRecognition()
        mutable.update {
            it.copy(
                text = LetterText.SAMPLE,
                source = "Sample letter",
                message = "Sample ready. Try reading aloud or save it to your library.",
            )
        }
    }

    fun edit(text: String) {
        cancelRecognition()
        mutable.update {
            it.copy(text = text.take(LetterText.MAX_LENGTH), source = "Reviewed text")
        }
    }

    fun clear() {
        cancelRecognition()
        mutable.update {
            it.copy(text = "", source = "", message = "Letter cleared from this reading.")
        }
    }

    fun open(letter: SavedLetter) {
        cancelRecognition()
        mutable.update {
            it.copy(
                text = letter.text,
                source = "Saved on this device",
                message = "Opened ${letter.title}. Changes are saved as a new copy.",
            )
        }
    }

    fun readPhoto(uri: Uri, ownedCameraFile: File? = null) {
        if (state.value.busy) return
        mutable.update {
            it.copy(busy = true, text = "", source = "", message = "Reading on your device…")
        }
        val shouldMask = state.value.maskNumbers
        val revision = ++readingRevision
        recognition =
            viewModelScope.launch {
                try {
                    val text = LetterRecognizer(getApplication()).read(uri)
                    if (revision != readingRevision) return@launch
                    mutable.update {
                        it.copy(
                            text = if (shouldMask) LetterText.mask(text) else text,
                            source = "Read on your device",
                            message =
                                "Reading ready. Check the text against your letter before relying on it.",
                        )
                    }
                } catch (_: TimeoutCancellationException) {
                    message("Reading timed out. Try a clearer photograph or paste the text.")
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    message(
                        "Could not read this photo. Use good light, keep the page flat, and try again. You can also paste text."
                    )
                } finally {
                    withContext(NonCancellable + Dispatchers.IO) { ownedCameraFile?.delete() }
                    if (revision == readingRevision) mutable.update { it.copy(busy = false) }
                }
            }
    }

    fun save(title: String, text: String) {
        task {
            try {
                store.save(title, text)
                refresh()
                message("Saved to your device library. No photo was saved.")
            } catch (e: IllegalArgumentException) {
                message(e.message ?: "Could not save this letter.")
            }
        }
    }

    fun favourite(letter: SavedLetter) {
        task {
            store.favourite(letter)
            refresh()
        }
    }

    fun delete(letter: SavedLetter) {
        task {
            store.delete(letter.id)
            refresh()
            message("Letter deleted from your library.")
        }
    }

    fun clearLibrary() {
        task {
            store.clearLetters()
            refresh()
            message("Saved letters deleted.")
        }
    }

    fun receipt(action: String, details: String) {
        task {
            try {
                store.addReceipt(action, details)
                refresh()
                message(
                    "Practice action confirmed. Receipt saved. No real banking action occurred."
                )
            } catch (e: IllegalArgumentException) {
                message(e.message ?: "Could not save receipt.")
            }
        }
    }

    fun clearReceipts() {
        task {
            store.clearReceipts()
            refresh()
            message("Practice receipts deleted.")
        }
    }

    fun settings(
        fontSize: Float = state.value.fontSize,
        rate: Float = state.value.speechRate,
        quiet: Boolean = state.value.quiet,
        mask: Boolean = state.value.maskNumbers,
    ) {
        prefs
            .edit()
            .putFloat("fontSize", fontSize)
            .putFloat("speechRate", rate)
            .putBoolean("quiet", quiet)
            .putBoolean("maskNumbers", mask)
            .apply()
        mutable.update {
            it.copy(fontSize = fontSize, speechRate = rate, quiet = quiet, maskNumbers = mask)
        }
    }

    override fun onCleared() {
        store.close()
    }
}
