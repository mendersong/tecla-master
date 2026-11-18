export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const NOTE_NAMES_PT = ["Dó", "Dó#", "Ré", "Ré#", "Mi", "Fá", "Fá#", "Sol", "Sol#", "Lá", "Lá#", "Si"] as const;
export const WHITE_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);

export interface ChordType {
  suffix: string;
  intervals: number[];
  pt: string;
  en: string;
  formula: string;
  descriptionPt: string;
  descriptionEn: string;
}

export const CHORD_TYPES: ChordType[] = [
  { suffix: "7M", intervals: [0, 4, 7, 11], pt: "sétima maior", en: "major seventh", formula: "1 – 3 – 5 – 7M", descriptionPt: "A sétima maior adiciona uma cor sofisticada e aberta ao acorde maior.", descriptionEn: "The major seventh adds a sophisticated, open colour to the major triad." },
  { suffix: "m7M", intervals: [0, 3, 7, 11], pt: "menor com sétima maior", en: "minor major seventh", formula: "1 – 3m – 5 – 7M", descriptionPt: "Combina a tríade menor com a sétima maior, criando tensão cinematográfica.", descriptionEn: "Combines a minor triad with a major seventh for cinematic tension." },
  { suffix: "m7", intervals: [0, 3, 7, 10], pt: "menor com sétima", en: "minor seventh", formula: "1 – 3m – 5 – 7", descriptionPt: "Acorde menor com sétima menor, muito usado como segundo grau.", descriptionEn: "Minor triad with a minor seventh, often used as the second degree." },
  { suffix: "sus4", intervals: [0, 5, 7], pt: "suspenso em quarta", en: "suspended fourth", formula: "1 – 4 – 5", descriptionPt: "A quarta substitui a terça e cria uma sonoridade suspensa, sem maior ou menor.", descriptionEn: "The fourth replaces the third, creating a suspended sound that is neither major nor minor." },
  { suffix: "sus2", intervals: [0, 2, 7], pt: "suspenso em segunda", en: "suspended second", formula: "1 – 2 – 5", descriptionPt: "A segunda substitui a terça, produzindo uma textura leve e moderna.", descriptionEn: "The second replaces the third for a light, modern texture." },
  { suffix: "dim", intervals: [0, 3, 6], pt: "diminuto", en: "diminished", formula: "1 – 3m – 5♭", descriptionPt: "Duas terças menores empilhadas geram forte tensão e pedem resolução.", descriptionEn: "Two stacked minor thirds create strong tension that asks for resolution." },
  { suffix: "aug", intervals: [0, 4, 8], pt: "aumentado", en: "augmented", formula: "1 – 3 – 5#", descriptionPt: "A quinta aumentada expande a tríade maior e cria instabilidade.", descriptionEn: "The augmented fifth expands the major triad and creates instability." },
  { suffix: "add9", intervals: [0, 4, 7, 14], pt: "com nona adicionada", en: "added ninth", formula: "1 – 3 – 5 – 9", descriptionPt: "Mantém a tríade maior e acrescenta a nona sem a sétima.", descriptionEn: "Keeps the major triad and adds the ninth without a seventh." },
  { suffix: "m9", intervals: [0, 3, 7, 10, 14], pt: "menor com nona", en: "minor ninth", formula: "1 – 3m – 5 – 7 – 9", descriptionPt: "Extensão rica do acorde menor com sétima e nona.", descriptionEn: "A rich minor extension with seventh and ninth." },
  { suffix: "9", intervals: [0, 4, 7, 10, 14], pt: "com nona", en: "dominant ninth", formula: "1 – 3 – 5 – 7 – 9", descriptionPt: "Acorde dominante com nona, comum em funk, soul e jazz.", descriptionEn: "Dominant chord with a ninth, common in funk, soul and jazz." },
  { suffix: "6", intervals: [0, 4, 7, 9], pt: "com sexta", en: "sixth", formula: "1 – 3 – 5 – 6", descriptionPt: "A sexta maior dá um fechamento suave e vintage ao acorde.", descriptionEn: "The major sixth gives the chord a smooth, vintage finish." },
  { suffix: "7", intervals: [0, 4, 7, 10], pt: "sétima dominante", en: "dominant seventh", formula: "1 – 3 – 5 – 7m", descriptionPt: "A sétima menor sobre a tríade maior cria a tensão dominante.", descriptionEn: "A minor seventh over a major triad creates dominant tension." },
  { suffix: "m", intervals: [0, 3, 7], pt: "menor", en: "minor", formula: "1 – 3m – 5", descriptionPt: "A terça menor, três semitons acima da tônica, define a sonoridade menor.", descriptionEn: "The minor third, three semitones above the root, defines the minor sound." },
  { suffix: "", intervals: [0, 4, 7], pt: "maior", en: "major", formula: "1 – 3 – 5", descriptionPt: "Formado por tônica, terça maior e quinta justa: quatro e três semitons.", descriptionEn: "Built from root, major third and perfect fifth: four then three semitones." },
];

export interface Chord {
  symbol: string;
  root: number;
  rootName: string;
  type: ChordType;
  pitchClasses: number[];
  intervals: number[];
}

