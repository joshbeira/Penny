package io.github.joshbeira.penny

import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Handler
import android.os.Looper

/** Optional sonification always has equivalent visible transaction labels. */
class PracticeSounds {
    private val handler = Handler(Looper.getMainLooper())
    private var tones: ToneGenerator? = null
    fun playWeek() {
        stop()
        val player = runCatching { ToneGenerator(AudioManager.STREAM_MUSIC, 45) }.getOrNull() ?: return
        tones = player
        val notes = listOf(ToneGenerator.TONE_PROP_BEEP, ToneGenerator.TONE_PROP_ACK, ToneGenerator.TONE_PROP_NACK)
        notes.forEachIndexed { index, tone -> handler.postDelayed({ player.startTone(tone, 220) }, index * 750L) }
        handler.postDelayed({ stop() }, 2300)
    }
    fun stop() { handler.removeCallbacksAndMessages(null); tones?.release(); tones = null }
}
