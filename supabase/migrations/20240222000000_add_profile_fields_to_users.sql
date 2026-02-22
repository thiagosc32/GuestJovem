-- Adiciona campos de perfil à tabela users para persistir igreja, chamado e voluntariado
-- Execute este SQL no Supabase Dashboard (SQL Editor) se os dados não estiverem sendo salvos

-- 1. Adiciona colunas em users (permite salvar sem depender de youth_profiles)
ALTER TABLE users ADD COLUMN IF NOT EXISTS church TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS calling TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS volunteer TEXT[];

