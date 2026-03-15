/**
 * Planos de leitura bíblica.
 * Cada plano define leituras diárias; o usuário escolhe o dia atual para ver o que ler.
 */

export interface DailyReading {
  bookId: string;
  chapter: number;
  /** Nome amigável do livro (ex: "Provérbios") */
  bookName?: string;
}

export interface BibleReadingPlan {
  id: string;
  name: string;
  description: string;
  totalDays: number;
  /** Retorna a leitura do dia (1-based). */
  getReadingForDay: (day: number) => DailyReading[];
  /** Se definido, o plano permite escolher duração em meses ao ser selecionado. */
  configurableMonths?: { min: number; max: number };
}

/** Plano personalizado criado pelo usuário. */
export interface CustomReadingPlan extends BibleReadingPlan {
  id: string; // prefixed with "custom_"
  readings: DailyReading[][]; // dia 1 = index 0
}

// NT em ordem: 28+16+24+21+28+16+16+13+6+6+4+4+5+3+6+4+3+1+13+5+5+3+5+1+1+1+22 = 260 capítulos
const NT_SCHEDULE: { bookId: string; chapters: number }[] = [
  { bookId: 'MAT', chapters: 28 }, { bookId: 'MRK', chapters: 16 }, { bookId: 'LUK', chapters: 24 },
  { bookId: 'JHN', chapters: 21 }, { bookId: 'ACT', chapters: 28 }, { bookId: 'ROM', chapters: 16 },
  { bookId: '1CO', chapters: 16 }, { bookId: '2CO', chapters: 13 }, { bookId: 'GAL', chapters: 6 },
  { bookId: 'EPH', chapters: 6 }, { bookId: 'PHP', chapters: 4 }, { bookId: 'COL', chapters: 4 },
  { bookId: '1TH', chapters: 5 }, { bookId: '2TH', chapters: 3 }, { bookId: '1TI', chapters: 6 },
  { bookId: '2TI', chapters: 4 }, { bookId: 'TIT', chapters: 3 }, { bookId: 'PHM', chapters: 1 },
  { bookId: 'HEB', chapters: 13 }, { bookId: 'JAS', chapters: 5 }, { bookId: '1PE', chapters: 5 },
  { bookId: '2PE', chapters: 3 }, { bookId: '1JN', chapters: 5 }, { bookId: '2JN', chapters: 1 },
  { bookId: '3JN', chapters: 1 }, { bookId: 'JUD', chapters: 1 }, { bookId: 'REV', chapters: 22 },
];

export const BOOK_NAMES: Record<string, string> = {
  GEN: 'Gênesis', EXO: 'Êxodo', LEV: 'Levítico', NUM: 'Números', DEU: 'Deuteronômio',
  JOS: 'Josué', JDG: 'Juízes', RUT: 'Rute', '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1KI': '1 Reis', '2KI': '2 Reis', '1CH': '1 Crônicas', '2CH': '2 Crônicas',
  EZR: 'Esdras', NEH: 'Neemias', EST: 'Ester', JOB: 'Jó', PSA: 'Salmos', PRO: 'Provérbios',
  ECC: 'Eclesiastes', SNG: 'Cânticos', ISA: 'Isaías', JER: 'Jeremias', LAM: 'Lamentações',
  EZK: 'Ezequiel', DAN: 'Daniel', HOS: 'Oséias', JOL: 'Joel', AMO: 'Amós', OBA: 'Obadias',
  JON: 'Jonas', MIC: 'Miquéias', NAM: 'Naum', HAB: 'Habacuque', ZEP: 'Sofonias',
  HAG: 'Ageu', ZEC: 'Zacarias', MAL: 'Malaquias', MAT: 'Mateus', MRK: 'Marcos',
  LUK: 'Lucas', JHN: 'João', ACT: 'Atos', ROM: 'Romanos', '1CO': '1 Coríntios',
  '2CO': '2 Coríntios', GAL: 'Gálatas', EPH: 'Efésios', PHP: 'Filipenses', COL: 'Colossenses',
  '1TH': '1 Tessalonicenses', '2TH': '2 Tessalonicenses', '1TI': '1 Timóteo',
  '2TI': '2 Timóteo', TIT: 'Tito', PHM: 'Filemom', HEB: 'Hebreus', JAS: 'Tiago',
  '1PE': '1 Pedro', '2PE': '2 Pedro', '1JN': '1 João', '2JN': '2 João', '3JN': '3 João',
  JUD: 'Judas', REV: 'Apocalipse',
};

