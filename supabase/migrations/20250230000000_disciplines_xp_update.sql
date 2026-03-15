-- Atualiza XP das disciplinas espirituais: Leitura da Palavra = 10, Devocional diário = 5
UPDATE spiritual_disciplines SET xp_amount = 10 WHERE key = 'reading';
UPDATE spiritual_disciplines SET xp_amount = 5 WHERE key = 'devotional_daily';
