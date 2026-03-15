# Contas de teste por etapa da Jornada Espiritual

Contas prontas para testar cada nível da jornada (Ouvir, Seguir, Permanecer, Frutificar, Multiplicar), no mesmo estilo das contas Admin e Usuário.

## Credenciais (acesso rápido na tela de login)

| Etapa    | E-mail               | Senha    |
|----------|----------------------|----------|
| Ouvir       | semente@conviva.com  | teste123 |
| Seguir      | raiz@conviva.com     | teste123 |
| Permanecer  | caule@conviva.com    | teste123 |
| Frutificar  | fruto@conviva.com    | teste123 |
| Multiplicar | colheita@conviva.com | teste123 |

## Como deixar as contas prontas no projeto

1. **Criar os usuários no Supabase**
   - Painel Supabase → **Authentication** → **Users** → **Add user** → **Create new user**
   - Crie um usuário para cada linha da tabela acima (e-mail e senha).

2. **Sincronizar `public.users` e perfis da jornada**
   - No **SQL Editor** do Supabase, execute **somente** o arquivo **`.sql`** (não este `.md`).
   - Abra o arquivo `supabase/seed_journey_test_accounts.sql`, copie **todo** o conteúdo e cole no SQL Editor; depois clique em Run.
   - Esse script:
     - Insere ou atualiza linhas em `public.users` a partir de `auth.users` para esses e-mails.
     - Cria ou atualiza `spiritual_journey_profiles` com o `total_xp` e `current_level` corretos para cada etapa.

Depois disso, basta usar os botões de acesso rápido na tela de login (Admin | Usuário e **Jornada (teste):** Ouvir | Seguir | Permanecer | Frutificar | Multiplicar).
