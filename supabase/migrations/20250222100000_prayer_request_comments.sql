-- ============================================================
-- COMENTÁRIOS EM PEDIDOS DE ORAÇÃO
-- Execute este SQL no Supabase: Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Criar tabela de comentários
CREATE TABLE IF NOT EXISTS prayer_request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id uuid NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Índice para buscar comentários por pedido
CREATE INDEX IF NOT EXISTS idx_prayer_request_comments_request_id
  ON prayer_request_comments(prayer_request_id);

-- 3. Habilitar RLS (segurança por linha)
ALTER TABLE prayer_request_comments ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas se existirem (para poder re-executar o script)
DROP POLICY IF EXISTS "Ver comentários de pedidos públicos" ON prayer_request_comments;
DROP POLICY IF EXISTS "Inserir comentário autenticado" ON prayer_request_comments;

-- 5. Qualquer um pode VER comentários de pedidos que são públicos
CREATE POLICY "Ver comentários de pedidos públicos"
  ON prayer_request_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prayer_requests pr
      WHERE pr.id = prayer_request_comments.prayer_request_id
        AND pr.is_public = true
    )
  );

-- 6. Só o próprio usuário pode INSERIR comentário (user_id = id do logado)
CREATE POLICY "Inserir comentário autenticado"
  ON prayer_request_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
