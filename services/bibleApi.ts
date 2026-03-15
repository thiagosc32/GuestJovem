/**
 * Serviço de Bíblia completa.
 * API primária: bible-api.com (Almeida — português).
 * Fallback: A Bíblia Digital (abibliadigital.com.br) quando disponível.
 */

const BIBLE_API = 'https://bible-api.com';
const ABIBLIA_BASE = 'https://www.abibliadigital.com.br/api';

export type BibleVersion = 'almeida' | 'nvi' | 'acf' | 'ra';
const DEFAULT_VERSION: BibleVersion = 'almeida';

/** Versões disponíveis para seleção na UI */
export const BIBLE_VERSIONS: { id: BibleVersion; label: string; fullName: string }[] = [
  { id: 'almeida', label: 'Almeida', fullName: 'João Ferreira de Almeida' },
  { id: 'nvi', label: 'NVI', fullName: 'Nova Versão Internacional' },
  { id: 'acf', label: 'ACF', fullName: 'Almeida Corrigida Fiel' },
  { id: 'ra', label: 'RA', fullName: 'Almeida Revista e Atualizada' },
];

export interface BibleBook {
  abbrev: { pt: string; en?: string };
  id?: string; // bible-api.com usa "id" (ex: GEN)
  name: string;
  author?: string;
  group?: string;
  testament: 'VT' | 'NT';
  chapters: number;
}

export interface BibleVerse {
  number: number;
  text: string;
}

export interface BibleChapter {
  book: { abbrev: { pt: string }; name: string; author?: string; group?: string; version?: string };
  chapter: { number: number; verses: number };
  verses: BibleVerse[];
}

// Quantidade de capítulos por livro (Bíblia protestante padrão)
const CHAPTER_COUNTS: Record<string, number> = {
  GEN: 50, EXO: 40, LEV: 27, NUM: 36, DEU: 34, JOS: 24, JDG: 21, RUT: 4,
  '1SA': 31, '2SA': 24, '1KI': 22, '2KI': 25, '1CH': 29, '2CH': 36, EZR: 10, NEH: 13,
  EST: 10, JOB: 42, PSA: 150, PRO: 31, ECC: 12, SNG: 8, ISA: 66, JER: 52,
  LAM: 5, EZK: 48, DAN: 12, HOS: 14, JOL: 3, AMO: 9, OBA: 1, JON: 4, MIC: 7,
  NAM: 3, HAB: 3, ZEP: 3, HAG: 2, ZEC: 14, MAL: 4, MAT: 28, MRK: 16, LUK: 24,
  JHN: 21, ACT: 28, ROM: 16, '1CO': 16, '2CO': 13, GAL: 6, EPH: 6, PHP: 4,
  COL: 4, '1TH': 5, '2TH': 3, '1TI': 6, '2TI': 4, TIT: 3, PHM: 1, HEB: 13,
  JAS: 5, '1PE': 5, '2PE': 3, '1JN': 5, '2JN': 1, '3JN': 1, JUD: 1, REV: 22,
};

const VT_IDS = ['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL'] as const;
const NT_IDS = ['MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'];

let cachedBooks: BibleBook[] | null = null;

/** Lista dos 66 livros — via bible-api.com (mais estável). */
export async function getBibleBooks(): Promise<BibleBook[]> {
  if (cachedBooks) return cachedBooks;
  try {
    const res = await fetch(`${BIBLE_API}/data/almeida`);
    if (!res.ok) throw new Error('Falha ao carregar livros');
    const data = await res.json();
    const rawBooks = data?.books || [];
    if (rawBooks.length === 0) throw new Error('Resposta vazia');
    cachedBooks = rawBooks.map((b: { id: string; name: string }) => ({
      abbrev: { pt: b.id.toLowerCase(), en: b.id },
      id: b.id,
      name: b.name,
      testament: VT_IDS.includes(b.id) ? 'VT' as const : 'NT' as const,
      chapters: CHAPTER_COUNTS[b.id] ?? 1,
    }));
    return cachedBooks;
  } catch (e) {
    console.error('bibleApi.getBibleBooks:', e);
    cachedBooks = null;
    return [];
  }
}

