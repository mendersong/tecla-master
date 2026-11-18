@file:OptIn(ExperimentalMaterial3Api::class)
package com.tecladomaster.app.ui

import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.*
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tecladomaster.app.data.*
import com.tecladomaster.app.viewmodel.*
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.roundToInt

private val Navy = Color(0xFF050A1B)
private val SurfaceNavy = Color(0xFF0B1630)
private val Surface2 = Color(0xFF122448)
private val Cyan = Color(0xFF20C8FF)
private val Green = Color(0xFF27DB7B)
private val Gold = Color(0xFFFFC736)
private val Purple = Color(0xFF9954FF)
private val Red = Color(0xFFFF5277)
private val Muted = Color(0xFF91A4C8)

@Composable fun MasterApp(model: MasterViewModel, requestMicrophone: () -> Unit) {
    val ui by model.state.collectAsStateWithLifecycle()
    val pt = ui.profile.language == "pt-BR"
    val accent = when (ui.profile.theme) { "midnight" -> Color(0xFF63B3FF); "contrast" -> Color(0xFF42DCFF); else -> Cyan }
    MaterialTheme(colorScheme = darkColorScheme(primary = accent, secondary = Green, background = Navy, surface = SurfaceNavy, onBackground = Color.White, onSurface = Color.White)) {
        var screen by remember { mutableStateOf("splash") }
        var level by remember { mutableIntStateOf(1) }
        fun go(destination: String) { screen = destination }
        BackHandler(enabled = screen != "splash" && screen != "home") {
            if (screen == "lesson") model.closePractice()
            screen = if (screen == "lesson" || screen == "songs") "levels" else "home"
        }
        if (screen == "splash") { Splash(pt) { screen = "home" }; return@MaterialTheme }
        Scaffold(
            containerColor = Navy,
            topBar = { TopAppBar(colors = TopAppBarDefaults.topAppBarColors(containerColor = Navy), title = { BrandSmall() }, actions = { Icon(Icons.Default.Star, null, tint = Gold); Text(" ${ui.exercises.sumOf { it.stars }}  ", fontWeight = FontWeight.Bold); Text("${ui.profile.xp} XP", color = accent, fontSize = 12.sp); Spacer(Modifier.width(12.dp)) }) },
            bottomBar = {
                if (screen != "lesson") NavigationBar(containerColor = SurfaceNavy) {
                    listOf(Triple("home", if (pt) "Início" else "Home", Icons.Default.Home), Triple("levels", if (pt) "Níveis" else "Levels", Icons.Default.School), Triple("songs", if (pt) "Músicas" else "Songs", Icons.Default.MusicNote), Triple("progress", if (pt) "Progresso" else "Progress", Icons.Default.BarChart), Triple("settings", if (pt) "Ajustes" else "Settings", Icons.Default.Settings)).forEach { (id, label, icon) ->
                        NavigationBarItem(selected = screen == id, onClick = { go(id) }, icon = { Icon(icon, null) }, label = { Text(label, fontSize = 9.sp) })
                    }
                }
            },
        ) { padding ->
            Box(Modifier.padding(padding).fillMaxSize().background(Brush.radialGradient(listOf(Color(0xFF102452), Navy), radius = 1300f))) {
                when (screen) {
                    "home" -> Home(ui, pt, { lesson -> model.startPractice(lesson); screen = "lesson" }, { screen = "levels" }, { screen = "songs" }, { screen = "progress" })
                    "levels" -> Levels(ui, pt, level, { level = it }, { lesson -> model.startPractice(lesson); screen = "lesson" })
                    "lesson" -> Practice(ui, pt, model, requestMicrophone, { model.closePractice(); screen = "levels" })
                    "songs" -> Songs(ui, pt, model) { lesson -> model.startPractice(lesson); screen = "lesson" }
                    "progress" -> Progress(ui, pt)
                    "settings" -> Settings(ui, pt, model, requestMicrophone)
                }
            }
        }
    }
}

@Composable private fun BrandSmall() = Row(verticalAlignment = Alignment.CenterVertically) {
    Icon(Icons.Default.Piano, null, tint = Cyan, modifier = Modifier.size(31.dp)); Spacer(Modifier.width(7.dp))
    Column { Text("TECLADO", fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic, fontSize = 14.sp, lineHeight = 13.sp); Text("MASTER", color = Cyan, fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic, fontSize = 17.sp, lineHeight = 15.sp) }
}

