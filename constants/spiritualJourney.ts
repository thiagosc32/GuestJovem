/**
 * Constantes da Jornada Espiritual
 * Progressão baseada em práticas espirituais — sem mérito religioso, sem ranking, sem punição.
 * Objetivo: incentivar constância, não performance.
 */

/** Tipos de ação que registram práticas (valor técnico ainda chamado XP no banco) */
export type SpiritualActionType = 'devotional' | 'prayer_register' | 'event_checkin' | 'reflection' | 'discipline';

/**
 * Critérios de progresso (práticas que contam na jornada).
 * Cada prática soma passos; o total reflete constância ao longo do tempo, não "nota" espiritual.
 */
export const PROGRESSION_CRITERIA_LABELS: Record<SpiritualActionType, string> = {
  devotional: 'Leitura bíblica concluída',
  prayer_register: 'Registro de oração',
  event_checkin: 'Participação em eventos, planos ou desafios',
  reflection: 'Registro de reflexões espirituais',
  discipline: 'Participação em disciplinas espirituais (planos/desafios)',
};

/** Passos registrados por prática — discipline usa valor da disciplina em options */
export const XP_BY_ACTION: Record<SpiritualActionType, number> = {
  devotional: 5,
  prayer_register: 10,
  event_checkin: 15,
  reflection: 15,
  discipline: 0,
};

/**
 * Diretrizes da progressão (garantidas na lógica do serviço):
 * - Progressão gradual: limites diários e 1x/dia em várias ações evitam picos de "performance".
 * - Sem punição por inatividade: total de passos nunca diminui; inatividade só não soma.
 * - Sem regressão automática de nível: o nível é sempre o maior já alcançado para o total atual.
 * - Foco em constância: streak celebra semanas com alguma prática, sem penalizar quem parar.
 */
export const PROGRESSION_GUIDELINES = {
  gradual: true,
  noPunishmentForInactivity: true,
  noLevelRegression: true,
  encouragesConsistency: true,
} as const;

/** Limite máximo de passos em um único dia — favorece constância ao longo do tempo, não maratonas */
export const DAILY_XP_CAP = 50;

/** Label para uso na UI: unidade de crescimento (não "XP" nem "pontos") */
export const GROWTH_UNIT_LABEL = 'passos';

/**
 * Declaração base do sistema (OBRIGATÓRIA) — exibir em onboarding, tela de níveis, tooltips de bloqueio e termos.
 * Os níveis não medem fé, santidade ou valor espiritual.
 */
export const LEVEL_DISCLAIMER_MESSAGE =
  'Os níveis deste app não medem fé, santidade ou valor espiritual. Eles existem apenas para organizar a jornada de crescimento dentro da plataforma e incentivar a constância com Deus, de forma saudável, segura e respeitosa.';

/** Versão curta para tooltips de bloqueio. */
export const LEVEL_DISCLAIMER_SHORT =
  'Seu nível não reflete sua fé. Reflete apenas sua experiência dentro do app.';

/** Versão expandida (sobre os níveis). */
export const LEVEL_DISCLAIMER_EXPANDED =
  'Eventos são para todos. Os níveis apenas organizam a experiência no app — segurança, organização e cuidado na comunidade.';

/** Frase fixa do app (João 15) — exibir onde fizer sentido (badges, jornada, etc.). */
export const GROWTH_PHRASE = 'Crescer não é competir, é permanecer.';
export const GROWTH_PHRASE_REF = 'João 15';

/** Ações que contam apenas uma vez por dia — valoriza repetição no tempo, não quantidade no dia */
export const ONCE_PER_DAY_ACTIONS: SpiritualActionType[] = ['devotional', 'prayer_register', 'reflection'];

/**
 * Funcionalidades sugeridas por etapa — incentivo, não bloqueio.
 * Nenhuma função essencial é bloqueada; isso serve para destacar "indicado para sua etapa".
 */
export interface LevelFeatureSuggestion {
  id: string;
  label: string;
  /** Tela/rota opcional para deep link ou "Explorar" */
  screen?: string;
}

