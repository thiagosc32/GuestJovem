# Ganho de XP (Passos) e Progressão de Níveis

Este documento explica como o usuário ganha **passos** (XP) na Jornada Espiritual, quanto pode ganhar por dia e o que é necessário para subir de nível.

---

## O que são os passos (XP)?

Os **passos** representam práticas espirituais registradas no app. Eles **nunca diminuem** — não há punição por inatividade. O total acumulado reflete **constância ao longo do tempo**, não mérito religioso nem competição.

> **Nota:** Na interface, usamos o termo "passos" em vez de "XP" ou "pontos". Os níveis não medem fé ou valor espiritual; servem apenas para organizar a experiência no app e incentivar a constância.

---

## Como ganhar passos

Cada ação abaixo concede uma quantidade fixa de passos. Algumas ações contam **apenas uma vez por dia**, outras têm regras específicas.

### Tabela de passos por ação

| Ação | Passos | Frequência | Observação |
|------|--------|------------|------------|
| **Leitura bíblica concluída** (devocional) | 10 | 1x por dia | Ao concluir um devocional na tela de Leitura |
| **Registro de oração** | 10 | 1x por dia | Ao registrar que orou |
| **Check-in em evento** | 15 | 1 por evento por dia | Ao fazer check-in em um culto ou encontro |
| **Reflexão espiritual** | 15 | 1x por dia | Ao registrar uma reflexão |
| **Disciplinas espirituais** | 5, 10 ou 15 | Por período (dia/semana/mês) | Conforme o tipo da disciplina |

### Disciplinas espirituais — valor por tipo

| Categoria | Disciplina | Passos | Período |
|------------|------------|--------|---------|
| Diária | Leitura da Palavra | 5 | 1x por dia |
| Diária | Secreto com Deus (oração pessoal) | 5 | 1x por dia |
| Diária | Devocional diário | 10 | 1x por dia |
| Diária | Gratidão (agradecer a Deus) | 5 | 1x por dia |
| Semanal | Orar por alguém | 10 | 1x por semana |
| Semanal | Falar de Deus para alguém | 10 | 1x por semana |
| Semanal | Conversar com um irmão | 10 | 1x por semana |
| Semanal | Reflexão espiritual da semana | 15 | 1x por semana |
| Mensal | Jejum | 15 | 1x por mês |
| Mensal | Estudo bíblico | 15 | 1x por mês |
| Mensal | Serviço | 15 | 1x por mês |
| Mensal | Autoavaliação espiritual | 15 | 1x por mês |

---

## Limite diário de passos

O usuário pode ganhar **até 50 passos por dia**. Esse limite favorece **constância ao longo do tempo**, em vez de “maratonas” em um único dia.

- Ao atingir 50 passos no dia, nenhuma nova ação concede passos até o dia seguinte.
- O sistema respeita o fuso horário local (meia-noite = novo dia).

### Exemplo de ganho em um dia típico

| Ações possíveis | Passos |
|-----------------|--------|
| 1 devocional | 10 |
| 1 registro de oração | 10 |
| 1 reflexão espiritual | 15 |
| 1 check-in em evento | 15 |
| 4 disciplinas diárias (Leitura 5 + Oração 5 + Devocional 10 + Gratidão 5) | 25 |

Um dia muito ativo poderia somar 75 passos, mas o **limite de 50 passos/dia** interrompe a concessão ao atingir 50. Assim, o usuário é incentivado a distribuir as práticas ao longo da semana em vez de concentrar tudo em um único dia.

---

## Níveis e passos necessários para subir

O nível é calculado pelo **total acumulado de passos** no perfil. Quanto mais passos, maior o nível.

| Nível | Etapa | Passos mínimos (total) | Passos para o próximo nível |
|-------|-------|------------------------|-----------------------------|
| 1 | **Ouvir** | 0 | 150 |
| 2 | **Seguir** | 150 | 300 (total 450) |
| 3 | **Permanecer** | 450 | 450 (total 900) |
| 4 | **Frutificar** | 900 | 600 (total 1.500) |
| 5 | **Multiplicar** | 1.500 | — (nível máximo) |

### Resumo rápido

- **Ouvir → Seguir:** 150 passos
- **Seguir → Permanecer:** 300 passos adicionais (450 no total)
- **Permanecer → Frutificar:** 450 passos adicionais (900 no total)
- **Frutificar → Multiplicar:** 600 passos adicionais (1.500 no total)

### Exemplo de progressão

Com **50 passos/dia** em média:
- **Seguir (150):** ~3 dias
- **Permanecer (450):** ~9 dias
- **Frutificar (900):** ~18 dias
- **Multiplicar (1.500):** ~30 dias

Na prática, o usuário não atinge 50 passos todos os dias, então a progressão tende a levar mais tempo e a refletir uma jornada consistente.

---

## Regras importantes

1. **Sem punição por inatividade:** o total de passos nunca diminui.
2. **Sem regressão de nível:** o nível nunca é rebaixado; só sobe ou permanece.
3. **Limite diário:** máximo de 50 passos por dia.
4. **1x por dia:** devocional, oração e reflexão contam apenas uma vez por dia.
5. **1 por evento:** cada check-in em evento gera passos uma vez por dia para aquele evento específico.
6. **Disciplinas:** respeitam o período (diário, semanal ou mensal) e o limite diário global.

---

## Onde está no código

- **Constantes:** `constants/spiritualJourney.ts` — `XP_BY_ACTION`, `DAILY_XP_CAP`, `SPIRITUAL_LEVELS`, `ONCE_PER_DAY_ACTIONS`
- **Disciplinas:** `constants/spiritualDisciplines.ts` — `SPIRITUAL_DISCIPLINES` (xpAmount por disciplina)
- **Serviço:** `services/spiritualJourney.ts` — `awardXp`, `canAwardXp`, `getLevelFromTotalXp`, `getLevelInfo`, `getXpEarnedToday`
- **Documentação relacionada:** `docs/JORNADA_PROGRESSAO.md`, `docs/DISCIPLINAS_ESPIRITUAIS_FLUXO_XP.md`
