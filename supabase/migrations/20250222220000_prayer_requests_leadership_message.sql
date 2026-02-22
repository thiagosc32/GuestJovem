-- Campo para resposta da liderança em pedidos privados (não usar testimony)
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS leadership_message text;
