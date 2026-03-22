# Erro: "Database error saving new user" (cadastro)

Esse texto vem do **Supabase Auth** quando algo falha **no banco** ao finalizar a criação do usuário (geralmente um **trigger** em `auth.users` ou política em `public.users`).

## Causas frequentes

1. **E-mail duplicado em `public.users`**  
   Existe linha em `public.users` com o mesmo e-mail, mas o `id` não existe mais em `auth.users` (usuário apagado só no Auth, perfil ficou). O `INSERT` do trigger viola `UNIQUE (email)`.

2. **Migração do trigger não aplicada**  
   A função `handle_new_auth_user` e o trigger `on_auth_user_created` precisam existir no projeto (ver `supabase/migrations/20250318000000_users_signup_insert_policy.sql` e `20250319000000_handle_new_auth_user_fix_orphans.sql`).

3. **Outro erro no trigger**  
   Constraint em colunas de `users`, RLS inesperado, etc.

## O que fazer

1. **Aplicar migrações** no Supabase (SQL Editor ou `supabase db push` / pipeline do projeto).

2. **Ver o erro exato**  
   Supabase Dashboard → **Logs** → **Postgres** (ou **Database** → **Logs**). Procure a mensagem logo após tentar cadastrar.

3. **Limpar manualmente (só se souber o que faz)**  
   Se confirmar que é linha órfã:
   ```sql
   -- Listar possíveis órfãos (perfil sem auth)
   SELECT u.id, u.email
   FROM public.users u
   LEFT JOIN auth.users au ON au.id = u.id
   WHERE au.id IS NULL;
   ```
   Depois de conferir, pode remover só essas linhas ou aplicar a migração `20250319000000_handle_new_auth_user_fix_orphans.sql` que remove órfãos com o mesmo e-mail na hora do cadastro.

4. **Confirmar template de e-mail**  
   O fluxo atual usa `signUp` + confirmação por e-mail; isso não deve gerar esse erro por si só — o problema é quase sempre o trigger/`public.users`.
