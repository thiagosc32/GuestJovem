# Progressão de Nível e Constância — Jornada Espiritual

Este documento descreve como funcionam a **progressão de nível** e os indicadores de **constância** no app (base da “Jornada Espiritual”), de forma técnica e resumida para desenvolvedores e equipe.

---

## 1. Princípios do sistema

- **Constância, não performance:** o sistema incentiva uso regular ao longo do tempo, não “maratonas” nem competição.
- **Sem punição por inatividade:** o total de passos nunca diminui; quem para de usar só deixa de somar.
- **Sem regressão de nível:** o nível é sempre derivado do total de passos já conquistado; não há rebaixamento automático.
- **Níveis não medem fé nem valor espiritual:** servem apenas para organizar a jornada dentro do app e incentivar constância (ver aviso em `LEVEL_DISCLAIMER_MESSAGE`).

---

## 2. Progressão de nível (passos e etapas)

### 2.1 Unidade de progresso

- No código e no banco a unidade é tratada como **“passos”** (tecnicamente `total_xp` em `spiritual_journey_profiles`).
- Na interface pode ser exibida como “passos” (`GROWTH_UNIT_LABEL`) para evitar linguagem de “XP” ou “pontos”.

### 2.2 Como se ganha passos

Cada **prática espiritual** registrada gera passos, conforme a tabela:

| Ação (`action_type`)   | Passos | Regra especial                          |
|------------------------|--------|----------------------------------------|
| Devocional             | 10     | 1x por dia                             |
| Oração (pedido)        | 10     | 1x por dia                             |
| Presença em evento     | 15     | 1x por evento por dia                  |
| Reflexão espiritual   | 15     | 1x por dia                             |
| Disciplina espiritual | variável | Conforme a disciplina (período dia/semana/mês) |

- **Limite diário:** máximo de **50 passos por dia** (`DAILY_XP_CAP`). Acima disso, novas ações do dia não somam.
- **Ações “1x por dia”:** devocional, oração e reflexão contam no máximo uma vez por dia; repetir no mesmo dia não soma de novo.
- **Evento:** cada evento conta no máximo uma presença por dia; repetir check-in no mesmo evento no mesmo dia não soma.

### 2.3 Níveis e faixas de passos (João 15)

O nível é calculado pelo **total de passos acumulado** (`total_xp`): descobre-se o maior nível cujo `minXp` seja ≤ total. Não há rebaixamento.

| Nível | Nome         | Passos mínimos (`minXp`) |
|-------|--------------|---------------------------|
| 1     | Ouvir        | 0                         |
| 2     | Seguir       | 150                       |
| 3     | Permanecer   | 450                       |
| 4     | Frutificar   | 900                       |
| 5     | Multiplicar  | 1.500                     |

- **Admins:** sempre são tratados como nível 5 (Multiplicar) na interface, independente de `total_xp`.
- **Cálculo:** `getLevelFromTotalXp(totalXp)` em `services/spiritualJourney.ts`; textos e descrições vêm de `SPIRITUAL_LEVELS` em `constants/spiritualJourney.ts`.

### 2.4 Barra de progresso dentro do nível

- **Passos no nível atual:** `totalXp - minXp` do nível atual.
- **Passos necessários para o próximo:** `nextMinXp - minXp` (onde `nextMinXp` é o `minXp` do próximo nível).
- **Porcentagem:** `(xpInLevel / xpNeededInLevel) * 100` (até 100% quando já pode subir).
- No nível 5 não há “próximo nível”; a barra pode ser exibida como 100% ou equivalente.

---

## 3. Constância (streak de semanas e estado da ovelha)

### 3.1 Regra de constância saudável

- **Uma semana é válida** para constância se o usuário tiver **pelo menos 3 dias distintos** com prática diária (em dias diferentes).
- **Práticas diárias** que contam: devocional (tela Devocionais), registro de oração, reflexão espiritual, ou disciplinas diárias (Leitura da Palavra, Secreto com Deus, Devocional diário, Gratidão). Cada dia com pelo menos uma dessas práticas conta como 1 “dia ativo”.
- **Semana:** domingo a sábado. Não precisa ser todo dia; precisa ser regular (≥3 dias).
- Fica salva em `spiritual_journey_profiles`: `streak_weeks` e `last_streak_week_start`.

### 3.2 Como o streak de semanas é atualizado

Sempre que o usuário ganha passos (`awardXp`), ao atualizar o perfil:

1. **`last_activity_date`** é atualizado para hoje.
2. Ao entrar numa **nova semana**, a semana anterior é “fechada”: conta-se quantos dias distintos tiveram prática diária naquela semana.
3. **Se a semana anterior teve ≥ 3 dias ativos:** a semana conta → `streak_weeks` sobe em 1 e `last_streak_week_start` passa a ser essa semana.
4. **Se a semana anterior teve &lt; 3 dias ativos:** a semana não conta; o streak não avança (e não quebra na hora).
5. **Quebra do streak:** ocorre só após **2 semanas consecutivas** sem atingir o mínimo (&lt; 3 dias em cada). Aí o streak reinicia para 1 quando o usuário voltar a praticar.

