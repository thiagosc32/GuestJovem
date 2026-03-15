# Vida Espiritual

Sistema visual que representa a **vida espiritual** do usuário — a **ovelinha** simboliza a constância com base em **frequência mínima saudável**: dias distintos com prática diária na semana.

## Conceito

- Uma **ovelinha simbólica** representa o estado atual do cuidado espiritual (constância).
- O estado é baseado em **quantos dias na semana** o usuário teve prática diária (em dias diferentes), não em “dias desde a última atividade”.
- **Constância saudável** = pelo menos 3 dias distintos com prática diária na semana (evita “fé de domingo só”; incentiva regularidade sem exigir todo dia).
- **Sem punição**: linguagem pastoral (convite, nunca acusação). XP e níveis continuam separados.

## Estados da Ovelinha (dias ativos na semana atual)

| Estado                | Condição (dias com prática diária na semana) | Rótulo na UI           |
|-----------------------|-----------------------------------------------|------------------------|
| Cuidado saudável      | 4–7 dias ativos                               | Cuidado saudável       |
| Cuidado frágil        | 2–3 dias ativos                               | Cuidado frágil         |
| Cuidado esporádico    | 1 dia ativo                                   | Cuidado esporádico     |
| Cuidado negligenciado | 0 dias ativos                                 | Cuidado negligenciado  |

**“Dia ativo”** = um dia em que o usuário registrou pelo menos uma **prática diária**: devocional (tela Devocionais), registro de oração, reflexão espiritual, ou uma das disciplinas diárias (Leitura da Palavra, Secreto com Deus, Devocional diário, Gratidão). Vários registros no mesmo dia contam como 1 dia ativo.

## Cálculo do estado

- **Fonte**: eventos em `spiritual_xp_events` na semana atual (domingo–sábado), filtrados por ações “diárias” (devotional, prayer_register, reflection, ou discipline com chave em Leitura da Palavra, Secreto com Deus, Devocional diário, Gratidão).
- **Cálculo**: no cliente, `getCompanionState(userId)` chama `getActiveDaysInWeek(userId, currentWeekStart)` e conta dias distintos com prática diária; aplica os limites em `COMPANION_ACTIVE_DAYS_THRESHOLDS` e retorna o estado (strong / weakening / weak / bones).
- **Não é necessário cron.** O estado é derivado dos dados atuais a cada exibição.

## Integração técnica

| Parte              | Onde está |
|--------------------|-----------|
| Limites (dias ativos) e mensagens | `constants/spiritualCompanion.ts` (`COMPANION_ACTIVE_DAYS_THRESHOLDS`, `COMPANION_STATES`) |
| Contagem de dias ativos na semana | `services/spiritualJourney.ts` → `getActiveDaysInWeek(userId, weekStartDate)` |
| Cálculo do estado  | `services/spiritualCompanion.ts` → `getCompanionState(userId)` |
| Tipos              | `types/spiritualCompanion.ts` |
| Visual + mensagem  | `components/SpiritualCompanion.tsx` |

## Regras de negócio

- Mudanças de estado **não removem** XP nem alteram nível.
- A ovelinha reflete **constância semanal** (dias ativos na semana), não “dias desde a última vez”.
- Streak de semanas usa a mesma regra de “mínimo 3 dias ativos na semana” para a semana contar; quebra após 2 semanas consecutivas sem o mínimo.

## Linguagem (ética e produto)

- Convite, nunca acusação: “Que tal separar alguns dias simples com Deus nesta semana?” em vez de “Você falhou”.
- Mensagens como “A saúde espiritual cresce com regularidade” e “Nesta semana, o cuidado espiritual foi esporádico” (sem culpa).
- Estado “Cuidado negligenciado” com acolhimento: “Sempre que quiser retomar, ela estará aqui.”
