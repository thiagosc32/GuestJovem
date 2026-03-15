# Verificação completa — Sistema de níveis de crescimento espiritual

**Data da análise:** fevereiro 2025  
**Escopo:** Ouvir → Seguir → Permanecer → Frutificar → Multiplicar (nomes João 15)  
**Modo:** apenas teste e análise; sem refatoração, alteração de banco ou remoção de funcionalidades.

---

## 1. Testes executados

### 1.1 Estrutura de níveis
- [x] Contagem de níveis em `SPIRITUAL_LEVELS`: **5 níveis** (1 a 5).
- [x] Ordem de progressão: minXp 0 → 100 → 300 → 600 → 1000 (crescente e sem gaps).
- [x] Nomes: Ouvir, Seguir, Permanecer, Frutificar, Multiplicar.
- [x] Presença de título, shortDescription, longDescription, inspirationalPhrase, verse em todos os níveis.
- [x] Conteúdo pastoral nas longDescriptions (sem cobrança; “cada um cresce no seu tempo”, “não é sobre ser o melhor”).

### 1.2 Progressão de usuário
- [x] **Usuário novo:** perfil criado com `total_xp: 0`, `current_level: 1`; `getLevelFromTotalXp(0)` retorna 1.
- [x] **Intermediário/avançado:** nível derivado de `total_xp` em `getLevelFromTotalXp` (iteração de 5 até 1; primeiro `totalXp >= minXp` define o nível).
- [x] **Regressão:** em `awardXp` usa-se `Math.max(profile.total_xp, newTotalXp)` e `Math.max(profile.current_level, newLevel)`; não há código que diminua `total_xp`.
- [x] **Inatividade:** nenhuma subtração de XP ou nível; streak apenas reinicia (sem penalidade de nível).

### 1.3 Mapeamento do sistema antigo
- [x] `LEGACY_TO_CURRENT_LEVEL_MAP`: 1→1, 2→2, 3→3, 4→4, 5→5 (equivalência direta).
- [x] `mapLegacyLevelToCurrent(level)`: nível inválido retorna 1; dentro de 1–5 retorna o mesmo número.
- [x] `getJourneySummary` aplica `mapLegacyLevelToCurrent(info.level)` e busca textos em `SPIRITUAL_LEVELS` por `effectiveLevel`.
- [x] Faixas de minXp preservadas (0, 100, 300, 600, 1000); usuários antigos mantêm nível numérico e total.

### 1.4 Critérios de avanço
- [x] Leitura bíblica: `awardXp(..., 'devotional', ...)` em DevotionalScreen (1x/dia, 10 passos).
- [x] Oração: `awardXp(..., 'prayer_register', ...)` em PrayerRequestScreen ao criar pedido.
- [x] Eventos/planos: `awardXp(..., 'event_checkin', ...)` em EventsScreen no check-in.
- [x] Reflexão: `createReflection` → `awardXp(..., 'reflection', ...)` (1x/dia, 15 passos).
- [x] Disciplinas/planos: `completeDiscipline` → `awardXp(..., 'discipline', { xpOverride })` em spiritualDisciplines.
- [x] Linguagem de “passos” e “práticas”; sem uso de “mérito” ou “nota” na UI.

### 1.5 Desbloqueio de funcionalidades
- [x] `LEVEL_SUGGESTED_FEATURES`: apenas sugestões por etapa; nenhum `if (level < X) return false` ou bloqueio de navegação.
- [x] Chips “Indicado para sua etapa” apenas navegam; não há verificação de nível para abrir telas.
- [x] Drawer e abas: todas as telas acessíveis independentemente do nível.

### 1.6 UI/UX
- [x] Mensagem fixa presente: `LEVEL_DISCLAIMER_MESSAGE` em `LevelDisclaimer` (Jornada, Dashboard, Perfil).
- [x] Textos da jornada em tom pastoral (“constância”, “sem punição”, “cada um cresce no seu tempo”).
- [x] Sem termos de ranking/competição nos textos analisados (níveis, descrições, legendas).