export const BIBLE_BOOK_IDS = Object.keys(BOOK_NAMES) as string[];

/** Número de capítulos por livro (Bíblia protestante 66 livros) */
export const BOOK_CHAPTERS: Record<string, number> = {
  GEN: 50, EXO: 40, LEV: 27, NUM: 36, DEU: 34, JOS: 24, JDG: 21, RUT: 4,
  '1SA': 31, '2SA': 24, '1KI': 22, '2KI': 25, '1CH': 29, '2CH': 36,
  EZR: 10, NEH: 13, EST: 10, JOB: 42, PSA: 150, PRO: 31, ECC: 12, SNG: 8,
  ISA: 66, JER: 52, LAM: 5, EZK: 48, DAN: 12, HOS: 14, JOL: 3, AMO: 9,
  OBA: 1, JON: 4, MIC: 7, NAM: 3, HAB: 3, ZEP: 3, HAG: 2, ZEC: 14, MAL: 4,
  MAT: 28, MRK: 16, LUK: 24, JHN: 21, ACT: 28, ROM: 16, '1CO': 16, '2CO': 13,
  GAL: 6, EPH: 6, PHP: 4, COL: 4, '1TH': 5, '2TH': 3, '1TI': 6, '2TI': 4,
  TIT: 3, PHM: 1, HEB: 13, JAS: 5, '1PE': 5, '2PE': 3, '1JN': 5, '2JN': 1,
  '3JN': 1, JUD: 1, REV: 22,
};

/** Retorna o número de capítulos do livro (1 se desconhecido). */
export function getBookChapterCount(bookId: string): number {
  return BOOK_CHAPTERS[bookId] ?? 1;
}

function buildNT90Days(): DailyReading[][] {
  const days: DailyReading[][] = [];
  let dayReadings: DailyReading[] = [];
  let count = 0;
  for (const { bookId, chapters } of NT_SCHEDULE) {
    for (let ch = 1; ch <= chapters; ch++) {
      dayReadings.push({
        bookId,
        chapter: ch,
        bookName: BOOK_NAMES[bookId],
      });
      count++;
      if (count >= 3) {
        days.push(dayReadings);
        dayReadings = [];
        count = 0;
      }
    }
  }
  if (dayReadings.length > 0) days.push(dayReadings);
  return days;
}

const NT_90_DAYS = buildNT90Days();

/** Ordem dos 66 livros (AT + NT) para o plano Bíblia completa */
const FULL_BIBLE_ORDER: { bookId: string; chapters: number }[] = [
  { bookId: 'GEN', chapters: 50 }, { bookId: 'EXO', chapters: 40 }, { bookId: 'LEV', chapters: 27 },
  { bookId: 'NUM', chapters: 36 }, { bookId: 'DEU', chapters: 34 }, { bookId: 'JOS', chapters: 24 },
  { bookId: 'JDG', chapters: 21 }, { bookId: 'RUT', chapters: 4 }, { bookId: '1SA', chapters: 31 },
  { bookId: '2SA', chapters: 24 }, { bookId: '1KI', chapters: 22 }, { bookId: '2KI', chapters: 25 },
  { bookId: '1CH', chapters: 29 }, { bookId: '2CH', chapters: 36 }, { bookId: 'EZR', chapters: 10 },
  { bookId: 'NEH', chapters: 13 }, { bookId: 'EST', chapters: 10 }, { bookId: 'JOB', chapters: 42 },
  { bookId: 'PSA', chapters: 150 }, { bookId: 'PRO', chapters: 31 }, { bookId: 'ECC', chapters: 12 },
  { bookId: 'SNG', chapters: 8 }, { bookId: 'ISA', chapters: 66 }, { bookId: 'JER', chapters: 52 },
  { bookId: 'LAM', chapters: 5 }, { bookId: 'EZK', chapters: 48 }, { bookId: 'DAN', chapters: 12 },
  { bookId: 'HOS', chapters: 14 }, { bookId: 'JOL', chapters: 3 }, { bookId: 'AMO', chapters: 9 },
  { bookId: 'OBA', chapters: 1 }, { bookId: 'JON', chapters: 4 }, { bookId: 'MIC', chapters: 7 },
  { bookId: 'NAM', chapters: 3 }, { bookId: 'HAB', chapters: 3 }, { bookId: 'ZEP', chapters: 3 },
  { bookId: 'HAG', chapters: 2 }, { bookId: 'ZEC', chapters: 14 }, { bookId: 'MAL', chapters: 4 },
  ...NT_SCHEDULE,
];

