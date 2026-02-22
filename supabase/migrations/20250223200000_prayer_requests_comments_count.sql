-- Contador de comentários em pedidos de oração (para exibir sem carregar a lista)
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;

-- Atualizar comments_count ao inserir/deletar comentário
CREATE OR REPLACE FUNCTION prayer_requests_update_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prayer_requests SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.prayer_request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE prayer_requests SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1) WHERE id = OLD.prayer_request_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prayer_request_comments_count ON prayer_request_comments;
CREATE TRIGGER trg_prayer_request_comments_count
  AFTER INSERT OR DELETE ON prayer_request_comments
  FOR EACH ROW EXECUTE PROCEDURE prayer_requests_update_comments_count();

-- Popular contagem inicial para registros já existentes
UPDATE prayer_requests pr
SET comments_count = (SELECT COUNT(*) FROM prayer_request_comments c WHERE c.prayer_request_id = pr.id);
