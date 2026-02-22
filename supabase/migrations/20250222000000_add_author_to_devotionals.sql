-- Campo "autor" como texto livre (não ligado à conta)
ALTER TABLE devotionals
ADD COLUMN IF NOT EXISTS author text;

COMMENT ON COLUMN devotionals.author IS 'Nome do autor do devocional (campo livre, não vinculado a users)';
