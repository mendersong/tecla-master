package com.tecladomaster.app.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.tecladomaster.app.audio.*
import com.tecladomaster.app.data.*
import com.tecladomaster.app.midi.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import java.util.UUID
import kotlin.math.*

data class PracticeSummary(val errors: Int, val attempts: Int, val durationSec: Float, val accuracy: Float, val sequence: Float, val changes: Float, val timing: Float)
data class PracticeState(
    val lesson: Lesson, val assessment: Boolean, val index: Int = 0, val elapsed: Float = 0f,
    val errors: Int = 0, val attempts: Int = 0, val status: String = "waiting", val paused: Boolean = false,
    val completed: Boolean = false, val summary: PracticeSummary? = null, val stars: Int = 0, val grade: Float? = null,
)
data class MasterUiState(
    val profile: ProfileEntity = ProfileEntity(), val exercises: List<ExerciseEntity> = emptyList(),
    val assessments: List<AssessmentEntity> = emptyList(), val activeNotes: Set<Int> = emptySet(),
    val velocities: Map<Int, Int> = emptyMap(), val micLevel: Float = 0f, val calibrating: Boolean = false,
    val midiDevices: List<MidiDeviceState> = emptyList(), val practice: PracticeState? = null,
)

class MasterViewModel(application: Application) : AndroidViewModel(application) {
    private val dao = MasterDatabase.get(application).dao()
    private val sound = SoundEngine()
    private val _state = MutableStateFlow(MasterUiState())
    val state: StateFlow<MasterUiState> = _state.asStateFlow()
    private var micNotes = emptySet<Int>()
    private var midiNotes = emptySet<Int>()
    private var touchNotes = emptySet<Int>()
    private var timerJob: Job? = null
    private var pulseJob: Job? = null
    private var evaluationJob: Job? = null
    private var lastActiveKey = ""
    private var acceptedKey = ""
    private var wrongKey = ""
    private var stepWrong = 0
    private var partialBest = 0f
    private val accuracies = mutableListOf<Float>()
    private val acceptedTimes = mutableListOf<Float>()
    private var firstTry = 0
    private var wrongChanges = 0

    private val audio = AudioRecognizer(application) { frame ->
        micNotes = frame.notes
        _state.update { it.copy(micLevel = frame.level, calibrating = frame.calibrating) }
        publishActiveNotes()
    }
    private val midi = MidiRecognizer(application, { event ->
        midiNotes = if (event.pressed) midiNotes + event.note else midiNotes - event.note
        if (event.pressed) sound.noteOn(event.note, event.velocity) else sound.noteOff(event.note)
        _state.update { it.copy(velocities = it.velocities + (event.note to event.velocity)) }
        publishActiveNotes()
    }, { devices ->
        _state.update { it.copy(midiDevices = devices) }
        publishActiveNotes()
    })

    init {
        viewModelScope.launch {
            launch { dao.profile().filterNotNull().collect { profile -> _state.update { it.copy(profile = profile) }; sound.volume = profile.soundVolume; audio.sensitivity = profile.micSensitivity; audio.noiseGate = profile.noiseGate } }
            launch { dao.exercises().collect { rows -> _state.update { it.copy(exercises = rows) } } }
            launch { dao.assessments().collect { rows -> _state.update { it.copy(assessments = rows) } } }
            if (dao.profileNow() == null) dao.saveProfile(ProfileEntity())
            midi.start()
        }
    }

    private fun publishActiveNotes() {
        val profile = _state.value.profile
        val midiPriority = profile.inputMode == "midi" || (profile.inputMode == "auto" && _state.value.midiDevices.any { it.connected })
        val active = when {
            profile.inputMode == "touch" -> touchNotes
            midiPriority -> touchNotes + midiNotes
            profile.inputMode == "microphone" || profile.inputMode == "auto" -> touchNotes + micNotes
            else -> touchNotes
        }
        _state.update { it.copy(activeNotes = active) }
        evaluate(active)
    }

