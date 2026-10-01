package io.github.joshbeira.penny

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import io.github.joshbeira.penny.core.LetterText
import java.util.Locale
import java.util.UUID

class SpeechReader(context: Context, private val report: (String) -> Unit) {
    private var ready = false
    private var session = ""
    private val engine: TextToSpeech =
        TextToSpeech(context.applicationContext) { result ->
            ready = result == TextToSpeech.SUCCESS
        }

    init {
        engine.setOnUtteranceProgressListener(
            object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) = Unit

                override fun onDone(utteranceId: String?) {
                    if (utteranceId == session) report("Finished reading.")
                }

                @Deprecated("Android compatibility callback")
                override fun onError(utteranceId: String?) {
                    if (utteranceId?.startsWith(session) == true && session.isNotBlank())
                        report("Speech could not finish. Your text is still available.")
                }
            }
        )
    }

    fun read(text: String, rate: Float, quiet: Boolean) {
        stop()
        if (quiet) {
            report("Quiet Mode is on. The same information is shown as text.")
            return
        }
        if (!ready) {
            report(
                "Device speech is not ready. Install an English offline voice in Android’s text-to-speech settings, then reopen Penny."
            )
            return
        }
        val voice =
            engine.voices
                ?.filter { it.locale.language == "en" && !it.isNetworkConnectionRequired }
                ?.sortedByDescending { it.locale == Locale.UK }
                ?.firstOrNull()
        if (voice == null) {
            report(
                "No offline English voice is installed. Open Android’s text-to-speech settings to download one."
            )
            return
        }
        engine.voice = voice
        engine.setSpeechRate(rate)
        session = UUID.randomUUID().toString()
        val chunks =
            LetterText.speechChunks(text, minOf(3000, TextToSpeech.getMaxSpeechInputLength() - 1))
        report("Reading aloud. Use Stop reading to finish early.")
        chunks.forEachIndexed { index, chunk ->
            val id = if (index == chunks.lastIndex) session else "$session-$index"
            if (engine.speak(chunk, TextToSpeech.QUEUE_ADD, null, id) == TextToSpeech.ERROR) {
                stop()
                report("Speech could not start. Your text is still available.")
                return
            }
        }
    }

    fun stop() {
        session = ""
        engine.stop()
    }

    fun close() {
        stop()
        engine.shutdown()
    }
}