/** Constrói o plano Bíblia completa para N dias (distribui 1189 capítulos) */
function buildFullBibleDays(totalDays: number): DailyReading[][] {
  const allChapters: DailyReading[] = [];
  for (const { bookId, chapters } of FULL_BIBLE_ORDER) {
    for (let ch = 1; ch <= chapters; ch++) {
      allChapters.push({
        bookId,
        chapter: ch,
        bookName: BOOK_NAMES[bookId],
      });
    }
  }
  const totalChapters = allChapters.length;
  const minPerDay = Math.floor(totalChapters / totalDays);
  const remainder = totalChapters - minPerDay * totalDays;
  const days: DailyReading[][] = [];
  let idx = 0;
  for (let d = 0; d < totalDays; d++) {
    const count = minPerDay + (d < remainder ? 1 : 0);
    const dayReadings = allChapters.slice(idx, idx + count);
    idx += count;
    days.push(dayReadings);
  }
  return days;
}

/** Cria o plano Bíblia completa com duração em meses (1 a 36). totalDays = meses × 30. */
export function buildFullBiblePlan(months: number): BibleReadingPlan {
  const monthsClamped = Math.max(1, Math.min(36, months));
  const totalDays = monthsClamped * 30;
  const days = buildFullBibleDays(totalDays);
  return {
    id: `biblia_completa_${monthsClamped}`,
    name: monthsClamped === 12 ? 'Bíblia completa em 1 ano' : `Bíblia completa em ${monthsClamped} meses`,
    description: `Leia a Bíblia inteira em ${monthsClamped} meses (~${totalDays} dias). Na ordem dos livros.`,
    totalDays: days.length,
    getReadingForDay: (day) => (day >= 1 && day <= days.length ? days[day - 1] : []),
  };
}

export const BIBLE_READING_PLANS: BibleReadingPlan[] = [
  {
    id: 'biblia_completa',
    name: 'Bíblia completa',
    description: 'Leia a Bíblia inteira. Escolha a duração em meses (1 a 36).',
    totalDays: 365,
    getReadingForDay: () => [],
    configurableMonths: { min: 1, max: 36 },
  },
  {
    id: 'proverbios_31',
    name: 'Provérbios em 31 dias',
    description: 'Um capítulo por dia. Sabedoria prática para a vida.',
    totalDays: 31,
    getReadingForDay: (day) =>
      day >= 1 && day <= 31
        ? [{ bookId: 'PRO', chapter: day, bookName: 'Provérbios' }]
        : [],
  },
  {
    id: 'joao_21',
    name: 'Evangelho de João em 21 dias',
    description: 'Um capítulo por dia. Conheça a vida e os ensinos de Jesus.',
    totalDays: 21,
    getReadingForDay: (day) =>
      day >= 1 && day <= 21
        ? [{ bookId: 'JHN', chapter: day, bookName: 'João' }]
        : [],
  },
  {
    id: 'salmos_30',
    name: 'Salmos em 30 dias',
    description: 'Cinco salmos por dia. Louvor e oração em 30 dias.',
    totalDays: 30,
    getReadingForDay: (day) => {
      if (day < 1 || day > 30) return [];
      const start = (day - 1) * 5 + 1;
      return Array.from({ length: 5 }, (_, i) => ({
        bookId: 'PSA',
        chapter: Math.min(start + i, 150),
        bookName: 'Salmos',
      }));
    },
  },
  {
    id: 'nt_90',
    name: 'Novo Testamento em 90 dias',
    description: 'Aproximadamente 3 capítulos por dia. Leia o NT completo.',
    totalDays: NT_90_DAYS.length,
    getReadingForDay: (day) =>
      day >= 1 && day <= NT_90_DAYS.length ? NT_90_DAYS[day - 1] : [],
  },
];
