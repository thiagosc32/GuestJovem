/**
 * Sistema central de liberação de funcionalidades por nível da jornada espiritual.
 *
 * Regras:
 * - Funcionalidades em FEATURES_ALWAYS_AVAILABLE (ALL) NUNCA podem ser bloqueadas por nível — base da vida cristã e comunhão.
 * - Outras com minLevel 1 estão disponíveis para todos; minLevel 2+ são liberadas progressivamente.
 * - O nível NUNCA mede valor espiritual; serve só para organizar a jornada e incentivar constância.
 *
 * Uso:
 * - getAvailableFeaturesByLevel(level) → lista de funcionalidades acessíveis.
 * - isFeatureAvailableForLevel(featureId, level) → checagem pontual (menu, botões, rotas).
 */

/** Identificadores das funcionalidades que podem ser gated por nível */
export type FeatureId =
  | 'journey'
  | 'devotional'
  | 'prayer'
  | 'reflections'
  | 'disciplines'
  | 'community'
  | 'events'
  | 'community_like_comment'
  | 'community_post'
  | 'plans_challenges'
  | 'mentorship'
  | 'leadership'
  | 'bible'
  | 'spiritual_profile'
  | 'guided_studies'
  | 'group_study_create'
  | 'badges'
  | 'prayer_respond'
  | 'prayer_interact';

/**
 * Funcionalidades OBRIGATÓRIAS (ALL): devem estar disponíveis para TODOS os usuários, independente do nível espiritual.
 * Base da vida cristã e comunhão — nenhuma pode ser bloqueada por nível.
 * Eventos (ver, inscrever, check-in) são para todos — o nível mede uso no app, não acesso à comunhão presencial.
 */
export const FEATURES_ALWAYS_AVAILABLE: readonly FeatureId[] = [
  'devotional',        // Devocional semanal
  'prayer',            // Pedidos de oração (ver, criar e orar por)
  'prayer_interact',   // Orar por e comentar — liberado para todos
  'community',         // Comunidade (ver posts)
  'bible',             // Bíblia
  'spiritual_profile', // Perfil espiritual do usuário
  'events',            // Eventos (ver, inscrever, check-in) — todos os níveis participam plenamente
  'guided_studies',    // Estudos em grupo (ver, participar, debater) — acesso a todos
] as const;

export type AlwaysAvailableFeatureId = (typeof FEATURES_ALWAYS_AVAILABLE)[number];

/** Verifica se a funcionalidade faz parte do conjunto ALL (nunca bloqueável). */
export function isAlwaysAvailableFeature(featureId: FeatureId): featureId is AlwaysAvailableFeatureId {
  return (FEATURES_ALWAYS_AVAILABLE as readonly string[]).includes(featureId);
}

export interface FeatureGate {
  id: FeatureId;
  label: string;
  /** Nível mínimo (1–5). 1 = disponível para todos. */
  minLevel: number;
  /** Tela/rota principal (opcional, para navegação). */
  screen?: string;
  /** Descrição curta para tooltip ou mensagem de “em breve”. */
  description?: string;
}

/**
 * Registro central: todas as funcionalidades e o nível mínimo para acesso.
 * minLevel 1 = todos os níveis; 2+ = liberação progressiva.
 * Eventos (ver, inscrever, check-in) são para TODOS — acesso universal à comunhão presencial.
 */
export const FEATURE_GATES: FeatureGate[] = [
  // --- OBRIGATÓRIAS (ALL): base da vida cristã e comunhão — NUNCA bloqueadas ---
  { id: 'devotional', label: 'Devocional semanal', minLevel: 1, screen: 'DevotionalScreen', description: 'Leitura e reflexão semanal' },
  { id: 'prayer', label: 'Pedidos de oração', minLevel: 1, screen: 'PrayerRequestScreen', description: 'Ver e criar pedidos' },
  { id: 'community', label: 'Comunidade', minLevel: 1, screen: 'CommunityWall', description: 'Ver posts da comunidade' },
  { id: 'bible', label: 'Bíblia', minLevel: 1, screen: 'BibleScreen', description: 'Leitura das Escrituras' },
  { id: 'spiritual_profile', label: 'Perfil espiritual', minLevel: 1, screen: 'JourneyScreen', description: 'Sua jornada e etapa espiritual' },
  { id: 'events', label: 'Eventos', minLevel: 1, screen: 'EventsScreen', description: 'Ver, inscrever e check-in em eventos' },

  // --- Sempre disponíveis (nível 1) ---
  { id: 'journey', label: 'Jornada Espiritual', minLevel: 1, screen: 'JourneyScreen', description: 'Sua etapa e passos na jornada' },
  { id: 'reflections', label: 'Reflexões Espirituais', minLevel: 1, screen: 'SpiritualReflectionsScreen', description: 'Escrever o que Deus tem falado' },
  { id: 'disciplines', label: 'Disciplinas Espirituais', minLevel: 1, screen: 'DisciplinesScreen', description: 'Checklist e constância' },
  { id: 'plans_challenges', label: 'Planos e desafios bíblicos', minLevel: 1, screen: 'DisciplinesScreen', description: 'Planos de leitura e desafios' },

  // --- Liberação progressiva por nível ---
  { id: 'community_like_comment', label: 'Curtir e comentar na comunidade', minLevel: 2, screen: 'CommunityWall', description: 'Interagir com posts' },
  { id: 'group_study_create', label: 'Criar novo estudo em grupo', minLevel: 3, screen: 'GuidedStudiesScreen', description: 'Iniciar estudos sobre temas ou livros para a comunidade' },
  { id: 'badges', label: 'Conquistas e badges', minLevel: 3, screen: 'BadgesScreen', description: 'Tela de conquistas e emblemas no perfil' },
  { id: 'community_post', label: 'Criar posts na comunidade', minLevel: 4, screen: 'CommunityWall', description: 'Publicar e editar posts' },
  { id: 'prayer_respond', label: 'Responder pedidos de oração', minLevel: 4, screen: 'PrayerRequestScreen', description: 'Marcar como respondido com testemunho' },
  { id: 'mentorship', label: 'Mentoria e missões semanais', minLevel: 4, description: 'Acompanhar e ser acompanhado' },
  { id: 'leadership', label: 'Liderança e multiplicação', minLevel: 5, screen: 'EventsScreen', description: 'Criar missões, estudos e destaque' },
];

