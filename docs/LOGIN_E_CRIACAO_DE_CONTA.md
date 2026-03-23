# Login e Criação de Conta — Guest Jovem

Descrição completa do fluxo atual de autenticação e criação de conta no app Guest Jovem (React Native / Expo + Supabase).

---

## 1. Visão geral

O app oferece estes fluxos de acesso:

| Método | Descrição |
|--------|-----------|
| **E-mail e senha** | Na aba **Entrar**: e-mail + senha. |
| **Cadastro com confirmação por e-mail** | Na aba **Cadastrar**: nome, e-mail, senha e confirmação → `signUp` envia o e-mail **Confirm signup**; o usuário abre o link e depois faz **Entrar**. |
| **Google (OAuth)** | Login ou criação de conta usando conta Google (Supabase Auth com provider Google). |
| **Redefinição de senha** | Envio de e-mail com link para redefinir a senha (fluxo e-mail/senha na aba Entrar). |

- **Backend:** Supabase (Auth + tabela `public.users` para perfil e role).
- **Cliente:** `services/supabase.ts` (funções de auth) e `screens/AuthScreen.tsx` (tela de login/cadastro).
- **Controle de sessão e redirect OAuth:** `App.tsx` (estado global de autenticação e tratamento de deep link / callback).

---

## 2. Backend (Supabase)

### 2.1 Supabase Auth

- **Login com senha:** `signInWithPassword({ email, password })`
- **Cadastro com confirmação por e-mail:** `signUp({ email, password, options: { data: { name }, emailRedirectTo } })` envia o e-mail de confirmação (template **Confirm signup**); após o clique no link, o usuário pode fazer `signInWithPassword`. O perfil em `public.users` é criado pelo trigger `handle_new_auth_user` ao inserir em `auth.users` (nome em `user_metadata`).
- **Redefinição de senha:** `resetPasswordForEmail(email)` — envia e-mail com link do Supabase.
- **Google:** OAuth 2.0 via Supabase (`signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } })`).

Configuração do projeto Supabase:

- **Authentication → Providers:** E-mail e Google habilitados.
- **Authentication → URL Configuration:**
  - **Site URL:** URL do app (ex.: `https://guestjovem.com`).
  - **Redirect URLs:** todas as URLs para onde o Supabase pode redirecionar após login (ver seção 9).

### 2.2 Tabela `public.users`

Usada para perfil do usuário e papel no app:

- `id` (UUID, PK) — mesmo `id` do Supabase Auth.
- `email`, `name`, `role` (`'user'` ou `'admin'`), `created_at`, etc.

O perfil é criado:

- **No cadastro por e-mail/senha:** trigger `on_auth_user_created` → `handle_new_auth_user` cria a linha em `public.users` com o nome vindo de `raw_user_meta_data` (definido no `signUp`).
- **Se a confirmação de e-mail estiver desativada no Supabase:** `signUp` retorna sessão e o código pode inserir em `users` se ainda não existir linha (fallback).
- **No primeiro login com Google:** pela função `ensureUserProfileForOAuth()` (ver seção 7.7).

---

## 3. Cliente Supabase (sessão e storage)

Em `services/supabase.ts`:

- **Storage:** `AsyncStorage` (React Native) para persistir a sessão.
- **Opções de auth:** `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: true` apenas na web.
- **Plataforma:** em mobile, `startAutoRefresh()` é chamado e pausado conforme `AppState` (active/background).

O cliente é inicializado de forma preguiçosa (proxy) para garantir que variáveis de ambiente (URL e anon key) estejam disponíveis antes de chamar a API.

---

## 4. Login com e-mail e senha

### 4.1 Fluxo na tela