    fun startMicrophone() { audio.start() }
    fun stopMicrophone() { audio.stop(); micNotes = emptySet(); publishActiveNotes() }
    fun calibrate() = audio.calibrate()
    fun touch(note: Int, pressed: Boolean) {
        touchNotes = if (pressed) touchNotes + note else touchNotes - note
        if (pressed) sound.noteOn(note) else sound.noteOff(note)
        publishActiveNotes()
    }

    fun startPractice(lesson: Lesson, assessment: Boolean = lesson.id.startsWith("assessment")) {
        timerJob?.cancel(); pulseJob?.cancel(); evaluationJob?.cancel()
        lastActiveKey = ""; acceptedKey = ""; wrongKey = ""; stepWrong = 0; partialBest = 0f
        accuracies.clear(); acceptedTimes.clear(); firstTry = 0; wrongChanges = 0
        _state.update { it.copy(practice = PracticeState(lesson, assessment)) }
        timerJob = viewModelScope.launch {
            while (isActive) {
                delay(250)
                val practice = _state.value.practice ?: break
                if (!practice.paused && !practice.completed) _state.update { it.copy(practice = practice.copy(elapsed = practice.elapsed + .25f)) }
            }
        }
        pulseJob = viewModelScope.launch {
            var beat = 0
            while (isActive) {
                val practice = _state.value.practice ?: break
                if (!practice.paused && !practice.completed) { sound.click(beat % 4 == 0); beat++ }
                delay(60000L / practice.lesson.bpm)
            }
        }
    }

    private fun evaluate(active: Set<Int>) {
        val practice = _state.value.practice ?: return
        if (practice.paused || practice.completed) return
        val key = active.sorted().joinToString(",")
        if (key.isEmpty()) {
            lastActiveKey = ""; acceptedKey = ""; wrongKey = ""; evaluationJob?.cancel()
            _state.update { it.copy(practice = practice.copy(status = "waiting")) }; return
        }
        if (key == acceptedKey) return
        if (key != lastActiveKey) {
            if (lastActiveKey.isEmpty()) _state.update { it.copy(practice = practice.copy(attempts = practice.attempts + 1)) }
            lastActiveKey = key; wrongKey = ""
            _state.update { it.copy(practice = _state.value.practice!!.copy(status = "waiting")) }
        }
        val target = parseTarget(practice.lesson.steps[practice.index])
        val comparison = compareNotes(target.notes, active)
        partialBest = maxOf(partialBest, (comparison.correct.size.toFloat() / target.notes.map { it % 12 }.toSet().size - comparison.incorrect.size * .15f).coerceIn(0f, 1f))
        evaluationJob?.cancel()
        if (comparison.perfect) {
            evaluationJob = viewModelScope.launch {
                delay(240)
                val current = _state.value.practice ?: return@launch
                if (current.index != practice.index || _state.value.activeNotes != active || current.paused) return@launch
                acceptedKey = key
                val accuracy = (maxOf(partialBest, 1f - stepWrong * .2f) * (1f - stepWrong * .08f)).coerceIn(0f, 1f)
                accuracies += accuracy
                if (stepWrong == 0) firstTry++
                acceptedTimes += current.elapsed
                stepWrong = 0; partialBest = 0f
                _state.update { it.copy(practice = current.copy(status = "correct")) }
                delay(320)
                if (practice.index >= practice.lesson.steps.lastIndex) finishPractice(true)
                else _state.update { it.copy(practice = _state.value.practice!!.copy(index = practice.index + 1, status = "waiting")) }
            }
        } else {
            val enoughNotes = active.map { it % 12 }.toSet().size >= target.notes.map { it % 12 }.toSet().size
            if (comparison.incorrect.isNotEmpty() || enoughNotes) evaluationJob = viewModelScope.launch {
                delay(520)
                val current = _state.value.practice ?: return@launch
                if (wrongKey == key || _state.value.activeNotes != active || current.paused || current.completed) return@launch
                wrongKey = key; stepWrong++
                if (current.index > 0) wrongChanges++
                _state.update { it.copy(practice = current.copy(errors = current.errors + 1, status = "incorrect")) }
            }
        }
    }