/** Retorna um capítulo completo. Tenta bible-api.com primeiro, depois A Bíblia Digital. */
export async function getChapter(
  version: BibleVersion,
  bookIdOrAbbrev: string,
  chapter: number
): Promise<BibleChapter | null> {
  const id = (bookIdOrAbbrev || '').toUpperCase().trim();
  if (!id || chapter < 1) return null;

  // 1) bible-api.com (Almeida) — usa ID em maiúsculas
  if (version === 'almeida' || !version) {
    try {
      const url = `${BIBLE_API}/data/almeida/${id}/${chapter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Não encontrado');
      const data = await res.json();
      const verses = data?.verses || [];
      if (verses.length === 0) throw new Error('Capítulo vazio');
      const first = verses[0];
      return {
        book: {
          abbrev: { pt: (first?.book_id || id).toLowerCase() },
          name: first?.book || 'Bíblia',
          version: 'almeida',
        },
        chapter: { number: chapter, verses: verses.length },
        verses: verses.map((v: { verse: number; text: string }) => ({
          number: v.verse,
          text: (v.text || '').trim(),
        })),
      };
    } catch (e) {
      console.warn('bibleApi.getChapter (bible-api):', e);
    }
  }

  // 2) A Bíblia Digital (nvi, acf, ra) — quando versão diferente de Almeida
  if (version !== 'almeida') {
    try {
      const abbrev = id.length <= 3 ? mapIdToAbbrev(id) : id.toLowerCase();
      const res = await fetch(`${ABIBLIA_BASE}/verses/${version}/${abbrev}/${chapter}`);
      if (res.ok) {
        const data = await res.json();
        if (!data?.msg) return data as BibleChapter;
      }
    } catch (e) {
      console.warn('bibleApi.getChapter (abiblia):', e);
    }
  }

  // 3) Fallback final: bible-api.com Almeida (mais estável)
  try {
    const res = await fetch(`${BIBLE_API}/data/almeida/${id}/${chapter}`);
    if (!res.ok) return null;
    const data = await res.json();
    const verses = data?.verses || [];
    if (verses.length === 0) return null;
    const first = verses[0];
    return {
      book: {
        abbrev: { pt: (first?.book_id || id).toLowerCase() },
        name: first?.book || 'Bíblia',
        version: 'almeida',
      },
      chapter: { number: chapter, verses: verses.length },
      verses: verses.map((v: { verse: number; text: string }) => ({
        number: v.verse,
        text: (v.text || '').trim(),
      })),
    };
  } catch (e) {
    console.error('bibleApi.getChapter:', e);
    return null;
  }
}

/** Mapeia ID em inglês (GEN) para abreviação PT (gn) usada pela A Bíblia Digital. */
function mapIdToAbbrev(id: string): string {
  const m: Record<string, string> = {
    GEN: 'gn', EXO: 'ex', LEV: 'lv', NUM: 'nm', DEU: 'dt', JOS: 'js', JDG: 'jz', RUT: 'rt',
    '1SA': '1sm', '2SA': '2sm', '1KI': '1rs', '2KI': '2rs', '1CH': '1cr', '2CH': '2cr',
    EZR: 'ed', NEH: 'ne', EST: 'et', JOB: 'job', PSA: 'sl', PRO: 'pv', ECC: 'ec', SNG: 'ct',
    ISA: 'is', JER: 'jr', LAM: 'lm', EZK: 'ez', DAN: 'dn', HOS: 'os', JOL: 'jl', AMO: 'am',
    OBA: 'ob', JON: 'jn', MIC: 'mq', NAM: 'na', HAB: 'hc', ZEP: 'sf', HAG: 'ag', ZEC: 'zc',
    MAL: 'ml', MAT: 'mt', MRK: 'mc', LUK: 'lc', JHN: 'jo', ACT: 'at', ROM: 'rm',
    '1CO': '1co', '2CO': '2co', GAL: 'gl', EPH: 'ef', PHP: 'fp', COL: 'cl',
    '1TH': '1ts', '2TH': '2ts', '1TI': '1tm', '2TI': '2tm', TIT: 'tt', PHM: 'fm',
    HEB: 'hb', JAS: 'tg', '1PE': '1pe', '2PE': '2pe', '1JN': '1jo', '2JN': '2jo', '3JN': '3jo',
    JUD: 'jd', REV: 'ap',
  };
  return m[id] || id.toLowerCase();
}

export { DEFAULT_VERSION };
