package com.tecladomaster.app.audio

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import com.tecladomaster.app.data.midiFrequency
import kotlinx.coroutines.*
import kotlin.math.*

data class AudioFrame(val notes: Set<Int>, val level: Float, val calibrating: Boolean, val error: String? = null)

/** Real-time spectral transcription. No prerecorded events or random note generation. */
class AudioRecognizer(private val context: Context, private val onFrame: (AudioFrame) -> Unit) {
    private val sampleRate = 44100
    private val size = 8192
    private val hop = 2048
    private var recorder: AudioRecord? = null
    private var job: Job? = null
    private var scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    @Volatile var sensitivity = .62f
    @Volatile var noiseGate = .18f
    @Volatile private var calibrateRequested = false
    private var noiseProfile: DoubleArray? = null

    fun start() {
        if (job?.isActive == true) return
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            onFrame(AudioFrame(emptySet(), 0f, false, "permission")); return
        }
        val minimum = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
        val audio = AudioRecord(MediaRecorder.AudioSource.UNPROCESSED, sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, maxOf(minimum, size * 2))
        if (audio.state != AudioRecord.STATE_INITIALIZED) { onFrame(AudioFrame(emptySet(), 0f, false, "init")); return }
        recorder = audio
        audio.startRecording()
        job = scope.launch { process(audio) }
    }

    fun calibrate() { calibrateRequested = true }

    private suspend fun process(audio: AudioRecord) = withContext(Dispatchers.Default) {
        val window = ShortArray(size)
        val chunk = ShortArray(hop)
        val lastSeen = mutableMapOf<Int, Long>()
        var lastNotes = emptySet<Int>()
        var calibrationSamples = 0
        var calibrationStarted = 0L
        var calibrationSum = DoubleArray(size / 2)
        try {
            while (isActive && audio.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                System.arraycopy(window, hop, window, 0, size - hop)
                val read = audio.read(chunk, 0, hop)
                if (read <= 0) continue
                System.arraycopy(chunk, 0, window, size - hop, read)
                val re = DoubleArray(size)
                val im = DoubleArray(size)
                var mean = 0.0
                for (value in window) mean += value
                mean /= size
                var sumSquares = 0.0
                var previous = 0.0
                for (index in window.indices) {
                    val raw = window[index] - mean
                    val highPassed = raw - previous
                    previous = raw
                    val sample = highPassed * (0.5 - 0.5 * cos(2.0 * PI * index / (size - 1)))
                    re[index] = sample
                    sumSquares += raw * raw
                }
                val rms = sqrt(sumSquares / size) / 32768.0
                Fft.transform(re, im)
                val magnitudes = DoubleArray(size / 2) { sqrt(re[it] * re[it] + im[it] * im[it]) / size }
                val now = System.currentTimeMillis()
                if (calibrateRequested) {
                    if (calibrationStarted == 0L) { calibrationStarted = now; calibrationSamples = 0; calibrationSum = DoubleArray(size / 2) }
                    for (i in magnitudes.indices) calibrationSum[i] += magnitudes[i]
                    calibrationSamples++
                    onFrame(AudioFrame(emptySet(), rms.toFloat().coerceAtMost(1f), true))
                    if (now - calibrationStarted >= 1500) {
                        noiseProfile = DoubleArray(size / 2) { calibrationSum[it] / calibrationSamples.coerceAtLeast(1) }
                        calibrationStarted = 0; calibrateRequested = false
                    }
                    continue
                }
                val found = if (rms > .003 + noiseGate * .035) transcribe(magnitudes) else emptySet()
                found.forEach { lastSeen[it] = now }
                val sustained = lastSeen.filter { now - it.value <= 260 }.keys
                lastSeen.entries.removeAll { now - it.value > 260 }
                if (sustained != lastNotes) { lastNotes = sustained; onFrame(AudioFrame(sustained, (rms * 9).toFloat().coerceAtMost(1f), false)) }
                else onFrame(AudioFrame(sustained, (rms * 9).toFloat().coerceAtMost(1f), false))
            }
        } catch (error: Exception) {
            if (isActive) onFrame(AudioFrame(emptySet(), 0f, false, error.message ?: "audio"))
        } finally {
            runCatching { audio.stop() }; audio.release(); recorder = null
        }
    }

    private fun transcribe(spectrum: DoubleArray): Set<Int> {
        val binWidth = sampleRate.toDouble() / size
        fun magnitude(frequency: Double): Double {
            if (frequency < 45 || frequency > 4200) return 0.0
            val position = frequency / binWidth
            val left = position.toInt().coerceIn(0, spectrum.lastIndex)
            val right = (left + 1).coerceAtMost(spectrum.lastIndex)
            val blend = position - left
            val value = spectrum[left] * (1 - blend) + spectrum[right] * blend
            val ambient = noiseProfile?.let { it[left] * (1 - blend) + it[right] * blend } ?: 0.0
            return (value - ambient * (1.15 + noiseGate)).coerceAtLeast(0.0)
        }
        val candidates = mutableListOf<Triple<Int, Double, Double>>()
        for (midi in 36..88) {
            val f = midiFrequency(midi)
            val fundamental = magnitude(f)
            val salience = fundamental + magnitude(f * 2) * .34 + magnitude(f * 3) * .18 + magnitude(f * 4) * .09 - if (midi > 48) magnitude(f / 2) * .12 else 0.0
            if (fundamental > .00008 && salience > 0) candidates += Triple(midi, salience, fundamental)
        }
        candidates.sortByDescending { it.second }
        val maximum = candidates.firstOrNull()?.second ?: return emptySet()
        val result = mutableSetOf<Int>()
        for ((midi, salience, fundamental) in candidates) {
            if (result.size >= 6 || salience < maximum * (.34 - sensitivity * .22)) break
            val weakHarmonic = result.any { lower ->
                val ratio = midiFrequency(midi) / midiFrequency(lower)
                listOf(2.0, 3.0, 4.0).any { abs(ratio - it) < .025 } && fundamental < salience * .34
            }
            if (!weakHarmonic) result += midi
        }
        return result
    }

    fun stop() { job?.cancel(); job = null; runCatching { recorder?.stop() }; recorder?.release(); recorder = null }
    fun close() { stop(); scope.cancel() }
}

private object Fft {
    fun transform(re: DoubleArray, im: DoubleArray) {
        val n = re.size
        var j = 0
        for (i in 1 until n) {
            var bit = n shr 1
            while (j and bit != 0) { j = j xor bit; bit = bit shr 1 }
            j = j xor bit
            if (i < j) { val tr = re[i]; re[i] = re[j]; re[j] = tr; val ti = im[i]; im[i] = im[j]; im[j] = ti }
        }
        var length = 2
        while (length <= n) {
            val angle = -2 * PI / length
            val wlRe = cos(angle); val wlIm = sin(angle)
            for (i in 0 until n step length) {
                var wr = 1.0; var wi = 0.0
                for (k in 0 until length / 2) {
                    val even = i + k; val odd = even + length / 2
                    val or = re[odd] * wr - im[odd] * wi
                    val oi = re[odd] * wi + im[odd] * wr
                    re[odd] = re[even] - or; im[odd] = im[even] - oi
                    re[even] += or; im[even] += oi
                    val nextWr = wr * wlRe - wi * wlIm
                    wi = wr * wlIm + wi * wlRe; wr = nextWr
                }
            }
            length = length shl 1
        }
    }
}