1. Usuário preenche **E-mail** e **Senha** e toca em **Entrar**.
2. Validações:
   - E-mail não vazio e formato válido (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
   - Senha não vazia.
3. Chamada a `signIn(email, password)` (Supabase `signInWithPassword`).
4. Em sucesso: `getCurrentUser()` para obter o perfil em `users`; o `role` define se é admin ou user; `onAuthenticate(role)` atualiza o estado global e o app navega para a área logada.
5. Em erro:
   - "Invalid login credentials" → mensagem: "E-mail ou senha incorretos."
   - "Email not confirmed" → "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada."
   - Outros erros → mensagem retornada pela API.

### 4.2 Função no serviço

```ts
// services/supabase.ts
signIn(email, password) → supabase.auth.signInWithPassword({ email, password })
```

Com **confirmação de e-mail** habilitada no Supabase, o login só funciona após o usuário confirmar pelo link do e-mail (mensagem de erro “Email not confirmed” tratada na tela).

---

## 5. Criação de conta (link de confirmação no e-mail)

### 5.1 Fluxo na tela

1. Aba **Cadastrar:** preencher **Nome completo**, **E-mail**, **Senha** e **Confirmar senha**; tocar em **Cadastrar**.
2. O app chama `signUp(email, password, name)` com `emailRedirectTo` (URL pública do app — ver `getAuthEmailRedirectUrl()` e `EXPO_PUBLIC_WEB_URL`).
3. Se o Supabase **não** devolver sessão (confirmação obrigatória): exibe mensagem de sucesso pedindo para abrir o e-mail e confirmar; o usuário depois usa **Entrar** com a mesma senha.
4. Se o projeto tiver **confirmação de e-mail desligada**, `signUp` pode retornar sessão e o app entra direto (como antes).

### 5.2 Função no serviço

```ts
// services/supabase.ts
signUp(email, password, name) →
  supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, full_name },
      emailRedirectTo: getAuthEmailRedirectUrl(),
    },
  })
```

### 5.3 Template de e-mail (Supabase)

1. **Authentication** → **Email Templates** → **Confirm signup**.
2. Use o link de confirmação padrão do Supabase (`{{ .ConfirmationURL }}` ou equivalente no editor), para o usuário confirmar pelo **navegador/app** após clicar.
3. Garanta que **Redirect URLs** inclua o mesmo domínio usado em `emailRedirectTo` / `EXPO_PUBLIC_WEB_URL`.

### 5.4 Conta apagada no Dashboard e novo cadastro com o mesmo e-mail

Se você **remove o usuário** em Authentication → Users no Supabase, o **aparelho** pode ainda guardar o refresh token no **AsyncStorage**. Ao cadastrar de novo com o mesmo e-mail, essa sessão antiga fazia o app entrar direto em vez de seguir o fluxo do e-mail de confirmação.

O `signUp` no app chama **`signOut` antes** de `auth.signUp` para limpar tokens locais. Se algo estranho persistir, peça ao usuário para **desinstalar/reinstalar** o app ou limpar dados do app.

---

## 6. Redefinição de senha

### 6.1 Fluxo na tela

1. Usuário informa o **e-mail** (no campo da tela de login) e toca em **Esqueci minha senha**.
2. Validação: e-mail não vazio e formato válido.
3. Chamada a `resetPassword(email)` (Supabase `resetPasswordForEmail`).
4. Em sucesso: "Enviamos um link para redefinir sua senha no e-mail informado. Verifique sua caixa de entrada."
5. O link enviado é do Supabase; ao clicar, o usuário redefine a senha na página do Supabase (ou na URL configurada no projeto).

### 6.2 Funções no serviço

```ts
// services/supabase.ts
resetPassword(email) → supabase.auth.resetPasswordForEmail(email.trim())
```

---

## 7. Login / Criação de conta com Google (OAuth)

O mesmo fluxo serve para **login** e **criação de conta**: se não existir usuário no Supabase Auth, um é criado; em seguida o perfil em `users` é garantido por `ensureUserProfileForOAuth()`.

### 7.1 URL de redirect

- **Web:** `redirectTo = window.location.origin + '/'` (ex.: `https://guestjovem.com/`).
- **Mobile (app nativo):** `redirectTo = 'guestjovem://google-auth'` (deep link).

Essas URLs precisam estar em **Redirect URLs** no Supabase (ver seção 9).

### 7.2 Obtenção da URL de login

```ts
// services/supabase.ts
getGoogleSignInUrl(redirectTo?) →
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTo ?? 'guestjovem://google-auth', skipBrowserRedirect: true }
  })
  → retorna data.url para abrir no browser
```

### 7.3 Mobile (iOS / Android)

1. Usuário toca em **Entrar com Google**.
2. Abre o browser (ou in-app browser) em `data.url` via `WebBrowser.openAuthSessionAsync(url, redirectTo)`.
3. Usuário faz login no Google; Supabase redireciona para `guestjovem://google-auth#access_token=...&refresh_token=...`.
4. O app é reaberto pelo deep link; `App.tsx` trata o link (Linking) e chama `handleOAuthRedirect(url)`.
5. `setSessionFromOAuthUrl(url)` extrai tokens do hash e chama `setSession`; em seguida `ensureUserProfileForOAuth()` e `getCurrentUser()`; estado global é atualizado e o usuário entra no app.

### 7.4 Web (navegador normal)

- Uso de `WebBrowser.openAuthSessionAsync` (comportamento depende da plataforma; pode abrir popup ou redirecionar).
- Se o retorno vier na mesma aba ou no resultado da sessão, `App.tsx` processa a URL inicial (`Linking.getInitialURL()`) ou o evento `url` com o hash e aplica `setSessionFromOAuthUrl` + `ensureUserProfileForOAuth` + atualização de estado.

### 7.5 Web — PWA / Atalho na tela inicial

Para que o retorno do Google **volte para o atalho** (e não abra no navegador):

1. O login Google é aberto em **popup** (`window.open(url, 'oauth_guestjovem', '...')`).
2. O atalho (janela principal) permanece aberto e registra um listener para o evento `message`.
3. Após o login, o Supabase redireciona a **popup** para a URL do site (ex.: `https://guestjovem.com/#access_token=...`).
4. A página que carrega na popup (mesmo app) detecta que está em popup (`window.opener`) e que a URL contém tokens no hash; então envia `postMessage` para o opener com a URL completa e fecha a popup.
5. A janela do atalho recebe a mensagem, chama `setSessionFromOAuthUrl(event.data.url)`, `ensureUserProfileForOAuth()`, `getCurrentUser()` e `onAuthenticate(role)`.

Assim a sessão fica no contexto do atalho e o usuário permanece “no app” (PWA).

Se o pop-up for bloqueado, é exibida a mensagem: "Permita pop-ups para este site e tente novamente."

### 7.6 Definição da sessão a partir do callback OAuth

```ts
// services/supabase.ts
setSessionFromOAuthUrl(url) →
  Lê o hash da URL (#access_token=...&refresh_token=...)
  → supabase.auth.setSession({ access_token, refresh_token })
```

### 7.7 Criação de perfil para usuário OAuth (Google)

```ts
// services/supabase.ts
ensureUserProfileForOAuth() →
  1. Obtém sessão (getSession) e user
  2. Se já existe registro em users com id = user.id → retorna
  3. Senão: insert em users com id, email, name (metadata do Google ou fallback), role: 'user', created_at
```

Assim, todo primeiro login com Google gera um perfil em `users` com `role: 'user'`.

---

## 8. Controle global no App.tsx

### 8.1 Estado de autenticação

- `isAuthenticated`, `userRole` ('admin' | 'user' | null) e `isLoading` controlam a tela inicial (login vs app).
- Na abertura, `checkAuthStatus()` chama `getCurrentUser()`; se houver usuário e perfil, preenche role e marca como autenticado.

### 8.2 Persistência e logout

- `supabase.auth.onAuthStateChange`: em evento `SIGNED_OUT` ou sessão nula, `userRole` e `isAuthenticated` são limpos.
- A sessão em si é persistida pelo Supabase client (AsyncStorage / storage web).

### 8.3 Tratamento do callback OAuth

- `Linking.getInitialURL()` e `Linking.addEventListener('url', ...)` recebem a URL de retorno (mobile: deep link; web: URL com hash quando a aba/popup carrega).
- URL considerada callback OAuth: começa com `guestjovem://google-auth` ou contém `#` e `access_token=`.
- Se for callback:
  - **Web e em popup (`window.opener`):** envia `postMessage` para o opener com a URL e chama `window.close()` (o atalho trata a mensagem e faz login).
  - **Caso contrário:** executa `setSessionFromOAuthUrl(url)`, `ensureUserProfileForOAuth()`, `getCurrentUser()` e atualiza `userRole` e `isAuthenticated`.

---

## 9. Configuração necessária (Supabase e Google)

### 9.1 Supabase Dashboard

- **Authentication → URL Configuration**
  - **Site URL:** ex.: `https://guestjovem.com` (ou a URL base do app).
  - **Redirect URLs** (exemplos):
    - `https://guestjovem.com/`
    - `https://guestjovem.com/**`
    - `guestjovem://google-auth`
    - Em desenvolvimento: `http://localhost:8081/`, `http://localhost:8081/**` (ou a porta usada).

- **Authentication → Providers**
  - Email: habilitado.
  - Google: habilitado, com Client ID e Secret do Google Cloud (OAuth 2.0).

### 9.2 Google Cloud Console

- Criar credenciais OAuth 2.0 (tipo “Aplicativo da Web” ou conforme orientação do Supabase).
- Em “URIs de redirecionamento autorizados” incluir a URL de callback do Supabase (ex.: `https://<projeto>.supabase.co/auth/v1/callback`).

### 9.3 Variáveis de ambiente (app)

- `EXPO_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: chave anônima (public) do projeto.

Usadas em build (ex.: EAS) e, na web, para conectar ao mesmo projeto.

---

## 9.4 Como mostrar "Prosseguir para guestjovem" em vez de supabase.co

A mensagem **"Prosseguir para ytfysvzkcdwfuftwwwyp.supabase.co"** é exibida pelo **navegador** (segurança ao mudar de site). Não dá para alterar esse texto pelo código do app; o que aparece é o **domínio de destino** do redirect.

Para o usuário ver algo com **guestjovem** (por exemplo "Prosseguir para auth.guestjovem.com" ou "Prosseguir para guestjovem.supabase.co"), é preciso que o **fluxo de autenticação use um domínio que contenha "guestjovem"**. O Supabase oferece duas formas (ambas em **planos pagos**):

### Opção A — Custom domain (domínio próprio)

- Exemplo: **auth.guestjovem.com** (ou **api.guestjovem.com**) como URL do projeto Supabase.
- O navegador mostrará algo como: **"Prosseguir para auth.guestjovem.com"**.
- **Requisitos:** plano pago Supabase, add-on Custom Domain, DNS (CNAME + TXT para verificação).
- **No app:** usar essa URL como `EXPO_PUBLIC_SUPABASE_URL` (ex.: `https://auth.guestjovem.com`).
- **Google Cloud Console:** adicionar em "URIs de redirecionamento autorizados" a URL de callback com o novo domínio (ex.: `https://auth.guestjovem.com/auth/v1/callback`).

Passo a passo oficial: [Supabase – Custom Domains](https://supabase.com/docs/guides/platform/custom-domains).

### Opção B — Vanity subdomain (subdomínio Supabase)

- Exemplo: **guestjovem.supabase.co** em vez de `ytfysvzkcdwfuftwwwyp.supabase.co`.
- O navegador mostrará: **"Prosseguir para guestjovem.supabase.co"**.
- **Requisitos:** plano pago (Pro/Team), Supabase CLI; o subdomínio precisa estar disponível.
- **No app:** usar `https://guestjovem.supabase.co` como `EXPO_PUBLIC_SUPABASE_URL`.
- **Google Cloud Console:** adicionar `https://guestjovem.supabase.co/auth/v1/callback` nos redirect URIs.

Configuração via CLI: [Supabase – Vanity subdomains](https://supabase.com/docs/guides/platform/custom-domains#vanity-subdomains).

Resumo: a mensagem só muda se a **URL do Supabase** (e portanto do redirect de login) for um domínio que contenha "guestjovem" (custom domain ou vanity subdomain), e o app passar a usar essa URL em todas as chamadas ao Supabase.

---

## 10. Resumo dos arquivos envolvidos

| Arquivo | Função |
|---------|--------|
| `screens/AuthScreen.tsx` | Formulários de login, criação de conta, “esqueci senha” e botão “Entrar com Google”; validações; fluxo popup (web PWA). |
| `services/supabase.ts` | `signIn`, `signUp` (confirmação por e-mail), `resetPassword`, `getGoogleSignInUrl`, `setSessionFromOAuthUrl`, `ensureUserProfileForOAuth`, `getCurrentUser`; configuração do client e persistência de sessão. |
| `App.tsx` | Estado global de auth; `checkAuthStatus`; `onAuthStateChange`; tratamento de URL de callback OAuth (deep link e web, incluindo popup → postMessage). |

---

## 11. Regras de negócio resumidas

- **Senha mínima:** 6 caracteres (apenas no cadastro por e-mail).
- **Perfil em `users`:** criado pelo trigger ao registrar em Auth (cadastro e-mail) ou no primeiro login com Google (`ensureUserProfileForOAuth`).
- **Role padrão:** sempre `'user'` ao criar perfil; admins são definidos manualmente (ou por outro processo) na tabela `users`.
- **Web PWA:** login Google em popup + postMessage para manter o retorno no atalho da tela inicial; pop-ups devem estar permitidos para o site.

Este documento descreve o comportamento atual do código; alterações em Supabase (políticas, triggers, confirmação de e-mail) podem acrescentar ou modificar passos (ex.: confirmação de e-mail obrigatória).