const GATES_BY_ID = new Map<FeatureId, FeatureGate>(FEATURE_GATES.map((g) => [g.id, g]));

/**
 * Retorna todas as funcionalidades disponíveis para o nível informado.
 * Inclui as de minLevel 1 (todos) e as cujo minLevel <= level.
 */
export function getAvailableFeaturesByLevel(level: number): FeatureGate[] {
  const safeLevel = Math.max(1, Math.min(5, level));
  return FEATURE_GATES.filter((g) => g.minLevel <= safeLevel);
}

/**
 * Verifica se uma funcionalidade está liberada para o nível informado.
 * Funcionalidades em FEATURES_ALWAYS_AVAILABLE (ALL) são SEMPRE liberadas e nunca bloqueadas por nível.
 */
export function isFeatureAvailableForLevel(featureId: FeatureId, level: number): boolean {
  if (isAlwaysAvailableFeature(featureId)) return true;
  const gate = GATES_BY_ID.get(featureId);
  if (!gate) return true; // desconhecido = não bloquear
  const safeLevel = Math.max(1, Math.min(5, level));
  return gate.minLevel <= safeLevel;
}

/**
 * Retorna a configuração da funcionalidade (para label, screen, mensagem “em breve”).
 */
export function getFeatureGate(featureId: FeatureId): FeatureGate | undefined {
  return GATES_BY_ID.get(featureId);
}

/** Mensagem para tooltips de bloqueio: lembrar que nível reflete experiência no app. */
export { LEVEL_DISCLAIMER_SHORT as getBlockTooltipMessage } from './spiritualJourney';

/** Nomes dos níveis para mensagens de bloqueio (João 15) */
export const LEVEL_NAMES: Record<number, string> = { 1: 'Ouvir', 2: 'Seguir', 3: 'Permanecer', 4: 'Frutificar', 5: 'Multiplicar' };

/**
 * Retorna mensagem quando o usuário tenta acessar funcionalidade bloqueada.
 * Inclui nível atual, nível necessário e nome da função para o usuário entender o que falta.
 */
export function getLockedFeatureMessage(featureId: FeatureId, currentLevel: number): string {
  if (isAlwaysAvailableFeature(featureId)) return '';
  const gate = GATES_BY_ID.get(featureId);
  if (!gate || gate.minLevel <= currentLevel) return '';
  const requiredLevelName = LEVEL_NAMES[gate.minLevel] ?? `nível ${gate.minLevel}`;
  const currentLevelName = LEVEL_NAMES[currentLevel] ?? `nível ${currentLevel}`;
  return (
    `Você está no nível ${currentLevel} (${currentLevelName}). ` +
    `"${gate.label}" está disponível a partir do nível ${gate.minLevel} (${requiredLevelName}). ` +
    `Continue sua jornada (devocionais, oração, eventos e reflexões) para desbloquear essa função.`
  );
}

/**
 * Retorna título e mensagem para exibir em Alert/modal quando o usuário toca em função bloqueada.
 * Use: Alert.alert(locked.title, locked.message, ...)
 */
export function getLockedFeatureAlert(featureId: FeatureId, currentLevel: number): { title: string; message: string } | null {
  if (isAlwaysAvailableFeature(featureId)) return null;
  const gate = GATES_BY_ID.get(featureId);
  if (!gate || gate.minLevel <= currentLevel) return null;
  return {
    title: 'Nível necessário',
    message: getLockedFeatureMessage(featureId, currentLevel),
  };
}
