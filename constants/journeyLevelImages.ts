/**
 * Avatares por nível da Jornada Espiritual (mesmo sistema das disciplinas/ovelhas).
 * Coloque os 5 PNG em assets/jornada/ com exatamente estes nomes.
 */

export const JOURNEY_LEVEL_IMAGE_NAMES = [
  'nivel-1.png', // Ouvir
  'nivel-2.png', // Seguir
  'nivel-3.png', // Permanecer
  'nivel-4.png', // Frutificar
  'nivel-5.png', // Multiplicar
] as const;

/** Fontes de imagem por nível (1–5). Exige os 5 arquivos em assets/jornada/. */
export const JOURNEY_LEVEL_IMAGES: Record<number, number> = {
  1: require('../assets/jornada/nivel-1.png'),
  2: require('../assets/jornada/nivel-2.png'),
  3: require('../assets/jornada/nivel-3.png'),
  4: require('../assets/jornada/nivel-4.png'),
  5: require('../assets/jornada/nivel-5.png'),
};