@Composable private fun Splash(pt: Boolean, start: () -> Unit) = Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFF102C5D), Navy, Color(0xFF100B32))))) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Icon(Icons.Default.Piano, null, tint = Cyan, modifier = Modifier.size(110.dp))
        Text("TECLADO", fontSize = 54.sp, fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic, letterSpacing = (-3).sp)
        Text("MASTER", fontSize = 61.sp, color = Cyan, fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic, letterSpacing = (-3).sp)
        Text(if (pt) "Aprenda • Pratique • Evolua" else "Learn • Practise • Evolve", fontSize = 18.sp, fontStyle = FontStyle.Italic)
        Spacer(Modifier.height(24.dp)); Text(if (pt) "Seu professor particular de teclado, na palma da sua mão!" else "Your personal keyboard teacher, in the palm of your hand!", color = Muted, textAlign = TextAlign.Center)
        Button(start, Modifier.padding(top = 32.dp).fillMaxWidth().height(58.dp), colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Color(0xFF211700)), shape = CircleShape) { Icon(Icons.Default.PlayArrow, null); Spacer(Modifier.width(8.dp)); Text(if (pt) "Começar Agora" else "Start Now", fontWeight = FontWeight.Bold, fontSize = 17.sp) }
        Spacer(Modifier.height(24.dp)); Text(if (pt) "30 aulas • Microfone • USB MIDI • Offline" else "30 lessons • Microphone • USB MIDI • Offline", color = Muted, fontSize = 11.sp)
    }
}

@Composable private fun Home(ui: MasterUiState, pt: Boolean, continueLesson: (Lesson) -> Unit, levels: () -> Unit, songs: () -> Unit, progress: () -> Unit) {
    val completed = ui.exercises.map { it.lessonId }.toSet()
    val next = nextLesson(ui)
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Card(colors = CardDefaults.cardColors(containerColor = Surface2), shape = RoundedCornerShape(24.dp)) { Column(Modifier.padding(22.dp)) {
            Text("${if (pt) "Olá" else "Hello"}, ${ui.profile.name}!", fontSize = 28.sp, fontWeight = FontWeight.Bold); Text(if (pt) "Continue sua jornada musical!" else "Continue your musical journey!", color = Muted)
            Text(if (pt) "Seu progresso" else "Your progress", Modifier.padding(top = 20.dp), fontSize = 11.sp)
            LinearProgressIndicator({ completed.size / 30f }, Modifier.fillMaxWidth().padding(vertical = 8.dp).height(8.dp).clip(CircleShape), color = Green, trackColor = Color(0xFF263A5F))
            Button({ continueLesson(next) }, Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Green, contentColor = Color(0xFF032111))) { Icon(Icons.Default.PlayArrow, null); Spacer(Modifier.width(6.dp)); Text("${if (pt) "Continuar" else "Continue"} · ${next.level}.${next.order} ${next.title(pt)}", maxLines = 1) }
        } } }
        item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            HomeAction(Modifier.weight(1f), if (pt) "Escolher Nível" else "Choose Level", Icons.Default.BarChart, Cyan, levels)
            HomeAction(Modifier.weight(1f), if (pt) "Aprender Músicas" else "Learn Songs", Icons.Default.MusicNote, Purple, songs)
            HomeAction(Modifier.weight(1f), if (pt) "Meu Progresso" else "My Progress", Icons.Default.EmojiEvents, Gold, progress)
        } }
        item { SectionTitle(if (pt) "Sua trilha" else "Your path") }
        items(Curriculum.levels) { info -> val done = Curriculum.lessonsFor(info.id).count { it.id in completed }; Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = SurfaceNavy)) { Row(Modifier.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(43.dp).clip(RoundedCornerShape(12.dp)).background(if (unlocked(ui, info.id)) Purple else Surface2), contentAlignment = Alignment.Center) { if (unlocked(ui, info.id)) Text("${info.id}", fontWeight = FontWeight.Bold) else Icon(Icons.Default.Lock, null, modifier = Modifier.size(18.dp)) }
            Column(Modifier.padding(start = 12.dp)) { Text(if (pt) info.titlePt else info.titleEn, fontWeight = FontWeight.Bold); Text("$done/6 ${if (pt) "aulas" else "lessons"}", color = Muted, fontSize = 11.sp) }
        } } }
    }
}

