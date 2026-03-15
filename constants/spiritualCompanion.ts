/**
 * Vida Espiritual - estados e mensagens (Ovelinha)
 * Constância baseada em frequência mínima saudável: dias distintos com prática diária na semana.
 * Sem punição; linguagem pastoral (convite, nunca acusação).
 */

/** Estados possíveis da vida espiritual (ovelinha simbólica) */
export type CompanionStateKey = 'strong' | 'weakening' | 'weak' | 'bones';

export interface CompanionStateConfig {
  key: CompanionStateKey;
  label: string;
  /** Mensagem curta exibida na UI (pastoral, encorajadora) */
  message: string;
  /** Ordem para transições visuais */
  order: number;
}

/** Dias ativos na semana (práticas diárias em dias diferentes) para cada estado */
export const COMPANION_ACTIVE_DAYS_THRESHOLDS = {
  /** 4–7 dias → Cuidado saudável */
  STRONG_MIN_DAYS: 4,
  STRONG_MAX_DAYS: 7,
  /** 2–3 dias → Cuidado frágil */
  WEAKENING_MIN_DAYS: 2,
  WEAKENING_MAX_DAYS: 3,
  /** 1 dia → Cuidado esporádico; 0 dias → negligenciado */
} as const;

/** @deprecated Use COMPANION_ACTIVE_DAYS_THRESHOLDS. Mantido para compatibilidade. */
export const COMPANION_DAYS_THRESHOLDS = {
  STRONG_MAX_DAYS: 0,
  WEAKENING_MIN_DAYS: 1,
  WEAKENING_MAX_DAYS: 2,
  WEAK_MIN_DAYS: 3,
  WEAK_MAX_DAYS: 5,
  BONES_MIN_DAYS: 6,
} as const;

/** Configuração por estado: rótulo e mensagem contextual (indicador de cuidado espiritual) */
export const COMPANION_STATES: Record<CompanionStateKey, CompanionStateConfig> = {
  strong: {
    key: 'strong',
    label: 'Cuidado saudável',
    message: 'Seu cuidado espiritual está saudável e constante. Continue cultivando esse ritmo.',
    order: 0,
  },
  weakening: {
    key: 'weakening',
    label: 'Cuidado frágil',
    message: 'Seu cuidado espiritual começou a perder regularidade. Ainda há vida sendo nutrida, mas alguns dias importantes estão ficando de fora.',
    order: 1,
  },
  weak: {
    key: 'weak',
    label: 'Cuidado esporádico',
    message: 'Seu cuidado espiritual está frágil e irregular. Quando o tempo com Deus se torna esporádico, a saúde espiritual começa a enfraquecer.',
    order: 2,
  },
  bones: {
    key: 'bones',
    label: 'Cuidado negligenciado',
    message: 'Seu cuidado espiritual está gravemente negligenciado. Ainda é tempo de recomeçar — cada novo dia é uma nova chance.',
    order: 3,
  },
};

export function getCompanionStateConfig(key: CompanionStateKey): CompanionStateConfig {
  return COMPANION_STATES[key];
}

/** Ordem de "melhoria" do estado (maior = melhor): bones < weak < weakening < strong */
export const CONSTANCY_STATE_ORDER: Record<CompanionStateKey, number> = {
  bones: 0,
  weak: 1,
  weakening: 2,
  strong: 3,
};

export function isConstancyStateBetter(prev: CompanionStateKey | null, next: CompanionStateKey | null): boolean {
  if (!prev || !next) return false;
  return CONSTANCY_STATE_ORDER[next] > CONSTANCY_STATE_ORDER[prev];
}

/** Mensagens do modal ao subir de nível de constância (janela, não no card) */
export interface ConstancyLevelUpContent {
  title: string;
  message: string;
  secondaryMessage: string;
  /** Cor/indicador: 'green' | 'yellow' | 'orange' | 'red' */
  variant: 'green' | 'yellow' | 'orange' | 'red';
}

/**
 * Conteúdo do modal "Subiu de nível de constância".
 * Quando o usuário sai de bones (zero) para qualquer outro estado → "Cuidado retomado".
 */
export function getConstancyLevelUpContent(
  newState: CompanionStateKey,
  previousState: CompanionStateKey | null
): ConstancyLevelUpContent | null {
  if (previousState === 'bones' && newState !== 'bones') {
    return {
      title: 'Cuidado retomado',
      message: 'Você voltou. Recomeçar também é um sinal de vida.',
      secondaryMessage: 'Deus honra o retorno sincero, mesmo quando ele começa pequeno.',
      variant: 'red',
    };
  }
  switch (newState) {
    case 'strong':
      return {
        title: 'Subiu para Cuidado saudável',
        message: 'Você está cuidando da sua vida espiritual com regularidade. Continue nesse caminho.',
        secondaryMessage: 'Pequenos momentos constantes com Deus constroem uma vida espiritual saudável.',
        variant: 'green',
      };
    case 'weakening':
      return {
        title: 'Subiu para Cuidado frágil',
        message: 'Você retomou o cuidado espiritual. Ainda é frágil, mas é um bom começo.',
        secondaryMessage: 'A constância nasce quando o cuidado se torna parte da rotina.',
        variant: 'yellow',
      };
    case 'weak':
      return {
        title: 'Subiu para Cuidado esporádico',
        message: 'Você deu um passo importante ao retomar o cuidado espiritual.',
        secondaryMessage: 'Mesmo passos pequenos indicam vida. Continue avançando com simplicidade.',
        variant: 'orange',
      };
    default:
      return null;
  }
}
