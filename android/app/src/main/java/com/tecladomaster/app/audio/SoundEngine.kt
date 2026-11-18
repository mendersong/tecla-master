package com.tecladomaster.app.audio

import android.media.*
import com.tecladomaster.app.data.midiFrequency
import kotlin.math.*

class SoundEngine {
    private val sampleRate = 22050
    private val voices = mutableMapOf<Int, AudioTrack>()
    @Volatile var volume = .7f

    fun noteOn(note: Int, velocity: Int = 100) {
        if (voices.containsKey(note)) return
        val duration = 1.4
        val samples = ShortArray((sampleRate * duration).toInt())
        val frequency = midiFrequency(note)
        val amplitude = volume * (velocity / 127f).coerceIn(.15f, 1f)
        for (i in samples.indices) {
            val t = i.toDouble() / sampleRate
            val attack = (t / .012).coerceAtMost(1.0)
            val release = ((duration - t) / .35).coerceIn(0.0, 1.0)
            val envelope = attack * release * (.65 + .35 * exp(-t * 2.5))
            val wave = sin(2 * PI * frequency * t) + .28 * sin(2 * PI * frequency * 2 * t) + .1 * sin(2 * PI * frequency * 3 * t)
            samples[i] = (wave * envelope * amplitude * 6500).roundToInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
        }
        val track = AudioTrack(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build(),
            AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(sampleRate).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build(),
            samples.size * 2, AudioTrack.MODE_STATIC, AudioManager.AUDIO_SESSION_ID_GENERATE)
        track.write(samples, 0, samples.size)
        voices[note] = track
        track.play()
    }

    fun noteOff(note: Int) { voices.remove(note)?.let { runCatching { it.stop() }; it.release() } }
    fun click(accent: Boolean) { noteOn(if (accent) 96 else 91, 55); android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({ noteOff(if (accent) 96 else 91) }, 65) }
    fun close() { voices.keys.toList().forEach(::noteOff) }
}
