# Disciplinas Espirituais — Fluxo de checks, logs e jornada

## Objetivo

A página **Disciplinas Espirituais** é um checklist **privado** que:
- Incentiva práticas espirituais (diárias, semanais, mensais)
- Gera **log** de cada conclusão
- Registra **passos** na Jornada Espiritual e atualiza **etapa e constância** (streak)
- Não exibe ranking nem dados de outros usuários

---

## Como um check vira log, passos e etapa

### 1. Usuário marca uma disciplina (check)

Na tela **Disciplinas**, o jovem toca em um item (ex.: "Leitura da Palavra").  
O app chama `completeDiscipline(userId, disciplineKey)`.

### 2. Validações (reset por período)

- **Diárias:** só conta 1x **por dia** (reset à meia-noite).
- **Semanais:** só conta 1x **por semana** (reset no início da semana, domingo).
- **Mensais:** só conta 1x **por mês**.

Além disso:
- Respeita o **limite diário de passos** (ex.: 50/dia) da Jornada.
- Se já tiver marcado aquela disciplina no período, o check **não** gera passos de novo (só fica visual).

A verificação é feita em `canAwardDisciplineXp` / `hasDisciplineInPeriod`, usando a tabela `spiritual_xp_events` com `action_type = 'discipline'` e `reference_id = discipline_key`.

### 3. Registro de passos (Jornada Espiritual)

Se o check for válido:

1. **`awardXp(userId, 'discipline', { referenceId: disciplineKey, xpOverride: xpAmount })`**
   - Insere um registro em **`spiritual_xp_events`** com:
     - `action_type = 'discipline'`
     - `reference_id = discipline_key` (ex.: `reading`, `prayer_secret`)
     - `xp_amount` = valor da disciplina (5, 10 ou 15 conforme o catálogo)
   - Soma esse valor ao **`total_xp`** em **`spiritual_journey_profiles`**
   - Recalcula **`current_level`** (etapas: Ouvir → Seguir → Permanecer → Frutificar → Multiplicar) com base no `total_xp`
   - Atualiza **`last_activity_date`** e **streak** (semanas consecutivas com atividade)

2. **Log de conclusão**
   - Insere um registro em **`spiritual_discipline_completions`** com:
     - `user_id`, `discipline_key`, `completed_at`, `xp_awarded`
   - Serve de histórico/auditoria e para relatórios futuros (sempre privados).

### 4. Impacto na etapa da jornada

- A **etapa** (1–5) vem do **total de passos** acumulado no perfil da Jornada:
  - Ouvir (0+), Seguir (100+), Permanecer (300+), Frutificar (600+), Multiplicar (1000+).
- Cada check de disciplina **aumenta o total de passos** e, ao cruzar os limites acima, **avança de etapa**.
- O **streak** (semanas seguidas com atividade) também é atualizado quando há novos passos.

Ou seja: **check → evento de passos → atualização de total_xp e etapa (e streak)**. Tudo privado, sem ranking.

---

## Resumo técnico

| Etapa              | Onde acontece                         | Tabela / serviço                    |
|--------------------|----------------------------------------|-------------------------------------|
| Marcar disciplina  | Tela Disciplinas                      | `completeDiscipline()`             |
| Verificar período  | Serviço Jornada + Disciplinas         | `spiritual_xp_events` (já no período?) |
| Conceder passos    | `awardXp(..., 'discipline', ...)`     | `spiritual_xp_events` + `spiritual_journey_profiles` |
| Log de conclusão   | `completeDiscipline()` após passos    | `spiritual_discipline_completions` |
| Etapa e streak     | Dentro de `awardXp()`                 | `spiritual_journey_profiles`        |

---

## Regras de limite

- **Por disciplina:** 1 conclusão por período (dia/semana/mês conforme o tipo).
- **Por dia (global):** limite diário de passos (ex.: 50) — disciplinas somam a esse total.
- **Privacidade:** RLS garante que cada usuário só vê e só insere os próprios dados; nada é exposto publicamente.

### Diretrizes da jornada (sem mérito religioso)

- **Sem punição por inatividade:** o total de passos nunca diminui.
- **Sem regressão de nível:** a etapa nunca é rebaixada.
- **Constância, não performance:** o sistema incentiva repetição no tempo, não quantidade no dia. Ver `docs/JORNADA_PROGRESSAO.md`.
