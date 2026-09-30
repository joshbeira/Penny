package io.github.joshbeira.penny

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer

/** Never falls back to a cloud recognizer. Microphone access is requested only on tap. */
class VoiceCommands(private val context: Context, private val report: (String) -> Unit, private val command: (String) -> Unit) {
    private var recognizer: SpeechRecognizer? = null
    val available: Boolean get() = Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
    fun start() {
        stop()
        if (!available) { report("Offline voice navigation is not available on this device. All controls are available on screen."); return }
        if (Build.VERSION.SDK_INT >= 31) {
            recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(context).apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) { report("Listening once. Say: home, read a letter, library, settings, banking, or stop.") }
                    override fun onBeginningOfSpeech() = Unit
                    override fun onRmsChanged(rmsdB: Float) = Unit
                    override fun onBufferReceived(buffer: ByteArray?) = Unit
                    override fun onEndOfSpeech() = Unit
                    override fun onError(error: Int) { report("Voice command unavailable or not recognised. Check your offline speech language or use the on-screen controls.") }
                    override fun onResults(results: Bundle?) {
                        val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
                        command(text.lowercase().trim())
                    }
                    override fun onPartialResults(partialResults: Bundle?) = Unit
                    override fun onEvent(eventType: Int, params: Bundle?) = Unit
                })
                startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-GB")
                    putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                })
            }
        }
    }
    fun stop() { recognizer?.cancel(); recognizer?.destroy(); recognizer = null }
}