@Composable private fun HomeAction(modifier: Modifier, label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, color: Color, click: () -> Unit) = Card(modifier.height(118.dp).clickable(onClick = click), colors = CardDefaults.cardColors(containerColor = color.copy(alpha = .24f))) { Column(Modifier.fillMaxSize().padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) { Icon(icon, null, tint = color, modifier = Modifier.size(30.dp)); Spacer(Modifier.height(8.dp)); Text(label, textAlign = TextAlign.Center, fontSize = 11.sp, fontWeight = FontWeight.Bold) } }

@Composable private fun Levels(ui: MasterUiState, pt: Boolean, selected: Int, select: (Int) -> Unit, start: (Lesson) -> Unit) {
    val completed = ui.exercises.map { it.lessonId }.toSet()
    LazyColumn(Modifier.fillMaxSize().padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
        item { SectionTitle(if (pt) "Sua trilha de aprendizado" else "Your learning path") }
        item { LazyRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) { items(Curriculum.levels) { info -> FilterChip(selected == info.id, { select(info.id) }, label = { Text("${info.id} · ${if (pt) info.titlePt else info.titleEn}") }, leadingIcon = if (!unlocked(ui, info.id)) {{ Icon(Icons.Default.Lock, null, Modifier.size(15.dp)) }} else null) } } }
        val info = Curriculum.levels[selected - 1]
        item { Text(if (pt) info.subtitlePt else info.subtitleEn, color = Muted, modifier = Modifier.padding(vertical = 8.dp)) }
        if (!unlocked(ui, selected)) item { EmptyCard(Icons.Default.Lock, if (pt) "Obtenha 7,0 no capítulo anterior para liberar." else "Earn 7.0 in the previous chapter to unlock.") }
        else {
            items(Curriculum.lessonsFor(selected)) { lesson ->
                val previousDone = lesson.order == 1 || "l$selected-${Curriculum.lessonsFor(selected)[lesson.order - 2].id.removePrefix("l$selected-")}" in completed
                val result = ui.exercises.filter { it.lessonId == lesson.id }.maxByOrNull { it.stars }
                Card(Modifier.fillMaxWidth().clickable(enabled = previousDone) { start(lesson) }, colors = CardDefaults.cardColors(containerColor = if (previousDone) SurfaceNavy else SurfaceNavy.copy(alpha = .45f))) { Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(if (result != null) Green.copy(alpha = .2f) else Surface2), contentAlignment = Alignment.Center) { if (result != null) Icon(Icons.Default.Check, null, tint = Green) else Text("${lesson.level}.${lesson.order}") }
                    Column(Modifier.weight(1f).padding(horizontal = 12.dp)) { Text(lesson.title(pt), fontWeight = FontWeight.Bold, fontSize = 13.sp); Text(lesson.subtitle(pt), color = Muted, fontSize = 10.sp) }
                    if (result != null) Text("★".repeat(result.stars), color = Gold) else if (!previousDone) Icon(Icons.Default.Lock, null, tint = Muted)
                } }
            }
            item { val ready = Curriculum.lessonsFor(selected).all { it.id in completed }; Card(Modifier.fillMaxWidth().clickable(enabled = ready) { start(Curriculum.assessments[selected - 1]) }, colors = CardDefaults.cardColors(containerColor = if (ready) Purple.copy(alpha = .3f) else SurfaceNavy)) { Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.EmojiEvents, null, tint = Gold, modifier = Modifier.size(35.dp)); Column(Modifier.padding(start = 12.dp)) { Text(if (pt) "Avaliação do capítulo" else "Chapter assessment", fontWeight = FontWeight.Bold); Text(if (ready) "40% · 25% · 20% · 15%" else if (pt) "Conclua as 6 aulas" else "Complete all 6 lessons", color = Muted, fontSize = 10.sp) } } } }
        }
    }
}