### 1.7 Edge cases (análise estática)
- [x] Perfil inexistente: `getOrCreateJourneyProfile` cria perfil com total_xp 0, current_level 1.
- [x] `getJourneySummary` retorna `null` se perfil não for criado; JourneyScreen e Dashboard tratam `summary === null` (empty state / fallback “Semente”).
- [x] Dashboard/Profile: em erro ou `journey` null, `levelName` cai para `'Ouvir'` e progress para 0.
- [x] `mapLegacyLevelNameToCurrent`: nome desconhecido retorna 1 (conservador).

---

## 2. Erros encontrados

### 2.1 Crítico: `getLevelInfo` retorna nível errado (sempre o primeiro que satisfaz totalXp >= minXp)

**Arquivo:** `services/spiritualJourney.ts` (linha ~266)

**Problema:**  
`getLevelInfo` usa:

```ts
const current = SPIRITUAL_LEVELS.find((l) => totalXp >= l.minXp) ?? SPIRITUAL_LEVELS[0];
```

`Array.prototype.find` retorna o **primeiro** elemento que satisfaz o predicado. Como o array está em ordem 1..5 com minXp 0, 100, 300, 600, 1000, para qualquer `totalXp >= 0` o primeiro elemento (Semente, minXp 0) já satisfaz. Ou seja, **sempre se obtém nível 1 (Ouvir)** para qualquer total de passos.

**Impacto:**  
- Resumo da jornada (nome da etapa, descrições, progresso no nível) fica incorreto para quem tem total_xp ≥ 100.  
- Usuário com 150 passos deveria ver “Raiz”; vê “Semente” e barra de progresso errada.  
- `getLevelFromTotalXp` está correto (itera do nível 5 para 1); a inconsistência está só em `getLevelInfo`.

**Correção sugerida (conceitual):**  
Calcular o nível atual com a mesma regra de `getLevelFromTotalXp` (maior nível cujo minXp ≤ totalXp) e, a partir desse número, obter o objeto do nível em `SPIRITUAL_LEVELS` (ex.: `SPIRITUAL_LEVELS.find((l) => l.level === levelAtual)`). Não refatorei código conforme solicitado; apenas descrevo o ajuste necessário.

---

## 3. Alertas e riscos futuros

### 3.1 Banco de dados: `action_type` em `spiritual_xp_events`

**Arquivo de referência:** `docs/JORNADA_ESPIRITUAL_SUPABASE.sql` (linha ~27)

O script documenta:

```sql
CHECK (action_type IN ('devotional', 'prayer_register', 'event_checkin', 'reflection'))
```

Ou seja, **não inclui `'discipline'`**. O app chama `awardXp(..., 'discipline', ...)` ao marcar disciplinas. Se o banco tiver sido criado exatamente por esse script, inserts com `action_type = 'discipline'` podem falhar por violação do CHECK.

**Recomendação:**  
Confirmar no Supabase se a constraint atual permite `'discipline'`. Se não, criar migration que altere o CHECK para incluir `'discipline'`. Não foi feita alteração de banco nesta verificação.

### 3.2 Timezone em `todayISO()` e filtros por “hoje”

**Arquivo:** `services/spiritualJourney.ts` — `todayISO()` usa `new Date().toISOString().split('T')[0]`.

Isso usa o fuso do **servidor/ambiente de execução**, não necessariamente o do usuário. Em dispositivo do usuário (Expo/React Native) costuma ser o fuso local; em função serverless poderia ser UTC. Se no futuro a lógica rodar em backend, “hoje” pode divergir do dia local do usuário (ex.: meia-noite em UTC vs Brasil).

**Recomendação:**  
Documentar onde `todayISO()` é usada e, se houver lógica server-side, considerar timezone do usuário ou uso consistente de UTC com conversão explícita.

### 3.3 Perfil com `current_level` desatualizado

O nível exibido em `getJourneySummary` é obtido a partir de `profile.total_xp` (via `getLevelInfo` + mapeamento legado). O campo `profile.current_level` no banco é atualizado em `awardXp` com `safeLevel`. Se em algum momento houver atualização manual do banco (ex.: migração) alterando `total_xp` sem recalcular `current_level`, o valor em `current_level` pode ficar defasado. Hoje a UI não usa diretamente `profile.current_level` para o nível exibido (usa o derivado de `total_xp`), então o risco é mais de consistência futura e de relatórios que leiam `current_level` do banco.

