package com.tecladomaster.app.data

data class Lesson(
    val id: String, val level: Int, val order: Int, val titlePt: String, val titleEn: String,
    val subtitlePt: String, val subtitleEn: String, val steps: List<String>, val bpm: Int = 72,
    val estimatedSec: Int = 90, val xp: Int = 100,
) {
    fun title(portuguese: Boolean) = if (portuguese) titlePt else titleEn
    fun subtitle(portuguese: Boolean) = if (portuguese) subtitlePt else subtitleEn
}
data class LevelInfo(val id: Int, val titlePt: String, val titleEn: String, val subtitlePt: String, val subtitleEn: String)
data class SongStudy(val id: String, val title: String, val bpm: Int, val level: Int, val sections: Map<String, List<String>>)

private fun lesson(level: Int, order: Int, id: String, pt: String, en: String, subPt: String, subEn: String, steps: List<String>, bpm: Int = 72, seconds: Int = 90) =
    Lesson("l$level-$id", level, order, pt, en, subPt, subEn, steps, bpm, seconds, 80 + level * 20)

object Curriculum {
    val levels = listOf(
        LevelInfo(1, "Primeiros Passos", "First Steps", "Notas, mapa e coordenação", "Notes, map and coordination"),
        LevelInfo(2, "Acordes Básicos", "Basic Chords", "Maiores, menores e trocas", "Major, minor and changes"),
        LevelInfo(3, "Acompanhamento", "Accompaniment", "Progressões, ritmo e duas mãos", "Progressions, rhythm and two hands"),
        LevelInfo(4, "Intermediário", "Intermediate", "Sétimas, inversões e suspensos", "Sevenths, inversions and suspensions"),
        LevelInfo(5, "Avançado", "Advanced", "Extensões, campo e improviso", "Extensions, harmony and improvisation"),
    )
    val lessons = listOf(
        lesson(1,1,"mapa","O mapa do teclado","The keyboard map","Encontre Dó pelas teclas pretas","Find C using the black keys",listOf("note:C","note:D","note:E"),60,55),
        lesson(1,2,"naturais","As sete notas naturais","The seven natural notes","Complete o alfabeto musical","Complete the musical alphabet",listOf("note:F","note:G","note:A","note:B","note:C"),64,65),
        lesson(1,3,"acidentes","Sustenidos e bemóis","Sharps and flats","As teclas entre as naturais","The keys between naturals",listOf("note:C#","note:D#","note:F#","note:G#","note:A#"),60,70),
        lesson(1,4,"oitavas","Oitavas e registro","Octaves and register","O mesmo nome, outra altura","Same name, different height",listOf("note:C","note:G","note:C","note:F","note:F","note:C"),68,70),
        lesson(1,5,"intervalos","Distância entre notas","Distance between notes","Segundas, terças e quintas","Seconds, thirds and fifths",listOf("note:C","note:D","note:C","note:E","note:C","note:G"),70,75),
        lesson(1,6,"frase","Sua primeira frase musical","Your first musical phrase","Cinco notas com pulso constante","Five notes with a steady pulse",listOf("note:C","note:D","note:E","note:F","note:G","note:F","note:E","note:D","note:C"),72,90),
        lesson(2,1,"maior-c","O acorde C — Dó Maior","The C major chord","Tônica, terça maior e quinta","Root, major third and fifth",listOf("C","C","C"),64,70),
        lesson(2,2,"maiores-fg","F e G maiores","F and G major","Transporte a mesma geometria","Move the same geometry",listOf("F","F","G","G"),66,80),
        lesson(2,3,"menores","A cor dos acordes menores","The colour of minor chords","Am, Dm e Em","Am, Dm and Em",listOf("Am","Am","Dm","Dm","Em","Em"),66,90),
        lesson(2,4,"construcao","Construa pela fórmula","Build from the formula","D, E e A sem decorar","D, E and A without memorising",listOf("D","E","A","D","A"),68,95),
        lesson(2,5,"trocas","Trocas sem interromper o pulso","Changes without breaking the pulse","C–G e Am–F","C–G and Am–F",listOf("C","G","C","G","Am","F","Am","F"),72,95),
        lesson(2,6,"ciclo","Seu primeiro ciclo de acordes","Your first chord cycle","C–F–G–C","C–F–G–C",listOf("C","F","G","C","C","F","G","C"),76,110),
        lesson(3,1,"colchao","Acompanhamento em colchão","Pad accompaniment","Acordes longos com baixo","Long chords with bass",listOf("C:bass","F:bass","G:bass","C:bass"),68,100),
        lesson(3,2,"pop","A progressão pop essencial","The essential pop progression","C–G–Am–F","C–G–Am–F",listOf("C","G","Am","F","C","G","Am","F"),80,105),
        lesson(3,3,"baixo","Baixo alternado","Alternating bass","Tônica e quinta na esquerda","Root and fifth on the left",listOf("C:bass","C:bass","F:bass","F:bass","G:bass","G:bass","C:bass","C:bass"),76,110),
        lesson(3,4,"arpejo","Arpejo de tríade","Triad arpeggio","O acorde desdobrado","The chord unfolded",listOf("note:C","note:E","note:G","note:E","note:F","note:A","note:C","note:A","note:G","note:B","note:D","note:B"),84,110),
        lesson(3,5,"pulso","Acentos e regularidade","Accents and regularity","Ritmo não é correr","Rhythm is not rushing",listOf("C","C","F","F","Am","Am","G","G"),88,105),
        lesson(3,6,"dois-compassos","Padrão de dois compassos","Two-bar pattern","I–vi–IV–V completo","Complete I–vi–IV–V",listOf("C","Am","F","G","C","Am","F","G","C"),84,120),
        lesson(4,1,"setima","A sétima dominante","The dominant seventh","G7 e C7: tensão e destino","G7 and C7: tension and destination",listOf("G7","C","C7","F","G7","C"),70,110),
        lesson(4,2,"7m","Sétima maior e menor com sétima","Major and minor sevenths","C7M, Dm7 e Em7","Cmaj7, Dm7 and Em7",listOf("C7M","C7M","Dm7","Dm7","Em7","Em7"),68,115),
        lesson(4,3,"inversoes","Inversões: novo baixo","Inversions: new bass","Fundamental, 1ª e 2ª inversões","Root, first and second inversions",listOf("C@0","C@1","C@2","F@0","F@1","F@2"),66,120),
        lesson(4,4,"sus","Acordes suspensos","Suspended chords","Csus4 e Gsus2 sem terça","Csus4 and Gsus2 without thirds",listOf("Csus4","C","Csus4","C","Gsus2","G","Gsus4","G"),74,110),
        lesson(4,5,"ii-v-i","O caminho ii–V–I","The ii–V–I path","Dm7–G7–C7M","Dm7–G7–Cmaj7",listOf("Dm7:bass","G7:bass","C7M:bass","Dm7:bass","G7:bass","C7M:bass"),76,125),
        lesson(4,6,"embalo","Progressão com cores suspensas","Progression with suspended colours","Forma de oito compassos","Eight-bar form",listOf("C7M","Am7","Dm7","G7","C7M","Fsus4","F","G7","C7M"),82,130),
        lesson(5,1,"dim-aug","Diminutos e aumentados","Diminished and augmented","Simetria, tensão e passagem","Symmetry, tension and passing motion",listOf("Cdim","C","Caug","F","Gdim","G","Gaug","C"),68,125),
        lesson(5,2,"extensoes","Nonas e extensões","Ninths and extensions","Cadd9, C9 e Am9","Cadd9, C9 and Am9",listOf("Cadd9","Cadd9","C9","C9","Am9","Am9"),64,135),
        lesson(5,3,"campo","Campo harmônico maior","Major harmonic field","Sete acordes da mesma escala","Seven chords from one scale",listOf("C","Dm","Em","F","G7","Am","Bdim","C"),78,130),
        lesson(5,4,"transposicao","Transposição na prática","Transposition in practice","A mesma função em Dó e Sol","The same function in C and G",listOf("C","Am","F","G","G","Em","C","D"),82,135),
        lesson(5,5,"rearmonizacao","Rearmonização e voicings","Reharmonisation and voicings","Uma progressão, duas cores","One progression, two colours",listOf("C","Am","F","G","C7M","Am9","Fadd9","G7"),76,145),
        lesson(5,6,"improviso","Improviso sobre acordes","Improvising over chords","Melodia pelas notas do acorde","Melody through chord tones",listOf("note:E","C7M","note:G","Am9","note:A","Fadd9","note:B","G7","note:C","C7M"),88,150),
    )
    val assessments = listOf(
        Lesson("assessment-1",1,7,"Avaliação · Primeiros Passos","Assessment · First Steps","Notas, sequência, trocas e pulso","Notes, sequence, changes and pulse",listOf("note:C","note:D","note:E","note:G","note:F","note:A","note:G","note:E","note:D","note:C"),64,180),
        Lesson("assessment-2",2,7,"Avaliação · Acordes Básicos","Assessment · Basic Chords","Tríades maiores e menores","Major and minor triads",listOf("C","F","G","C","Am","Dm","G","C"),72,180),
        Lesson("assessment-3",3,7,"Avaliação · Acompanhamento","Assessment · Accompaniment","Progressão pop com baixo","Pop progression with bass",listOf("C:bass","G:bass","Am:bass","F:bass","C:bass","Am:bass","F:bass","G:bass","C:bass"),80,200),
        Lesson("assessment-4",4,7,"Avaliação · Intermediário","Assessment · Intermediate","Sétimas, suspensos e inversões","Sevenths, suspensions and inversions",listOf("C7M","Dm7","G7","C7M","Fsus4","F","Am7","G7","C@1"),76,200),
        Lesson("assessment-5",5,7,"Avaliação · Avançado","Assessment · Advanced","Extensões, campo e transposição","Extensions, harmony and transposition",listOf("C7M","Dm9","G9","Cadd9","Am9","Fadd9","Bdim","G7","G9","Em","C7M","D7"),84,240),
    )
    val songs = listOf(
        SongStudy("amanhecer","Amanhecer em Dó",84,2,mapOf("Introdução" to listOf("C","G"),"Tema A" to listOf("C","G","Am","F"),"Tema B" to listOf("F","G","C","C"))),
        SongStudy("orbita","Órbita Neon",96,3,mapOf("Órbita" to listOf("Am","F","C","G"),"Ascensão" to listOf("Dm","Am","F","G"),"Retorno" to listOf("Am","F","C","G"))),
        SongStudy("cais","Cais do Norte",76,3,mapOf("Margem" to listOf("D","A","Bm","G"),"Correnteza" to listOf("Em","G","D","A"))),
        SongStudy("vidro","Passos de Vidro",104,4,mapOf("Passo I" to listOf("Em","C","G","D"),"Passo II" to listOf("Em7","C7M","G","D7"))),
        SongStudy("horizonte","Horizonte Suspenso",72,4,mapOf("Névoa" to listOf("Csus4","C","Gsus4","G"),"Clareira" to listOf("Fsus2","F","Gsus2","G"))),
        SongStudy("estacao","Última Estação",88,5,mapOf("Plataforma" to listOf("C7M","Am7","Dm7","G7"),"Partida" to listOf("Em7","Am9","Dm9","G9"))),
    )
    fun lessonsFor(level: Int) = lessons.filter { it.level == level }.sortedBy { it.order }
}