@Composable private fun Practice(ui: MasterUiState, pt: Boolean, model: MasterViewModel, mic: () -> Unit, close: () -> Unit) {
    val practice = ui.practice ?: run { close(); return }
    val target = parseTarget(practice.lesson.steps[practice.index])
    val chord = if (target.isNote) null else parseChord(target.symbol)
    val comparison = compareNotes(target.notes, ui.activeNotes)
    LazyColumn(Modifier.fillMaxSize().padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { Row(verticalAlignment = Alignment.CenterVertically) { IconButton(close) { Icon(Icons.Default.ArrowBack, null) }; Column(Modifier.weight(1f)) { Text(if (practice.assessment) if (pt) "Avaliação prática" else "Practical assessment" else "${if (pt) "Aula" else "Lesson"} ${practice.lesson.level}.${practice.lesson.order}", color = Cyan, fontSize = 10.sp); Text(practice.lesson.title(pt), fontWeight = FontWeight.Bold, maxLines = 1) }; IconButton({ model.togglePause() }) { Icon(if (practice.paused) Icons.Default.PlayArrow else Icons.Default.Pause, null) } } }
        if (practice.completed) {
            item { ResultCard(practice, pt, close) { model.startPractice(practice.lesson, practice.assessment) } }
        } else {
            item { Card(colors = CardDefaults.cardColors(containerColor = Surface2)) { Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.sizeIn(minWidth = 82.dp).height(86.dp).clip(RoundedCornerShape(19.dp)).background(if (target.isNote) Gold else Green), contentAlignment = Alignment.Center) { Text(target.symbol, color = if (target.isNote) Color(0xFF211700) else Color.White, fontSize = 29.sp, fontWeight = FontWeight.Black) }
                Column(Modifier.padding(start = 15.dp)) { Text(if (pt) "Cifra atual" else "Current chord", color = Cyan, fontSize = 9.sp); Text(if (chord != null) "${chord.symbol} · ${if (pt) chord.type.pt else chord.type.en}" else midiName(target.notes.first(), pt), fontWeight = FontWeight.Bold); Text(chord?.type?.formula ?: if (pt) "Toque a nota indicada" else "Play the indicated note", color = Gold, fontSize = 11.sp); Text(practice.lesson.subtitle(pt), color = Muted, fontSize = 10.sp) }
            } } }
            item { LazyRow(horizontalArrangement = Arrangement.spacedBy(5.dp)) { itemsIndexed(practice.lesson.steps) { index, raw -> AssistChip(onClick = {}, label = { Text(if (index < practice.index) "✓" else parseTarget(raw).symbol) }, colors = AssistChipDefaults.assistChipColors(containerColor = if (index == practice.index) Cyan.copy(alpha = .25f) else if (index < practice.index) Green.copy(alpha = .13f) else SurfaceNavy)) } } }
            item { VirtualPiano(target, ui.activeNotes, pt, model::touch) }
            item { Card(colors = CardDefaults.cardColors(containerColor = if (practice.status == "incorrect") Red.copy(alpha = .12f) else if (practice.status == "correct") Green.copy(alpha = .12f) else SurfaceNavy)) { Row(Modifier.padding(13.dp), verticalAlignment = Alignment.CenterVertically) { Icon(if (practice.status == "correct") Icons.Default.CheckCircle else if (practice.status == "incorrect") Icons.Default.Error else Icons.Default.GraphicEq, null, tint = if (practice.status == "incorrect") Red else if (practice.status == "correct") Green else Cyan); Column(Modifier.padding(start = 10.dp)) { Text(if (practice.paused) if (pt) "Pausado" else "Paused" else if (practice.status == "correct") if (pt) "Perfeito!" else "Perfect!" else if (practice.status == "incorrect") if (pt) "Ajuste as notas" else "Adjust the notes" else if (pt) "Aguardando você tocar..." else "Waiting for you to play...", fontWeight = FontWeight.Bold, fontSize = 12.sp); Text(if (comparison.missing.isNotEmpty()) "${if (pt) "Falta" else "Missing"}: ${comparison.missing.joinToString { NOTE_NAMES[it] }}" else ui.activeNotes.sorted().joinToString(" · ") { midiName(it, pt) }.ifBlank { if (pt) "Nenhuma nota ativa" else "No active notes" }, color = Muted, fontSize = 10.sp) } } } }
            item { InputControls(ui, pt, model, mic) }
            item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) { Metric(if (pt) "Tempo" else "Time", "%02d:%02d".format(practice.elapsed.toInt() / 60, practice.elapsed.toInt() % 60)); Metric(if (pt) "Erros" else "Errors", "${practice.errors}"); Metric(if (pt) "Tentativas" else "Attempts", "${practice.attempts}"); Metric("BPM", "${practice.lesson.bpm}") } }
            item { LinearProgressIndicator({ practice.index.toFloat() / practice.lesson.steps.size }, Modifier.fillMaxWidth().height(7.dp).clip(CircleShape), color = Green) }
            if (practice.assessment) item { OutlinedButton({ model.finishEarly() }, Modifier.fillMaxWidth()) { Text(if (pt) "Encerrar e calcular nota" else "Finish and calculate grade") } }
        }
    }
}

