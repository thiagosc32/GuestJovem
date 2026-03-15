# Sistema de liberação de funcionalidades por nível (Feature Gates)

Sistema central que define quais funcionalidades estão disponíveis para cada etapa da jornada espiritual (Ouvir, Seguir, Permanecer, Frutificar, Multiplicar), **sem bloquear a comunhão cristã básica** e **sem usar nível como medida de valor espiritual**.

## Princípios

- **Comunhão básica e presencial sempre liberada**: devocional, oração, reflexões, comunidade (ver posts), **eventos (ver, inscrever, check-in)** e disciplinas estão disponíveis para **todos** os níveis. **O nível mede uso no app, não acesso à comunhão presencial.**
- **Liberação progressiva**: curtir/comentar (Seguir), conquistas e estudos (Permanecer), criar posts e responder pedidos (Frutificar), liderança (Multiplicar).
- **Nível não mede valor espiritual**: os gates apenas organizam a jornada e incentivam constância; não excluem ninguém da vida com Deus.

## API central

Arquivo: **`constants/featureGates.ts`**

| Função | Uso |
|--------|-----|
| `getAvailableFeaturesByLevel(level)` | Lista todas as funcionalidades acessíveis para o nível (1–5). |
| `isFeatureAvailableForLevel(featureId, level)` | Verifica se uma funcionalidade está liberada (para esconder/desabilitar botão, item de menu ou rota). |
| `getFeatureGate(featureId)` | Retorna a configuração da funcionalidade (label, screen, minLevel, description). |

### Exemplo de uso em tela

```ts
import { isFeatureAvailableForLevel } from '../constants/featureGates';

// No componente, com level vindo do getJourneySummary:
const canCreatePost = isFeatureAvailableForLevel('community_post', userLevel);

// Esconder ou desabilitar botão "Criar post"
{canCreatePost && (
  <Button title="Criar post" onPress={goToCreatePost} />
)}
```

### Exemplo para lista de funcionalidades

```ts
import { getAvailableFeaturesByLevel } from '../constants/featureGates';

const features = getAvailableFeaturesByLevel(journeySummary.level);
// Renderizar lista de acessos (menu, cards "Indicado para sua etapa", etc.)
```

## Registro de funcionalidades

Cada funcionalidade em **`FEATURE_GATES`** tem:

- **id**: identificador único (`FeatureId`).
- **label**: texto para UI.
- **minLevel**: nível mínimo (1 = todos; 2 = Seguir+; 3 = Permanecer+; 4 = Frutificar+; 5 = Multiplicar).
- **screen**: rota principal (opcional).
- **description**: texto para tooltip ou mensagem “em breve” (opcional).

Para **adicionar** uma nova funcionalidade gated:

1. Inclua o id em `FeatureId` em `constants/featureGates.ts`.
2. Adicione um objeto em `FEATURE_GATES` com `minLevel`, `label` e, se fizer sentido, `screen` e `description`.
3. Nas telas que precisam esconder/desabilitar o acesso, use `isFeatureAvailableForLevel(id, level)`.

## Funcionalidades OBRIGATÓRIAS (ALL) — nunca bloqueadas por nível

Estas funcionalidades são **base da vida cristã e comunhão** e **devem** estar disponíveis para todos os usuários, independente do nível espiritual:

| Funcionalidade                     | FeatureId           | Onde acessar no app                    |
|------------------------------------|---------------------|----------------------------------------|
| Devocional semanal                 | `devotional`        | Aba Devocional                          |
| Pedidos de oração (ver, criar, orar por) | `prayer`, `prayer_interact` | Drawer → Pedidos de Oração     |
| Comunidade (ver posts)             | `community`         | Drawer → Comunidade                     |
| Bíblia                             | `bible`             | Drawer → Bíblia                         |
| Perfil espiritual                  | `spiritual_profile` | Drawer → Jornada Espiritual             |
| **Eventos (ver, inscrever, check-in)** | `events`         | Aba Eventos — **todos participam**      |

No código, elas estão em **`FEATURES_ALWAYS_AVAILABLE`** em `constants/featureGates.ts`. **Eventos e pedidos de oração (criar, orar por, comentar) são para todos** — o nível mede uso no app, não acesso à comunhão presencial.

**Contas admin:** Por padrão já estão no nível 5 (Multiplicar), independente do XP.

## Outras funcionalidades sempre disponíveis (minLevel 1)

- Jornada Espiritual, Reflexões, Disciplinas, Planos e desafios bíblicos  

## Liberação progressiva

| Nível | Etapa   | Funcionalidades adicionais                                                       |
|-------|---------|----------------------------------------------------------------------------------|
| 2     | Seguir    | Curtir e comentar na comunidade (`community_like_comment`) |
| 3     | Permanecer| Estudos guiados (`guided_studies`); Conquistas e badges (`badges`)               |
| 4     | Frutificar| Criar posts (`community_post`); responder pedidos (`prayer_respond`); mentoria  |
| 5     | Multiplicar| Liderança e multiplicação                                                        |

## Onde está integrado

- **Drawer (menu lateral)**: `CustomDrawerContent` carrega o nível da jornada e filtra os itens com `isFeatureAvailableForLevel(item.featureId, journeyLevel)`. Itens sem `featureId` permanecem sempre visíveis.
- **Telas**: use `isFeatureAvailableForLevel('community_post', level)` (ou outro id) para esconder/desabilitar botões (ex.: "Criar post") ou rotas específicas.

## Manutenção

- **Alterar nível mínimo**: edite o objeto da funcionalidade em `FEATURE_GATES`.
- **Nova funcionalidade**: adicione em `FeatureId` e em `FEATURE_GATES`; use `isFeatureAvailableForLevel` onde for necessário.
- **Novas telas**: se a tela for gated, associe-a a um `FeatureId` e verifique no fluxo de navegação ou no menu.
