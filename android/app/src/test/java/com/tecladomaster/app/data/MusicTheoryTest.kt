package com.tecladomaster.app.data

import org.junit.Assert.*
import org.junit.Test

class MusicTheoryTest {
    @Test fun majorMinorAndSeventhsUseRealIntervals() {
        assertEquals(setOf(0, 4, 7), parseChord("C").pitchClasses)
        assertEquals(setOf(0, 3, 7), parseChord("Cm").pitchClasses)
        assertEquals(setOf(7, 11, 2, 5), parseChord("G7").pitchClasses)
        assertEquals(setOf(0, 4, 7, 11), parseChord("C7M").pitchClasses)
    }
    @Test fun inversionsMoveBassUpAnOctave() {
        assertEquals(listOf(60, 64, 67), chordNotes("C", 4, 0))
        assertEquals(listOf(64, 67, 72), chordNotes("C", 4, 1))
        assertEquals(listOf(67, 72, 76), chordNotes("C", 4, 2))
    }
    @Test fun comparisonReportsMissingAndIncorrect() {
        val comparison = compareNotes(listOf(60, 64, 67), setOf(60, 64, 70))
        assertEquals(setOf(0, 4), comparison.correct)
        assertEquals(setOf(7), comparison.missing)
        assertEquals(setOf(10), comparison.incorrect)
        assertFalse(comparison.perfect)
    }
    @Test fun bassCoordinationIncludesLowRoot() {
        val target = parseTarget("C:bass")
        assertEquals(36, target.notes.first())
        assertEquals(listOf(36, 60, 64, 67), target.notes)
    }
}