@Composable private fun VirtualPiano(target: Target, active: Set<Int>, pt: Boolean, touch: (Int, Boolean) -> Unit) {
    val notes = 36..84
    val whites = notes.filter { it % 12 in WHITE_PCS }
    fun color(note: Int): Color {
        val expected = note in target.notes
        val detected = note in active
        if (detected && !expected && target.notes.none { it % 12 == note % 12 }) return Red
        if (expected && target.root == note % 12) return Gold
        if (expected) return Green
        return if (note % 12 in WHITE_PCS) Color(0xFFF2F4F7) else Color(0xFF080B14)
    }
    fun press(note: Int) = Modifier.pointerInput(note) { detectTapGestures(onPress = { touch(note, true); tryAwaitRelease(); touch(note, false) }) }
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(17.dp)).background(SurfaceNavy).padding(7.dp)) {
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
            Box(Modifier.width((whites.size * 43).dp).height(190.dp)) {
                Row { whites.forEach { note -> Box(Modifier.width(43.dp).height(184.dp).border(1.dp, if (note in active) Cyan else Color.Gray).background(Brush.verticalGradient(listOf(color(note), color(note).copy(alpha = .78f)))).then(press(note)), contentAlignment = Alignment.BottomCenter) { Text(if (pt) NOTE_NAMES_PT[note % 12] else NOTE_NAMES[note % 12], color = if (note in target.notes && target.root != note % 12 || note !in target.notes && note % 12 !in WHITE_PCS) Color.White else Color(0xFF172238), fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 13.dp)) } }
                notes.filter { it % 12 !in WHITE_PCS }.forEach { note -> val previous = whites.count { it < note }; Box(Modifier.offset(x = (previous * 43 - 14).dp).width(28.dp).height(112.dp).border(2.dp, if (note in active) Cyan else Color.Transparent, RoundedCornerShape(bottomStart = 4.dp, bottomEnd = 4.dp)).background(color(note)).then(press(note)), contentAlignment = Alignment.BottomCenter) { Text(NOTE_NAMES[note % 12], color = if (target.root == note % 12 && note in target.notes) Color(0xFF211700) else Color.White, fontSize = 7.sp, modifier = Modifier.padding(bottom = 8.dp)) } }
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.SpaceEvenly) { Text("● ${if (pt) "Tônica" else "Root"}", color = Gold, fontSize = 9.sp); Text("● ${if (pt) "Acorde" else "Chord"}", color = Green, fontSize = 9.sp); Text("● ${if (pt) "Detectada" else "Detected"}", color = Cyan, fontSize = 9.sp) }
    }
}

@Composable private fun InputControls(ui: MasterUiState, pt: Boolean, model: MasterViewModel, mic: () -> Unit) = Card(colors = CardDefaults.cardColors(containerColor = SurfaceNavy)) { Column(Modifier.padding(11.dp)) {
    Row(verticalAlignment = Alignment.CenterVertically) { Icon(if (ui.midiDevices.any { it.connected }) Icons.Default.Usb else Icons.Default.Mic, null, tint = Green); Column(Modifier.padding(start = 8.dp)) { Text(if (ui.midiDevices.any { it.connected }) "MIDI · ${ui.midiDevices.first { it.connected }.name}" else if (pt) "Toque ou ative o microfone" else "Touch or enable microphone", fontSize = 10.sp, fontWeight = FontWeight.Bold); Text(if (ui.midiDevices.any { it.connected }) if (pt) "Prioridade MIDI ativa" else "MIDI priority active" else if (pt) "AudioRecord / teclado de toque" else "AudioRecord / touch keyboard", color = Muted, fontSize = 8.sp) } }
    Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) { OutlinedButton(mic, Modifier.weight(1f)) { Icon(Icons.Default.Mic, null, Modifier.size(16.dp)); Text(if (pt) " Microfone" else " Microphone", fontSize = 10.sp) }; OutlinedButton({ model.stopMicrophone() }) { Text(if (pt) "Parar" else "Stop", fontSize = 10.sp) }; OutlinedButton({ model.calibrate() }) { Text(if (ui.calibrating) "..." else if (pt) "Calibrar" else "Calibrate", fontSize = 10.sp) } }
} }