**Linguagem:** convite, nunca acusação (“Que tal separar alguns dias com Deus?” em vez de “Você falhou”).

### 3.3 Estado da ovelha (Vida Espiritual)

O estado exibido (qual ovelha aparece) é baseado nos **dias ativos na semana atual** (práticas diárias em dias diferentes):

- **Cuidado saudável (strong):** 4–7 dias ativos na semana.
- **Cuidado frágil (weakening):** 2–3 dias ativos.
- **Cuidado esporádico (weak):** 1 dia ativo.
- **Cuidado negligenciado (bones):** 0 dias ativos na semana atual — **inclui conta recém-criada** até o usuário registrar prática em pelo menos um dia da semana (não há estado “forte” só por ser novo).

Calculado em `getCompanionState(userId)` via `getActiveDaysInWeek(userId, currentWeekStart)`.

### 3.4 Onde aparece

- **Streak:** tela da Jornada e onde usar `getJourneySummary()` (ex.: “X semanas”).
- **Ovelha:** componente Vida Espiritual (Disciplinas, Dashboard, etc.) via `getCompanionState(userId)`.

---

## 4. Outros indicadores de constância (conquistas / badges)

Além do streak de **semanas** no perfil da jornada, existem **streaks de dias consecutivos** por tipo de prática, usados nas conquistas:

- **Devocional:** dias consecutivos com pelo menos um devocional concluído (`devotional_streak`).
- **Oração:** dias consecutivos com registro de oração (`prayer_streak`).
- **Disciplinas:** dias consecutivos com pelo menos uma disciplina marcada (`disciplines_streak`).

Esses são calculados em `services/achievementsService.ts` (ex.: `getConsecutiveDaysForAction`) e alimentam badges como “7 dias de devocional” ou “7 dias de oração”.  
Eles **não** alteram nível nem `streak_weeks`; são apenas para conquistas e engajamento.

---

## 5. Liberação de funcionalidades por nível

- **Eventos, devocional, oração, comunidade (ver), Bíblia, perfil, estudos em grupo (ver/participar):** disponíveis para **todos** os níveis (nunca bloqueados).
- Outras funcionalidades têm **nível mínimo** definido em `constants/featureGates.ts`:
  - Ex.: curtir/comentar na comunidade (nível 2), criar estudo em grupo (nível 3), criar post (nível 4), liderança (nível 5).
- Uso: `isFeatureAvailableForLevel(featureId, level)` e `getAvailableFeaturesByLevel(level)`.

---

## 6. Onde está no código

| Conceito              | Arquivo principal              | Observação                                      |
|-----------------------|--------------------------------|-------------------------------------------------|
| Constantes de nível   | `constants/spiritualJourney.ts`| `SPIRITUAL_LEVELS`, `XP_BY_ACTION`, limites     |
| Cálculo de nível      | `services/spiritualJourney.ts` | `getLevelFromTotalXp`, `getLevelInfo`           |
| Conceder passos       | `services/spiritualJourney.ts` | `awardXp`, `canAwardXp`, limite diário, 1x/dia  |
| Streak de semanas     | `services/spiritualJourney.ts` | `updateStreakInProfile` (≥3 dias ativos/semana; quebra em 2 semanas sem mínimo) |
| Dias ativos na semana | `services/spiritualJourney.ts` | `getActiveDaysInWeek(userId, weekStart)` — práticas diárias em dias distintos   |
| Estado da ovelha     | `services/spiritualCompanion.ts` | `getCompanionState(userId)` — 4–7 saudável, 2–3 frágil, 0–1 esporádico/negligenciado |
| Resumo para UI        | `services/spiritualJourney.ts` | `getJourneySummary`                             |
| Liberação por nível   | `constants/featureGates.ts`   | `FEATURE_GATES`, `isFeatureAvailableForLevel`   |
| Streak de dias (badges)| `services/achievementsService.ts` | `getConsecutiveDaysForAction`                 |
| Perfil no banco       | Tabela `spiritual_journey_profiles` | `total_xp`, `current_level`, `streak_weeks`, `last_activity_date`, `last_streak_week_start` |
| Eventos de prática    | Tabela `spiritual_xp_events`   | `user_id`, `action_type`, `reference_id`, `created_at` (para contar dias ativos) |

---

## 7. Frase e aviso do app

- **Frase (João 15):** *“Crescer não é competir, é permanecer.”* (`GROWTH_PHRASE`).
- **Aviso sobre níveis:** os níveis não medem fé, santidade ou valor espiritual; servem para organizar a jornada no app e incentivar constância (textos em `LEVEL_DISCLAIMER_*` em `constants/spiritualJourney.ts`).
