/**
 * Funções de ministério atribuíveis pelos admins na gestão de usuários.
 */

export const MINISTRY_FUNCTIONS = [
  { id: 'jovem', label: 'Jovem', color: '#64748B' },
  { id: 'voluntario', label: 'Voluntário', color: '#10B981' },
  { id: 'staff', label: 'Staff', color: '#F59E0B' },
  { id: 'admin', label: 'Líder / Admin', color: '#EF4444' },
] as const;

export type MinistryFunctionId = (typeof MINISTRY_FUNCTIONS)[number]['id'];

export const getMinistryFunctionLabel = (id: string | null | undefined): string => {
  if (!id) return 'Jovem';
  const fn = MINISTRY_FUNCTIONS.find((f) => f.id === id);
  if (fn) return fn.label;
  if (id === 'volunteer') return 'Voluntário';
  return id;
};

export const getMinistryFunctionColor = (id: string | null | undefined): string => {
  if (!id) return '#64748B';
  const fn = MINISTRY_FUNCTIONS.find((f) => f.id === id);
  if (fn) return fn.color;
  if (id === 'volunteer') return '#10B981';
  return '#64748B';
};