@Composable private fun ResultCard(practice: PracticeState, pt: Boolean, close: () -> Unit, retry: () -> Unit) {
    val summary = practice.summary ?: return
    Card(colors = CardDefaults.cardColors(containerColor = Surface2)) { Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(if (practice.assessment && practice.grade!! >= 7) Icons.Default.EmojiEvents else Icons.Default.School, null, tint = Gold, modifier = Modifier.size(60.dp))
        Text(if (practice.assessment) "${practice.grade}".replace('.', if (pt) ',' else '.') else "★".repeat(practice.stars), color = Gold, fontSize = 48.sp, fontWeight = FontWeight.Black)
        Text(if (practice.assessment) if (practice.grade!! >= 7) if (pt) "Capítulo aprovado!" else "Chapter passed!" else if (pt) "Revise e tente novamente" else "Review and try again" else if (pt) "Aula concluída" else "Lesson completed", fontSize = 21.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(15.dp)); Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) { Metric(if (pt) "Precisão" else "Accuracy", "${(summary.accuracy * 100).roundToInt()}%"); Metric(if (pt) "Erros" else "Errors", "${summary.errors}"); Metric(if (pt) "Tempo" else "Time", "${summary.durationSec.toInt()}s") }
        if (practice.assessment) Column(Modifier.fillMaxWidth().padding(vertical = 14.dp)) { Criterion(if (pt) "Precisão · 40%" else "Accuracy · 40%", summary.accuracy); Criterion(if (pt) "Sequência · 25%" else "Sequence · 25%", summary.sequence); Criterion(if (pt) "Trocas · 20%" else "Changes · 20%", summary.changes); Criterion(if (pt) "Andamento · 15%" else "Timing · 15%", summary.timing) }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { OutlinedButton(retry) { Text(if (pt) "Refazer" else "Retake") }; Button(close) { Text(if (pt) "Revisar capítulo" else "Review chapter") } }
    } }
}

@Composable private fun Songs(ui: MasterUiState, pt: Boolean, model: MasterViewModel, start: (Lesson) -> Unit) {
    val context = LocalContext.current
    var imported by remember { mutableStateOf<List<SongStudy>>(emptyList()) }
    var speed by remember { mutableFloatStateOf(1f) }
    var repeat by remember { mutableStateOf(false) }
    val importer = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        uri ?: return@rememberLauncherForActivityResult
        runCatching {
            val text = context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }.orEmpty()
            var title = if (pt) "Minha progressão" else "My progression"; var bpm = 80
            val chords = mutableListOf<String>()
            text.lines().forEach { rawLine ->
                val line = rawLine.replace("[", "").replace("]", "").replace("\"", "").trim()
                Regex("^(?:title|título|titulo)\\s*:\\s*([^,]+)", RegexOption.IGNORE_CASE).find(line)?.let { title = it.groupValues[1].trim() }
                Regex("^bpm\\s*:\\s*(\\d+)", RegexOption.IGNORE_CASE).find(line)?.let { bpm = it.groupValues[1].toInt().coerceIn(35, 240) }
                line.split(Regex("\\s+|\\||,|>")).filter { token -> validImportedChord(token) }.forEach(chords::add)
            }
            if (chords.isNotEmpty()) imported = imported + SongStudy("import-${System.currentTimeMillis()}", title, bpm, 1, mapOf(if (pt) "Progressão" else "Progression" to chords))
        }
    }
    LazyColumn(Modifier.fillMaxSize().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { SectionTitle(if (pt) "Palco de músicas" else "Song stage") }
        item { OutlinedButton({ importer.launch(arrayOf("text/plain", "application/json", "application/octet-stream")) }, Modifier.fillMaxWidth()) { Icon(Icons.Default.FileOpen, null); Text(if (pt) " Importar cifras TXT/JSON" else " Import TXT/JSON chords") } }
        item { Card { Column(Modifier.padding(13.dp)) { Text("${if (pt) "Velocidade" else "Speed"} ${(speed * 100).roundToInt()}%"); Slider(speed, { speed = it }, valueRange = .5f..1.5f); Row(verticalAlignment = Alignment.CenterVertically) { Switch(repeat, { repeat = it }); Text(if (pt) " Repetir seção 4×" else " Loop section 4×") } } } }
        items(Curriculum.songs + imported) { song -> Card(colors = CardDefaults.cardColors(containerColor = SurfaceNavy)) { Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.MusicNote, null, tint = Cyan, modifier = Modifier.size(35.dp)); Column(Modifier.padding(start = 10.dp)) { Text(song.title, fontWeight = FontWeight.Bold); Text("${(song.bpm * speed).roundToInt()} BPM · N${song.level}", color = Muted, fontSize = 10.sp) } }
            song.sections.forEach { (name, progression) -> Text(name, color = Purple, fontSize = 10.sp, modifier = Modifier.padding(top = 9.dp)); Text(progression.joinToString(" · "), fontWeight = FontWeight.Bold, modifier = Modifier.padding(vertical = 4.dp)); val steps = if (repeat) List(4) { progression }.flatten() else progression; Button({ start(Lesson("song-${song.id}", song.level, 1, song.title, song.title, name, name, steps, (song.bpm * speed).roundToInt(), 240)) }, Modifier.fillMaxWidth()) { Icon(Icons.Default.PlayArrow, null); Text(if (pt) " Praticar seção" else " Practise section") } }
        } } }
    }
}