export function normalizeRoot(name: string): number {
  const flats: Record<string, number> = { Db: 1, Eb: 3, Gb: 6, Ab: 8, Bb: 10, Cb: 11, Fb: 4, "B#": 0, "E#": 5 };
  if (flats[name] !== undefined) return flats[name];
  const index = NOTE_NAMES.indexOf(name as (typeof NOTE_NAMES)[number]);
  return index >= 0 ? index : 0;
}

export function parseChord(symbol: string): Chord {
  const clean = symbol.trim().replace(/\(.*?\)/g, "");
  const match = clean.match(/^([A-G](?:#|b)?)(.*)$/);
  const rootName = match?.[1] ?? "C";
  const suffix = match?.[2] ?? "";
  const type = CHORD_TYPES.find((item) => item.suffix === suffix) ?? CHORD_TYPES[CHORD_TYPES.length - 1];
  const root = normalizeRoot(rootName);
  const pitchClasses = [...new Set(type.intervals.map((interval) => (root + interval) % 12))];
  return { symbol: `${rootName}${type.suffix}`, root, rootName, type, pitchClasses, intervals: type.intervals };
}

export function buildChord(symbol: string, octave = 4, inversion = 0): number[] {
  const chord = parseChord(symbol);
  const base = 12 * (octave + 1) + chord.root;
  const notes = chord.intervals.map((interval) => base + interval);
  for (let i = 0; i < inversion && notes.length > 0; i += 1) {
    const note = notes.shift();
    if (note !== undefined) notes.push(note + 12);
  }
  return notes;
}

export function midiLabel(midi: number, language: "pt-BR" | "en" = "en"): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${language === "pt-BR" ? NOTE_NAMES_PT[pc] : NOTE_NAMES[pc]}${octave}`;
}

export function pitchClassLabel(pc: number, language: "pt-BR" | "en" = "en"): string {
  return language === "pt-BR" ? NOTE_NAMES_PT[((pc % 12) + 12) % 12] : NOTE_NAMES[((pc % 12) + 12) % 12];
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function frequencyToMidi(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

export function comparePitchClasses(expected: number[], detected: number[]) {
  const expectedPcs = [...new Set(expected.map((note) => ((note % 12) + 12) % 12))];
  const detectedPcs = [...new Set(detected.map((note) => ((note % 12) + 12) % 12))];
  const correct = expectedPcs.filter((pc) => detectedPcs.includes(pc));
  const missing = expectedPcs.filter((pc) => !detectedPcs.includes(pc));
  const incorrect = detectedPcs.filter((pc) => !expectedPcs.includes(pc));
  return { correct, missing, incorrect, accuracy: expectedPcs.length ? correct.length / expectedPcs.length : 0 };
}

export function identifyChord(notes: number[]): Chord | null {
  const pcs = [...new Set(notes.map((note) => ((note % 12) + 12) % 12))].sort((a, b) => a - b);
  if (pcs.length < 3) return null;
  let best: { chord: Chord; score: number } | null = null;
  for (let root = 0; root < 12; root += 1) {
    for (const type of CHORD_TYPES) {
      const symbol = `${NOTE_NAMES[root]}${type.suffix}`;
      const chord = parseChord(symbol);
      const same = chord.pitchClasses.length === pcs.length && chord.pitchClasses.every((pc) => pcs.includes(pc));
      if (!same) continue;
      const rootIsBass = notes.length > 0 && ((Math.min(...notes) % 12) + 12) % 12 === root;
      const score = 100 - type.intervals.length + (rootIsBass ? 3 : 0);
      if (!best || score > best.score) best = { chord, score };
    }
  }
  return best?.chord ?? null;
}

export function transposeSymbol(symbol: string, semitones: number): string {
  const chord = parseChord(symbol);
  const root = ((chord.root + semitones) % 12 + 12) % 12;
  return `${NOTE_NAMES[root]}${chord.type.suffix}`;
}

export function harmonicField(root: number, mode: "major" | "minor" = "major") {
  const major = [
    { degree: "I", suffix: "" }, { degree: "ii", suffix: "m" }, { degree: "iii", suffix: "m" },
    { degree: "IV", suffix: "" }, { degree: "V", suffix: "7" }, { degree: "vi", suffix: "m" }, { degree: "vii°", suffix: "dim" },
  ];
  const minor = [
    { degree: "i", suffix: "m" }, { degree: "ii°", suffix: "dim" }, { degree: "III", suffix: "" },
    { degree: "iv", suffix: "m" }, { degree: "v", suffix: "m" }, { degree: "VI", suffix: "" }, { degree: "VII", suffix: "" },
  ];
  const scale = mode === "major" ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  return (mode === "major" ? major : minor).map((item, index) => ({ ...item, symbol: `${NOTE_NAMES[(root + scale[index]) % 12]}${item.suffix}` }));
}

export const FINGERINGS: Record<string, number[]> = {
  "": [1, 3, 5], m: [1, 3, 5], sus4: [1, 3, 5], sus2: [1, 2, 5], dim: [1, 3, 5], aug: [1, 3, 5],
  "7": [1, 2, 3, 5], "7M": [1, 2, 3, 5], m7: [1, 2, 3, 5], "6": [1, 2, 3, 5], add9: [1, 2, 3, 5], "9": [1, 2, 3, 4, 5], m9: [1, 2, 3, 4, 5], m7M: [1, 2, 3, 5],
};
