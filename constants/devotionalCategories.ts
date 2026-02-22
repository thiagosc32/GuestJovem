export type DevotionalCategoryKey = 'faith' | 'love' | 'hope' | 'courage' | 'wisdom';

const CATEGORY_LABELS: Record<DevotionalCategoryKey, string> = {
  faith: 'Fé',
  love: 'Amor',
  hope: 'Esperança',
  courage: 'Coragem',
  wisdom: 'Sabedoria',
};

export function getDevotionalCategoryLabel(category: string | undefined): string {
  if (!category) return 'Fé';
  return CATEGORY_LABELS[category as DevotionalCategoryKey] ?? category;
}
