-- Add optional payment URL for paid events (Mercado Pago, PIX link, etc.)
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_url TEXT;

COMMENT ON COLUMN events.payment_url IS 'URL for payment (e.g. Mercado Pago checkout, PIX payment page). Used when is_paid is true.';