/** Eventos são prática espiritual livre — todos os níveis participam. Não incluir como "desbloqueio". */
export const LEVEL_SUGGESTED_FEATURES: Record<number, LevelFeatureSuggestion[]> = {
  1: [
    { id: 'devotional', label: 'Leitura básica e devocional diário', screen: 'DevotionalScreen' },
    { id: 'prayer', label: 'Pedidos de oração (criar e orar por)', screen: 'PrayerRequestScreen' },
    { id: 'reflection', label: 'Reflexões espirituais', screen: 'SpiritualReflectionsScreen' },
    { id: 'events', label: 'Eventos — participe de cultos e encontros', screen: 'EventsScreen' },
  ],
  2: [
    { id: 'community_interact', label: 'Curtir e comentar na comunidade', screen: 'CommunityWall' },
    { id: 'disciplines', label: 'Disciplinas espirituais', screen: 'DisciplinesScreen' },
  ],
  3: [
    { id: 'guided_studies', label: 'Estudos em grupo', screen: 'GuidedStudiesScreen' },
    { id: 'badges', label: 'Conquistas e badges', screen: 'BadgesScreen' },
    { id: 'community', label: 'Participar da comunidade', screen: 'CommunityWall' },
  ],
  4: [
    { id: 'create_content', label: 'Criar posts na comunidade', screen: 'CommunityWall' },
    { id: 'prayer_respond', label: 'Responder pedidos de oração', screen: 'PrayerRequestScreen' },
    { id: 'mentorship', label: 'Mentoria e missões semanais', screen: 'CommunityWall' },
  ],
  5: [
    { id: 'leadership', label: 'Liderança e multiplicação', screen: 'CommunityWall' },
    { id: 'disciple', label: 'Discipulado e formação', screen: 'CommunityWall' },
    { id: 'serve', label: 'Servir e encorajar', screen: 'PrayerRequestScreen' },
  ],
};

/**
 * Retorna as funcionalidades sugeridas para a etapa (incentivo; nada é bloqueado).
 * Para liberação/bloqueio por nível, use o sistema central em constants/featureGates.ts:
 * getAvailableFeaturesByLevel(level) e isFeatureAvailableForLevel(featureId, level).
 */
export function getSuggestedFeaturesForLevel(level: number): LevelFeatureSuggestion[] {
  const features = LEVEL_SUGGESTED_FEATURES[level];
  return features ?? LEVEL_SUGGESTED_FEATURES[1];
}

/** Etapas da jornada bíblica: level e minXp mantidos para compatibilidade com progressão salva */
export interface SpiritualLevelConfig {
  level: number;
  name: string;
  minXp: number;
  /** Título exibido na interface */
  title: string;
  /** Descrição curta (até 120 caracteres) — cards, tooltips */
  shortDescription: string;
  /** Descrição longa — tom pastoral, encorajador */
  longDescription: string;
  /** Frase bíblica inspiracional (não precisa ser citação literal) */
  inspirationalPhrase: string;
  /** Referência bíblica (ex.: Mt 13, Cl 2:7) */
  verse?: string;
  /** @deprecated Use shortDescription. Mantido para compatibilidade com getLevelInfo. */
  description: string;
}

export const SPIRITUAL_LEVELS: SpiritualLevelConfig[] = [
  {
    level: 1,
    name: 'Ouvir',
    title: 'Ouvir',
    minXp: 0,
    description: 'Cheguei agora.',
    shortDescription: 'Chegou agora. Foco: receber e observar.',
    longDescription:
      'Você está chegando agora na plataforma. Pode usar devocional, Bíblia, versículo do dia, jornada, disciplinas, eventos (ver, inscrever, check-in), pedidos de oração (ver e criar) e comunidade (ver posts). Eventos são para todos — o nível mede uso e maturidade dentro do app, não acesso à comunhão presencial.',
    inspirationalPhrase: 'Conhecer o app é o primeiro passo. Sem pressa.',
    verse: 'Mt 13',
  },
  {
    level: 2,
    name: 'Seguir',
    title: 'Seguir',
    minXp: 150,
    description: 'Pertencimento.',
    shortDescription: 'Pertencimento. Foco: criar vínculo.',
    longDescription:
      'Você está criando vínculo. Pode tudo do Semente, mais curtir e comentar na comunidade e interagir em pedidos de oração. Ainda não: criar post, conquistas, estudos guiados. O nível reflete experiência no app, não valor espiritual.',
    inspirationalPhrase: 'A constância no uso ajuda você a aproveitar mais o app.',
    verse: 'Cl 2:7',
  },
  {
    level: 3,
    name: 'Permanecer',
    title: 'Permanecer',
    minXp: 450,
    description: 'Crescimento.',
    shortDescription: 'Crescimento. Foco: constância espiritual.',
    longDescription:
      'Você demonstra constância espiritual. Pode tudo do Raiz, mais estudos em grupo, tela de conquistas e badges no perfil. Ainda não: criar post, mentoria, missões semanais.',
    inspirationalPhrase: 'Sua participação contribui para a comunidade do app.',
    verse: 'Jo 15:5',
  },
  {
    level: 4,
    name: 'Frutificar',
    title: 'Frutificar',
    minXp: 900,
    description: 'Serviço.',
    shortDescription: 'Serviço. Foco: gerar vida.',
    longDescription:
      'Você está pronto para servir. Pode tudo do Caule, mais criar posts na comunidade, responder pedidos de oração, mentoria e missões semanais. Isso reflete comportamento consistente no app, não autoridade espiritual.',
    inspirationalPhrase: 'Sua confiabilidade no app abre novas formas de servir.',
    verse: 'Gl 5:22-23',
  },
  {
    level: 5,
    name: 'Multiplicar',
    title: 'Multiplicar',
    minXp: 1500,
    description: 'Multiplicação.',
    shortDescription: 'Multiplicação. Foco: liderança espiritual.',
    longDescription:
      'Você exerce liderança funcional na plataforma. Pode tudo do Fruto, mais criar missões, criar estudos simples, destaque visual, reação especial e influenciar outros níveis. Não é admin, mas é referência espiritual no app.',
    inspirationalPhrase: 'Sua experiência no app permite multiplicar cuidado e organização.',
    verse: 'Mt 9:37',
  },
];