    private fun finishPractice(finished: Boolean) {
        val practice = _state.value.practice ?: return
        if (practice.completed) return
        evaluationJob?.cancel(); timerJob?.cancel(); pulseJob?.cancel()
        val summary = calculateSummary(practice, finished)
        val stars = when {
            summary.errors == 0 && summary.durationSec <= practice.lesson.estimatedSec -> 3
            summary.errors <= 2 && summary.durationSec <= practice.lesson.estimatedSec * 1.65f -> 2
            else -> 1
        }
        val grade = if (practice.assessment) ((summary.accuracy * .4f + summary.sequence * .25f + summary.changes * .2f + summary.timing * .15f) * 100f).roundToInt() / 10f else null
        _state.update { it.copy(practice = practice.copy(completed = true, paused = false, summary = summary, stars = stars, grade = grade)) }
        viewModelScope.launch {
            if (practice.assessment) {
                val result = AssessmentEntity(UUID.randomUUID().toString(), practice.lesson.level, grade ?: 0f, summary.accuracy, summary.sequence, summary.changes, summary.timing, summary.errors, summary.durationSec, (grade ?: 0f) >= 7f, System.currentTimeMillis())
                dao.saveAssessment(result, summary.durationSec.toLong())
            } else if (!practice.lesson.id.startsWith("song")) {
                val xp = (practice.lesson.xp * (.55f + summary.accuracy * .45f) + (stars - 1) * 25).roundToInt()
                dao.saveExercise(ExerciseEntity(UUID.randomUUID().toString(), practice.lesson.id, practice.lesson.level, summary.errors, summary.durationSec, summary.attempts, stars, xp, summary.accuracy, System.currentTimeMillis()), summary.durationSec.toLong())
            }
        }
    }

    private fun calculateSummary(practice: PracticeState, finished: Boolean): PracticeSummary {
        val total = practice.lesson.steps.size
        val done = accuracies.size
        val completion = done.toFloat() / total
        val accuracy = (if (accuracies.isEmpty()) 0f else accuracies.average().toFloat()) * if (finished) 1f else completion
        val sequence = firstTry.toFloat() / total
        val changes = (1f - wrongChanges.toFloat() / maxOf(1, done - 1)).coerceIn(0f, 1f) * if (finished) 1f else completion
        val expected = 4f * 60f / practice.lesson.bpm
        val intervals = acceptedTimes.drop(1).mapIndexed { index, time -> time - acceptedTimes[index] }
        val scores = intervals.map { (1f - abs(it - expected) / expected * 1.15f).coerceIn(0f, 1f) }
        val mean = if (intervals.isEmpty()) 0f else intervals.average().toFloat()
        val variance = if (intervals.size < 2) 0f else intervals.map { (it - mean).pow(2) }.average().toFloat()
        val regularity = if (mean <= 0) 0f else (1f - sqrt(variance) / mean * 1.8f).coerceIn(0f, 1f)
        val timing = (if (scores.isEmpty()) 0f else scores.average().toFloat()) * .65f + regularity * .35f
        return PracticeSummary(practice.errors, practice.attempts, practice.elapsed, accuracy, sequence, changes, timing)
    }

    fun togglePause() { _state.value.practice?.let { practice -> _state.update { it.copy(practice = practice.copy(paused = !practice.paused)) } } }
    fun finishEarly() { if (_state.value.practice?.assessment == true) finishPractice(false) }
    fun closePractice() { timerJob?.cancel(); pulseJob?.cancel(); evaluationJob?.cancel(); _state.update { it.copy(practice = null) } }
    fun updateProfile(transform: (ProfileEntity) -> ProfileEntity) {
        val updated = transform(_state.value.profile)
        _state.update { it.copy(profile = updated) }
        viewModelScope.launch { dao.saveProfile(updated) }
    }

    override fun onCleared() { closePractice(); audio.close(); midi.close(); sound.close(); super.onCleared() }
}