@Composable private fun Progress(ui: MasterUiState, pt: Boolean) {
    val completed = ui.exercises.map { it.lessonId }.toSet()
    val best = ui.assessments.groupBy { it.level }.mapValues { entry -> entry.value.maxOf { it.grade } }
    val average = if (best.isEmpty()) 0f else best.values.average().toFloat()
    LazyColumn(Modifier.fillMaxSize().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { SectionTitle(if (pt) "Seu Progresso" else "Your Progress") }
        item { Card(colors = CardDefaults.cardColors(containerColor = Surface2)) { Row(Modifier.padding(22.dp), horizontalArrangement = Arrangement.SpaceEvenly) { Metric(if (pt) "Média geral" else "Overall average", if (best.isEmpty()) "—" else "%.1f".format(average)); Metric("XP", "${ui.profile.xp}"); Metric(if (pt) "Aulas" else "Lessons", "${completed.size}/30"); Metric(if (pt) "Estrelas" else "Stars", "${ui.exercises.sumOf { it.stars }}") } } }
        items(Curriculum.levels) { info -> val done = Curriculum.lessonsFor(info.id).count { it.id in completed }; Card { ListItem(headlineContent = { Text(if (pt) info.titlePt else info.titleEn) }, supportingContent = { Text("$done/6 · ${best[info.id]?.let { "${if (pt) "Nota" else "Grade"} $it" } ?: if (pt) "Sem avaliação" else "No assessment"}") }, leadingContent = { Icon(if (unlocked(ui, info.id)) Icons.Default.School else Icons.Default.Lock, null, tint = if (unlocked(ui, info.id)) Cyan else Muted) }) } }
        item { SectionTitle(if (pt) "Histórico de avaliações" else "Assessment history") }
        if (ui.assessments.isEmpty()) item { EmptyCard(Icons.Default.BarChart, if (pt) "Sua primeira avaliação ainda está esperando." else "Your first assessment is still waiting.") }
        items(ui.assessments) { result -> Card { ListItem(headlineContent = { Text("${if (pt) "Nível" else "Level"} ${result.level} · ${if (result.passed) if (pt) "Aprovado" else "Passed" else if (pt) "Revisar" else "Review"}") }, supportingContent = { Text("${SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(Date(result.completedAt))} · ${(result.accuracy * 100).roundToInt()}% · ${result.errors} ${if (pt) "erros" else "errors"}") }, trailingContent = { Text("%.1f".format(result.grade), color = if (result.passed) Green else Red, fontSize = 24.sp, fontWeight = FontWeight.Bold) }) } }
    }
}