// ---------------------------------------------------------------------------
// Migração: níveis antigos → níveis atuais (jornada bíblica)
// Nenhum usuário perde progresso: número do nível (1-5) e faixas de minXp foram
// mantidos; apenas os nomes e textos de cada etapa mudaram.
// ---------------------------------------------------------------------------

/** Nomes dos níveis no sistema antigo (por número de nível 1–5), para referência e migração */
export const LEGACY_LEVEL_NAMES: Record<number, string> = {
  1: 'Semente',
  2: 'Broto',
  3: 'Raiz',
  4: 'Árvore',
  5: 'Fruto',
} as const;

/** Níveis atuais (nomes João 15) por número — mesma numeração e mesmas faixas de minXp */
export const CURRENT_LEVEL_NAMES: Record<number, string> = {
  1: 'Ouvir',
  2: 'Seguir',
  3: 'Permanecer',
  4: 'Frutificar',
  5: 'Multiplicar',
} as const;

/**
 * Mapeamento oficial: nível antigo (1–5) → nível novo (1–5).
 * Equivalência direta: nível e faixas de total_xp (0, 150, 450, 900, 1500) foram preservados.
 * Quem estava no nível X antigo permanece no nível X no novo sistema (só o nome da etapa mudou).
 */
export const LEGACY_TO_CURRENT_LEVEL_MAP: Record<number, number> = {
  1: 1, // Semente → Semente
  2: 2, // Broto → Raiz
  3: 3, // Raiz → Caule
  4: 4, // Árvore → Fruto
  5: 5, // Fruto → Colheita
};

/**
 * Converte um nível legado (número 1–5) para o nível atual.
 * Critério conservador: nunca rebaixar. Se o nível legado for inválido ou fora da faixa, retorna 1.
 */
export function mapLegacyLevelToCurrent(legacyLevel: number): number {
  if (legacyLevel < 1 || legacyLevel > 5) return 1;
  return LEGACY_TO_CURRENT_LEVEL_MAP[legacyLevel] ?? legacyLevel;
}

/**
 * Converte um nome de nível legado para o número do nível atual (1–5).
 * Útil se em algum lugar o sistema antigo armazenou o nome em vez do número.
 * Critério conservador: em dúvida, mantém o nível mais alto possível (ex.: "Fruto" antigo = 5).
 */
export const LEGACY_LEVEL_NAME_TO_NUMBER: Record<string, number> = {
  Semente: 1,
  Broto: 2,
  Raiz: 3,
  Árvore: 4,
  Fruto: 5,
};

export function mapLegacyLevelNameToCurrent(legacyName: string): number {
  const normalized = legacyName?.trim() ?? '';
  const num = LEGACY_LEVEL_NAME_TO_NUMBER[normalized];
  if (num != null) return mapLegacyLevelToCurrent(num);
  return 1; // sem equivalência clara → conservador: não assumir nível alto
}

/** Número de dias na semana para contar streak de constância */
export const STREAK_DAYS_REQUIRED = 5;
export const DAYS_IN_WEEK = 7;

/** Mínimo de dias distintos com prática diária para a semana contar na constância (streak) */
export const MIN_ACTIVE_DAYS_FOR_VALID_WEEK = 3;

/** Chaves das disciplinas diárias que contam para "dias ativos" (Leitura da Palavra, Secreto com Deus, Devocional diário, Gratidão) */
export const DAILY_PRACTICE_DISCIPLINE_KEYS = ['reading', 'prayer_secret', 'devotional_daily', 'gratitude'] as const;
