/**
 * Formato do QR Code pessoal do usuário (presença em eventos, etc.)
 * O scanner reconhece este prefixo e extrai o user_id para registrar presença.
 */
export const USER_QR_PREFIX = 'FY:USER:';

/** Gera o conteúdo do QR do usuário (único por conta) */
export function getUserQRPayload(userId: string): string {
  return `${USER_QR_PREFIX}${userId}`;
}

/**
 * Extrai o user_id do conteúdo escaneado.
 * Retorna null se não for um QR de usuário válido.
 */
export function parseUserQRPayload(data: string): string | null {
  if (!data || typeof data !== 'string') return null;
  const trimmed = data.trim();
  if (trimmed.startsWith(USER_QR_PREFIX)) {
    const id = trimmed.slice(USER_QR_PREFIX.length).trim();
    return id.length > 0 ? id : null;
  }
  // Compatibilidade: QR antigo pode conter só o UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed) ? trimmed : null;
}
