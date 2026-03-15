# Jornada Espiritual — Lógica de progressão

## Princípio

A progressão reflete **práticas espirituais** ao longo do tempo, não mérito religioso nem desempenho. O sistema existe para **incentivar constância**, não competição ou cobrança.

---

## Critérios que contam na jornada

Cada prática abaixo registra passos no perfil do usuário (valor técnico: `spiritual_xp_events` + `total_xp`):

| Prática                         | Ação no sistema        | Observação                    |
|---------------------------------|------------------------|-------------------------------|
| Leitura bíblica concluída       | `devotional`           | 1x por dia                    |
| Registro de oração              | `prayer_register`      | 1x por dia                    |
| Participação em eventos/planos  | `event_checkin`       | 1 check-in por evento por dia |
| Registro de reflexões espirituais | `reflection`       | 1x por dia                    |
| Disciplinas espirituais (planos/desafios) | `discipline`  | Por período (dia/semana/mês)  |

Participação em grupos ou interações saudáveis (comunidade, comentários, orar por outros) pode ser integrada no futuro como critério adicional; hoje não altera o total de passos.

---

## Associação de funcionalidades por etapa (incentivo, não bloqueio)

Cada etapa da jornada tem **funcionalidades sugeridas** para incentivo. Nenhuma função é bloqueada; o app usa isso para destacar "indicado para sua etapa" e encorajar exploração.

| Etapa     | Funcionalidades sugeridas |
|-----------|---------------------------|
| Ouvir       | Leitura básica, devocional diário, pedidos de oração, reflexões |
| Seguir      | Planos bíblicos, desafios, disciplinas espirituais, devocional |
| Permanecer  | Grupos, comunidade, comentários guiados, orar por outros |
| Frutificar  | Criação de conteúdo (posts), mentoria, servir na comunidade |
| Multiplicar | Liderança, eventos, missões, discipulado |

- **Onde está:** `constants/spiritualJourney.ts` — `LEVEL_SUGGESTED_FEATURES`, `getSuggestedFeaturesForLevel(level)`.
- **Na UI:** tela Jornada Espiritual — seção "Indicado para sua etapa (Nome)" com chips que levam às telas sugeridas. Texto: "Explore quando quiser — tudo continua disponível."

---

## Diretrizes garantidas na lógica

1. **Progressão gradual**  
   Limite diário de passos e “1x por dia” em várias ações evitam picos de “performance” e valorizam o hábito ao longo do tempo.

2. **Sem punição por inatividade**  
   O `total_xp` **nunca diminui**. Se o usuário parar de praticar, o progresso só não avança; nada é subtraído.

3. **Sem regressão automática de nível**  
   O nível (etapa) é sempre calculado a partir do `total_xp` atual. Como o total só aumenta ou permanece, o nível **nunca é rebaixado**. No código, `awardXp` usa `Math.max(profile.total_xp, newTotalXp)` e `Math.max(profile.current_level, newLevel)` como garantia.

4. **Constância, não performance**  
   O streak (semanas consecutivas com alguma atividade) é apenas **celebração**; quando a pessoa deixa de ter atividade numa semana, o contador de streak reinicia, mas **nível e total de passos permanecem**. Não há penalidade por “pausas”.

---

## Onde está no código

- **Constantes:** `constants/spiritualJourney.ts` — `PROGRESSION_CRITERIA_LABELS`, `PROGRESSION_GUIDELINES`, `XP_BY_ACTION`, `DAILY_XP_CAP`, `ONCE_PER_DAY_ACTIONS`.
- **Serviço:** `services/spiritualJourney.ts` — `awardXp`, `getLevelFromTotalXp`, `getLevelInfo`, `getJourneySummary`; comentários no topo do arquivo descrevem as diretrizes.
- **UI:** `screens/user/JourneyScreen.tsx` usa `PROGRESSION_CRITERIA_LABELS` e mensagens que reforçam constância e ausência de punição.