**Recomendação:**  
Em migrações ou scripts que alterem `total_xp`, recalcular e atualizar `current_level` com a mesma regra de `getLevelFromTotalXp`.

### 3.4 `canLevelUp` no resumo

**Arquivo:** `services/spiritualJourney.ts` (linha ~353)

```ts
canLevelUp: info.nextMinXp !== null && profile.total_xp >= info.nextMinXp,
```

Quando `total_xp` já atingiu ou passou do próximo patamar, `canLevelUp` fica true (já “subiu”). Nome sugere “pode subir”; na prática é “já está no próximo ou além”. Se a UI usar `canLevelUp` para mostrar “você pode subir”, pode confundir no nível máximo (onde `nextMinXp` é null). Verificar uso em telas; se for apenas “há próximo nível”, o nome poderia ser ajustado ou a lógica documentada.

---

## 4. Sugestões de melhoria (sem alterar código aqui)

1. **Corrigir `getLevelInfo`**  
   Garantir que “current” seja o nível correspondente a `getLevelFromTotalXp(totalXp)` (maior nível com minXp ≤ totalXp) e que descrições, progresso e “next” sejam calculados a partir desse nível. Isso elimina o bug crítico de todos aparecerem como Ouvir.

2. **Documentar CHECK de `action_type`**  
   Se a base já aceita `'discipline'`, documentar no mesmo lugar do schema (ex.: comentário ou doc de migração). Se não, planejar migration para incluir `'discipline'`.

3. **Testes automatizados**  
   - `getLevelFromTotalXp`: para totalXp 0, 99, 100, 299, 300, 599, 600, 999, 1000, 1500 retornar 1, 1, 2, 2, 3, 3, 4, 4, 5, 5.  
   - `getLevelInfo`: após correção, verificar que para os mesmos totalXp o nível e os textos (name, shortDescription) batem com o nível esperado e que xpInLevel / xpNeededInLevel / progressPercent são coerentes.

4. **Clareza espiritual**  
   Manter revisões de copy em novas telas para evitar termos como “subir de nível” ou “ganhar pontos” sem o contrapeso da mensagem de que níveis não medem fé/santidade; o disclaimer atual já ajuda.

5. **Edge: usuário retorna após muito tempo**  
   Comportamento atual está correto: total_xp não diminui; streak pode reiniciar; nível permanece. Nenhuma alteração necessária para esse caso; apenas garantir que a mensagem de “sem punição” permaneça visível onde fizer sentido.

---

## 5. Resumo

| Área                    | Status   | Observação                                                                 |
|-------------------------|----------|----------------------------------------------------------------------------|
| Estrutura dos 5 níveis | OK       | Ordem, nomes, minXp e textos consistentes.                               |
| Progressão / regressão  | OK       | Sem diminuição de total_xp ou nível; Math.max no update.                   |
| Inatividade             | OK       | Nenhuma penalidade de nível ou XP.                                        |
| Mapeamento legado       | OK       | 1:1; sem perda de progresso.                                              |
| Critérios de avanço     | OK       | Todos os 5 tipos de ação integrados; linguagem de “passos”/práticas.       |
| Desbloqueios            | OK       | Apenas sugestões; nenhum bloqueio por nível.                              |
| UI/UX e disclaimer      | OK       | Mensagem fixa presente; tom pastoral.                                    |
| **getLevelInfo**        | **ERRO** | Nível sempre 1; corrigir usando a mesma regra de getLevelFromTotalXp.      |
| BD action_type          | ALERTA   | Verificar se CHECK inclui `'discipline'`.                                 |
| Timezone / canLevelUp   | ALERTA   | Documentar e revisar uso conforme evolução do produto.                    |

Prioridade recomendada: **estabilidade** (correção de `getLevelInfo` e validação do CHECK) → **clareza espiritual** (manter e revisar textos) → **experiência do usuário** (testes de progressão e edge cases).
