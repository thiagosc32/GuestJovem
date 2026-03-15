/**
 * Imagens da ovelha por estado (Vida Espiritual).
 * Sequência: strong → weakening → weak → bones.
 * Coloque os 4 PNG em assets/ovelhas/ com os nomes abaixo.
 */

import type { CompanionStateKey } from './spiritualCompanion';

export const SHEEP_IMAGE_SOURCES: Record<CompanionStateKey, number> = {
  strong: require('../assets/ovelhas/ovelha-strong.png'),
  weakening: require('../assets/ovelhas/ovelha-weakening.png'),
  weak: require('../assets/ovelhas/ovelha-weak.png'),
  bones: require('../assets/ovelhas/ovelha-bones.png'),
};
