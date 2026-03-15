# Vida Espiritual e Avatar (Ovelinha)

Este documento explica como funciona o sistema de **Vida Espiritual** no app e como o avatar da ovelhinha muda de acordo com a constância do usuário.

---

## Conceito

A **Vida Espiritual** é uma representação visual inspirada em gamificação gentil (como no Duolingo). Uma **ovelinha simbólica** representa o estado atual da constância do usuário:

- **Não representa Deus** — apenas a vida espiritual e a constância da pessoa dentro do app.
- **Reage à frequência das práticas** — quanto mais regular o usuário for, mais forte a ovelha aparece.
- **Sem punição, sem culpa** — linguagem pastoral e acolhedora em todas as mensagens.
- **Não altera XP nem nível** — o total de passos e o nível continuam intactos; só o visual muda.

---

## Como o estado é calculado

O estado da ovelhinha depende de **quantos dias se passaram desde a última atividade** que gerou passos (XP).

### O que conta como atividade

Qualquer ação que concede passos na Jornada Espiritual atualiza a data de última atividade (`last_activity_date`):

- Conclusão de devocional  
- Registro de oração  
- Check-in em evento  
- Reflexão espiritual  
- Disciplinas espirituais (diárias, semanais ou mensais)

O sistema usa o campo `last_activity_date` da tabela `spiritual_journey_profiles`. Essa data é atualizada sempre que o usuário ganha XP.

### Cálculo dos dias sem prática

1. O app busca o perfil da jornada do usuário.
2. Lê `last_activity_date` (formato YYYY-MM-DD).
3. Calcula a diferença em dias entre **hoje** e essa data (usando fuso local).
4. Aplica os limites definidos em `constants/spiritualCompanion.ts` para decidir o estado.

**Exemplo:** Se a última atividade foi ontem, são 1 dia sem prática. Se foi há 4 dias, são 4 dias sem prática.

---

## Estados da ovelhinha e quando mudam

| Estado | Dias sem prática | Imagem | Rótulo na UI |
|--------|------------------|--------|--------------|
| **Forte e Cuidada** | 0 | `ovelha-strong.png` | Ovelinha Forte e Cuidada |
| **Cansada** | 1–2 | `ovelha-weakening.png` | Ovelinha Cansada |
| **Fraca** | 3–5 | `ovelha-weak.png` | Ovelinha Fraca |
| **Perdida** | 6+ | `ovelha-bones.png` | Ovelinha Perdida |

### Descrição de cada estado

| Estado | Mensagem exibida | Significado visual |
|--------|------------------|--------------------|
| **Forte e Cuidada** | "Sua constância está cuidando da sua vida espiritual. Continue assim!" | Ovelha feliz, saudável, em campo verde |
| **Cansada** | "Sua ovelinha está cansada. Um pequeno passo hoje já faz diferença." | Ovelha triste/deitada, fundo quente |
| **Fraca** | "Ela está esperando você. Quando puder, volte com calma — sem culpa." | Ovelha triste/sentada, terreno seco |
| **Perdida** | "Sempre que quiser retomar, ela estará aqui. Cada novo dia é uma nova chance." | Ovelha muito triste, simbólica |

---

## Como o avatar muda visualmente

Além da troca da imagem, o card de Vida Espiritual altera outros elementos conforme o estado:

### 1. Imagem da ovelha

Cada estado usa uma imagem diferente da pasta `assets/ovelhas/`:

- **strong:** `ovelha-strong.png` — feliz, saudável
- **weakening:** `ovelha-weakening.png` — cansada/deitada
- **weak:** `ovelha-weak.png` — fraca/sentada
- **bones:** `ovelha-bones.png` — simbólica, estado “perdida”

As imagens são exibidas em formato circular (avatar redondo), mesmo que o arquivo original seja quadrado.

### 2. Anel de progresso (ring)

Ao redor da ovelha há um anel colorido que indica o nível de “preenchimento”:

| Estado | Cor do anel | Preenchimento |
|--------|-------------|---------------|
| Forte | Verde (`#22C55E`) | 100% |
| Cansada | Amarelo (`#EAB308`) | 72% |
| Fraca | Laranja (`#F97316`) | 44% |
| Perdida | Vermelho (`#EF4444`) | 20% |

### 3. Animação de pulso

A ovelha tem uma leve animação de “respiração” (scale de 1 a 1,04), que torna o visual mais vivo e suave.

### 4. Badge e cores

O chip/badge que exibe o rótulo do estado usa cores diferentes por estado (dourado, secundária, cinza ou claro), reforçando a diferença visual entre forte e enfraquecido.

---

## Onde a vida espiritual aparece

| Local | Componente | O que mostra |
|-------|------------|-------------|
| **Tela de Disciplinas** | `SpiritualCompanion` | Card completo: ovelha, anel, mensagem e badge |
| **Dashboard do usuário** | `ConstancyBar` | Barra compacta com o estado (sem a imagem da ovelha) |

A tela de Disciplinas exibe o card completo com a ovelhinha. O dashboard exibe uma versão resumida (ConstancyBar) que indica o estado sem a imagem.

---

## Comportamento ao retomar as práticas

Quando o usuário volta a praticar (ex.: marca uma disciplina, conclui um devocional):

1. O sistema concede passos e atualiza `last_activity_date`.
2. Na próxima abertura da tela, `getCompanionState` recalcula o estado.
3. Com 0 dias sem prática, o estado passa a ser **Forte e Cuidada**.
4. A ovelha e o anel passam a usar a visualização de estado “forte”.

Não é necessário fazer nada extra; o cálculo é feito sempre que a tela é exibida.

---

## Regras importantes

- **Sem punição:** XP e nível nunca diminuem. A ovelha só reflete a constância atual.
- **Sem culpa:** Mensagens sempre acolhedoras, convidando a retomar sem cobrança.
- **Sempre privado:** Só o próprio usuário vê sua vida espiritual (RLS no banco).
- **Cálculo em tempo real:** O estado é calculado no app a cada exibição; não há job/cron no backend.

---

## Onde está no código

| Parte | Arquivo |
|-------|---------|
| Limites de dias (thresholds) | `constants/spiritualCompanion.ts` |
| Mensagens e rótulos | `constants/spiritualCompanion.ts` |
| Cálculo do estado | `services/spiritualCompanion.ts` → `getCompanionState()` |
| Componente visual (card) | `components/SpiritualCompanion.tsx` |
| Imagens por estado | `assets/ovelhas/` (ovelha-strong.png, ovelha-weakening.png, etc.) |
| Barra compacta | `components/ConstancyBar.tsx` |
| Uso na tela de Disciplinas | `screens/user/DisciplinesScreen.tsx` |
| Uso no Dashboard | `screens/user/UserDashboard.tsx` |
| Documentação técnica anterior | `docs/VIDA_ESPIRITUAL.md` |