@Composable private fun Settings(ui: MasterUiState, pt: Boolean, model: MasterViewModel, mic: () -> Unit) {
    val p = ui.profile
    LazyColumn(Modifier.fillMaxSize().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { SectionTitle(if (pt) "Ajustes" else "Settings") }
        item { Card { Column(Modifier.padding(15.dp)) { Text(if (pt) "Nome do músico" else "Musician name"); OutlinedTextField(p.name, { model.updateProfile { profile -> profile.copy(name = it.take(40)) } }, Modifier.fillMaxWidth()); Text(if (pt) "Idioma" else "Language", Modifier.padding(top = 12.dp)); Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) { FilterChip(p.language == "pt-BR", { model.updateProfile { it.copy(language = "pt-BR") } }, label = { Text("Português (BR)") }); FilterChip(p.language == "en", { model.updateProfile { it.copy(language = "en") } }, label = { Text("English") }) } } } }
        item { Card { Column(Modifier.padding(15.dp)) { Text(if (pt) "Áudio e reconhecimento" else "Audio and recognition", fontWeight = FontWeight.Bold); InputControls(ui, pt, model, mic); SettingSlider(if (pt) "Sensibilidade" else "Sensitivity", p.micSensitivity) { value -> model.updateProfile { it.copy(micSensitivity = value) } }; SettingSlider(if (pt) "Filtro de ruído" else "Noise gate", p.noiseGate) { value -> model.updateProfile { it.copy(noiseGate = value) } }; SettingSlider(if (pt) "Volume" else "Volume", p.soundVolume) { value -> model.updateProfile { it.copy(soundVolume = value) } }; Text(if (pt) "Entrada prioritária" else "Input priority"); Row { listOf("auto" to "Auto", "midi" to "MIDI", "microphone" to "Mic", "touch" to (if (pt) "Toque" else "Touch")).forEach { (id, label) -> FilterChip(p.inputMode == id, { model.updateProfile { it.copy(inputMode = id) } }, label = { Text(label, fontSize = 9.sp) }, modifier = Modifier.padding(end = 4.dp)) } } } } }
        item { Card { Column(Modifier.padding(15.dp)) { Text(if (pt) "Tema" else "Theme", fontWeight = FontWeight.Bold); Row { listOf("nebula", "midnight", "contrast").forEach { theme -> FilterChip(p.theme == theme, { model.updateProfile { it.copy(theme = theme) } }, label = { Text(theme) }, modifier = Modifier.padding(end = 5.dp)) } }; Text(if (pt) "O idioma e o tema não alteram seu progresso." else "Language and theme never affect your progress.", color = Muted, fontSize = 10.sp, modifier = Modifier.padding(top = 12.dp)); Text("Room · Android 9+ · Offline", color = Green, fontSize = 10.sp) } } }
    }
}

private fun unlocked(ui: MasterUiState, level: Int) = level == 1 || ui.assessments.any { it.level == level - 1 && it.passed }
private fun nextLesson(ui: MasterUiState): Lesson {
    val completed = ui.exercises.map { it.lessonId }.toSet()
    Curriculum.levels.forEach { info ->
        if (!unlocked(ui, info.id)) return@forEach
        Curriculum.lessonsFor(info.id).firstOrNull { it.id !in completed }?.let { return it }
        if (ui.assessments.none { it.level == info.id && it.passed }) return Curriculum.assessments[info.id - 1]
    }
    return Curriculum.lessons.last()
}
private fun validImportedChord(token: String): Boolean {
    val match = Regex("^([A-G](?:#|b)?)(.*)$").matchEntire(token) ?: return false
    return CHORD_TYPES.any { it.suffix == match.groupValues[2] }
}
@Composable private fun SectionTitle(text: String) = Text(text, fontSize = 23.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(vertical = 8.dp))
@Composable private fun Metric(label: String, value: String) = Column(horizontalAlignment = Alignment.CenterHorizontally) { Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Cyan); Text(label, color = Muted, fontSize = 9.sp) }
@Composable private fun Criterion(label: String, value: Float) = Column(Modifier.padding(vertical = 4.dp)) { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(label, fontSize = 10.sp); Text("${(value * 100).roundToInt()}%", fontSize = 10.sp) }; LinearProgressIndicator({ value }, Modifier.fillMaxWidth(), color = Green) }
@Composable private fun SettingSlider(label: String, value: Float, change: (Float) -> Unit) = Column { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(label, fontSize = 11.sp); Text("${(value * 100).roundToInt()}%", fontSize = 11.sp) }; Slider(value, change, valueRange = 0f..1f) }
@Composable private fun EmptyCard(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) = Card { Column(Modifier.fillMaxWidth().padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) { Icon(icon, null, tint = Muted, modifier = Modifier.size(40.dp)); Text(text, color = Muted, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp)) } }
