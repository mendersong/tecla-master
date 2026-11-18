package com.tecladomaster.app.data

import kotlin.math.pow

val NOTE_NAMES = listOf("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
val NOTE_NAMES_PT = listOf("Dó", "Dó#", "Ré", "Ré#", "Mi", "Fá", "Fá#", "Sol", "Sol#", "Lá", "Lá#", "Si")
val WHITE_PCS = setOf(0, 2, 4, 5, 7, 9, 11)

data class ChordType(val suffix: String, val intervals: List<Int>, val pt: String, val en: String, val formula: String)
val CHORD_TYPES = listOf(
    ChordType("7M", listOf(0, 4, 7, 11), "sétima maior", "major seventh", "1–3–5–7M"),
    ChordType("m7M", listOf(0, 3, 7, 11), "menor com sétima maior", "minor major seventh", "1–3m–5–7M"),
    ChordType("m7", listOf(0, 3, 7, 10), "menor com sétima", "minor seventh", "1–3m–5–7"),
    ChordType("sus4", listOf(0, 5, 7), "suspenso em quarta", "suspended fourth", "1–4–5"),
    ChordType("sus2", listOf(0, 2, 7), "suspenso em segunda", "suspended second", "1–2–5"),
    ChordType("dim", listOf(0, 3, 6), "diminuto", "diminished", "1–3m–5♭"),
    ChordType("aug", listOf(0, 4, 8), "aumentado", "augmented", "1–3–5#"),
    ChordType("add9", listOf(0, 4, 7, 14), "nona adicionada", "added ninth", "1–3–5–9"),
    ChordType("m9", listOf(0, 3, 7, 10, 14), "menor com nona", "minor ninth", "1–3m–5–7–9"),
    ChordType("9", listOf(0, 4, 7, 10, 14), "nona dominante", "dominant ninth", "1–3–5–7–9"),
    ChordType("6", listOf(0, 4, 7, 9), "com sexta", "sixth", "1–3–5–6"),
    ChordType("7", listOf(0, 4, 7, 10), "sétima dominante", "dominant seventh", "1–3–5–7m"),
    ChordType("m", listOf(0, 3, 7), "menor", "minor", "1–3m–5"),
    ChordType("", listOf(0, 4, 7), "maior", "major", "1–3–5"),
)

data class Chord(val symbol: String, val root: Int, val type: ChordType) {
    val pitchClasses: Set<Int> get() = type.intervals.map { (root + it) % 12 }.toSet()
}
data class Target(val symbol: String, val notes: List<Int>, val root: Int?, val isNote: Boolean, val bass: Boolean, val inversion: Int)
data class Comparison(val correct: Set<Int>, val missing: Set<Int>, val incorrect: Set<Int>) {
    val perfect: Boolean get() = correct.isNotEmpty() && missing.isEmpty() && incorrect.isEmpty()
}

fun rootPc(name: String): Int = when (name) {
    "Db" -> 1; "Eb" -> 3; "Gb" -> 6; "Ab" -> 8; "Bb" -> 10; "Cb" -> 11; "B#" -> 0; "E#" -> 5
    else -> NOTE_NAMES.indexOf(name).coerceAtLeast(0)
}

fun parseChord(symbol: String): Chord {
    val match = Regex("^([A-G](?:#|b)?)(.*)$").find(symbol.trim())
    val rootName = match?.groupValues?.get(1) ?: "C"
    val suffix = match?.groupValues?.get(2) ?: ""
    val type = CHORD_TYPES.firstOrNull { it.suffix == suffix } ?: CHORD_TYPES.last()
    return Chord("$rootName${type.suffix}", rootPc(rootName), type)
}

fun chordNotes(symbol: String, octave: Int = 4, inversion: Int = 0): List<Int> {
    val chord = parseChord(symbol)
    val notes = chord.type.intervals.map { 12 * (octave + 1) + chord.root + it }.toMutableList()
    repeat(inversion.coerceIn(0, notes.lastIndex)) { notes += notes.removeAt(0) + 12 }
    return notes
}

fun parseTarget(raw: String): Target {
    val bass = raw.endsWith(":bass")
    val noBass = raw.removeSuffix(":bass")
    if (noBass.startsWith("note:")) {
        val name = noBass.removePrefix("note:")
        return Target(name, listOf(60 + rootPc(name)), rootPc(name), true, false, 0)
    }
    val inversionMatch = Regex("^(.*)@(\\d)$").find(noBass)
    val symbol = inversionMatch?.groupValues?.get(1) ?: noBass
    val inversion = inversionMatch?.groupValues?.get(2)?.toIntOrNull() ?: 0
    val chord = parseChord(symbol)
    val notes = chordNotes(symbol, 4, inversion).toMutableList()
    if (bass) notes.add(0, 36 + chord.root)
    return Target(symbol, notes, chord.root, false, bass, inversion)
}

fun compareNotes(expected: List<Int>, detected: Set<Int>): Comparison {
    val wanted = expected.map { ((it % 12) + 12) % 12 }.toSet()
    val played = detected.map { ((it % 12) + 12) % 12 }.toSet()
    return Comparison(wanted.intersect(played), wanted - played, played - wanted)
}

fun midiName(note: Int, portuguese: Boolean): String {
    val pc = ((note % 12) + 12) % 12
    return "${if (portuguese) NOTE_NAMES_PT[pc] else NOTE_NAMES[pc]}${note / 12 - 1}"
}

fun midiFrequency(note: Int) = 440.0 * 2.0.pow((note - 69) / 12.0)
fun frequencyMidi(frequency: Double) = (69 + 12 * (kotlin.math.log(frequency / 440.0, 2.0))).toInt()

fun harmonicField(root: Int, minor: Boolean = false): List<String> {
    val scale = if (minor) listOf(0, 2, 3, 5, 7, 8, 10) else listOf(0, 2, 4, 5, 7, 9, 11)
    val suffixes = if (minor) listOf("m", "dim", "", "m", "m", "", "") else listOf("", "m", "m", "", "7", "m", "dim")
    return scale.mapIndexed { index, interval -> "${NOTE_NAMES[(root + interval) % 12]}${suffixes[index]}" }
}
