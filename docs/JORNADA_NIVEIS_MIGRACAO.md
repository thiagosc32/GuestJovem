# Migração: níveis antigos → níveis espirituais atuais

## Objetivo

Registrar o mapeamento entre os **níveis antigos** e os **novos níveis espirituais** (jornada bíblica), garantindo que **nenhum usuário perda progresso** e que a migração seja **transparente** e **conservadora** quando não houver equivalência clara.

---

## Mapeamento oficial (nível por nível)

| Nível (1–5) | Nome antigo | Nome novo   | minXp | Observação                          |
|-------------|-------------|-------------|-------|-------------------------------------|
| 1           | Semente     | Ouvir       | 0     | Equivalência direta. |
| 2           | Broto       | Seguir      | 150   | Mesma faixa de total_xp. |
| 3           | Raiz        | Permanecer  | 450   | Mesma faixa de total_xp. |
| 4           | Árvore      | Frutificar  | 900   | Mesma faixa de total_xp. |
| 5           | Fruto       | Multiplicar | 1500  | Mesma faixa de total_xp. |

- O **número do nível** (1–5); as **faixas de total_xp** atuais são: 0, 150, 450, 900, 1.500.
- Apenas os **nomes** e os **textos** (descrição, versículo, frase inspiracional) de cada etapa foram alterados (nomes atuais: João 15 — Ouvir, Seguir, Permanecer, Frutificar, Multiplicar).
- Portanto: **quem estava no nível X no sistema antigo permanece no nível X no novo**; só a etiqueta exibida muda (ex.: nível 2 "Broto" → "Seguir").

---

## Garantias

1. **Usuários não perdem progresso**  
   - `current_level` (1–5) e `total_xp` no banco **não precisam de migração**: a numeração e as faixas foram preservadas.  
   - A UI passa a usar os novos nomes a partir de `constants/spiritualJourney.ts` (`SPIRITUAL_LEVELS`).

2. **Equivalência mais próxima**  
   - Nível antigo X → nível novo X (1:1). Não há “pulo” nem rebaixamento.

3. **Registro transparente**  
   - Mapeamento em código: `constants/spiritualJourney.ts`  
     - `LEGACY_LEVEL_NAMES`, `CURRENT_LEVEL_NAMES`, `LEGACY_TO_CURRENT_LEVEL_MAP`  
     - `mapLegacyLevelToCurrent(legacyLevel)`, `mapLegacyLevelNameToCurrent(legacyName)`  
   - Este documento: `docs/JORNADA_NIVEIS_MIGRACAO.md`.

4. **Critério conservador quando não há equivalência clara**  
   - Se no futuro existir nível legado fora do intervalo 1–5 ou nome desconhecido:  
     - `mapLegacyLevelToCurrent` devolve nível válido (1–5) sem **rebaixar** o usuário.  
     - `mapLegacyLevelNameToCurrent` devolve 1 quando o nome não for reconhecido (não se assume nível alto).

---

## Uso no código

- **Exibição atual:** o nível exibido vem de `SPIRITUAL_LEVELS[level - 1]` (nome, descrição, versículo). Não é necessário alterar leitura de `current_level` no perfil.
- **Dados legados (nome ou número):**  
  - Número: `mapLegacyLevelToCurrent(profile.current_level)` antes de usar o nível.  
  - Nome (ex. export/import): `mapLegacyLevelNameToCurrent(legacyName)`.

---

## Resumo

- **Migração de dados:** não é necessária; nível (1–5) e `total_xp` continuam válidos.  
- **Migração de experiência:** apenas de rótulos (nomes e textos) na interface, usando o mapeamento documentado acima e as constantes/funções em `constants/spiritualJourney.ts`.
