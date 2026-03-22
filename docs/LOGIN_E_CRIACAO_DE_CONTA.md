# Login e Criação de Conta — Guest Jovem

Descrição completa do fluxo atual de autenticação e criação de conta no app Guest Jovem (React Native / Expo + Supabase).

---

## 1. Visão geral

O app oferece quatro formas de acesso:

| Método | Descrição |
|--------|-----------|
| **Código por e-mail (OTP)** | Login sem senha: o usuário informa o e-mail, recebe um código de 6 dígitos e digita o código para entrar (padrão na aba Entrar). |
| **E-mail e senha** | Login ou cadastro com senha; opção "Entrar com senha" na aba Entrar ou aba Cadastrar. |
| **Google (OAuth)** | Login ou criação de conta usando conta Google (Supabase Auth com provider Google). |
| **Redefinição de senha** | Envio de e-mail com link para redefinir a senha (apenas fluxo e-mail/senha). |

- **Backend:** Supabase (Auth + tabela `public.users` para perfil e role).
- **Cliente:** `services/supabase.ts` (funções de auth) e `screens/AuthScreen.tsx` (tela de login/cadastro).
- **Controle de sessão e redirect OAuth:** `App.tsx` (estado global de autenticação e tratamento de deep link / callback).

---

## 2. Backend (Supabase)

### 2.1 Supabase Auth

- **Login com senha:** `signInWithPassword({ email, password })`
- **Login por código (OTP):** `signInWithOtp({ email, options: { shouldCreateUser: true } })` envia o código; `verifyOtp({ email, token, type: 'email' })` valida o código e inicia a sessão.
- **Cadastro:** `signUp({ email, password, options: { data: { name } } })`
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

- **No cadastro por e-mail:** logo após `signUp`, com `insert` em `users` (`id`, `email`, `name`, `role: 'user'`).
- **No primeiro login com Google:** pela função `ensureUserProfileForOAuth()` (ver seção 6.2).

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

Não há confirmação de e-mail obrigatória no código; o comportamento depende das configurações do Supabase (confirmar e-mail ou não).

### 4.5 Login por código por e-mail (OTP)

Na aba **Entrar**, o fluxo padrão é sem senha: o usuário informa o e-mail, recebe um código de 6 dígitos por e-mail e digita o código para entrar.

**Fluxo na tela:**

1. Usuário preenche **E-mail** e toca em **Enviar código**.
2. Validação: e-mail não vazio e formato válido.
3. Chamada a `sendEmailOtp(email)` (Supabase `signInWithOtp({ email, options: { shouldCreateUser: true } })`).
4. Em sucesso: mensagem "Código enviado! Verifique seu e-mail e digite os 6 dígitos."; a tela passa a mostrar o campo **Código** e o botão **Entrar**, além de **Reenviar código**.
5. Usuário digita o código de 6 dígitos e toca em **Entrar**.
6. Chamada a `verifyEmailOtp(emailForOtp, code)` (Supabase `verifyOtp({ email, token, type: 'email' })`).
7. Em sucesso: `ensureUserProfileForOAuth()` garante perfil em `users`; em seguida `getCurrentUser()` e `onAuthenticate(role)`.
8. O link **Entrar com senha** exibe o formulário tradicional (e-mail + senha). O link **Usar código por e-mail** volta ao fluxo OTP.

**Funções no serviço:**

```ts
// services/supabase.ts
sendEmailOtp(email)   → supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
verifyEmailOtp(email, token) → supabase.auth.verifyOtp({ email, token, type: 'email' })
```

**Template de e-mail no Supabase (obrigatório para OTP):**

Por padrão o Supabase envia um *magic link* (link de confirmação). Para enviar um **código de 6 dígitos** em vez do link:

1. No **Supabase Dashboard** → **Authentication** → **Email Templates**.
2. Selecione o template **Magic Link** (ou o usado para sign-in por e-mail).
3. No corpo do e-mail, use a variável **`{{ .Token }}`** para exibir o código de 6 dígitos.  
   Exemplo de corpo:  
   `Seu código de acesso Guest Jovem: {{ .Token }}`  
   Ou:  
   `Use o código abaixo para entrar: {{ .Token }}. Ele expira em alguns minutos.`
4. Se o template usar `{{ .ConfirmationURL }}`, o Supabase envia magic link; se usar `{{ .Token }}`, envia o OTP. Para o fluxo do app (digitar código na tela), o template deve conter `{{ .Token }}`.

Assim, o usuário recebe o código por e-mail e o digita na tela para concluir o login. Se o e-mail ainda não estiver cadastrado, `shouldCreateUser: true` faz o Supabase criar o usuário no primeiro uso do código; o app cria o perfil em `users` via `ensureUserProfileForOAuth()` após `verifyOtp`.

---

## 5. Criação de conta (e-mail e senha)

### 5.1 Fluxo na tela

1. Usuário alterna para **Criar conta** e preenche **Nome**, **E-mail** e **Senha**.
2. Validações:
   - E-mail não vazio e formato válido.
   - Senha não vazia e com **mínimo 6 caracteres** (`MIN_PASSWORD_LENGTH = 6`).
   - Nome não vazio.
3. Chamada a `signUp(email, password, name)`.
4. Em sucesso:
   - Mensagem: "Conta criada! Verifique seu e-mail para confirmar o cadastro."
   - Após 4 segundos a tela volta para o modo "Entrar" e a mensagem some.
5. Em erro:
   - "User already registered" / "already registered" → "Este e-mail já está cadastrado. Use a opção Entrar."
   - Outros → mensagem da API.

### 5.2 Função no serviço

```ts
// services/supabase.ts
signUp(email, password, name) →
  1. supabase.auth.signUp({ email, password, options: { data: { name } } })
  2. Se data.user existe: insert em public.users com id, email, name, role: 'user', created_at
  3. Se o insert falhar com 23505 (duplicata), ignora e retorna data (evita erro se trigger já criou perfil)
```

Assim, todo usuário criado por e-mail/senha ganha um registro em `users` com `role: 'user'`.

---

## 6. Redefinição de senha

### 6.1 Fluxo na tela

1. Usuário informa o **e-mail** (no campo da tela de login) e toca em **Esqueci minha senha**.
2. Validação: e-mail não vazio e formato válido.
3. Chamada a `resetPassword(email)` (Supabase `resetPasswordForEmail`).
4. Em sucesso: "Enviamos um link para redefinir sua senha no e-mail informado. Verifique sua caixa de entrada."
5. O link enviado é do Supabase; ao clicar, o usuário redefine a senha na página do Supabase (ou na URL configurada no projeto).

### 6.2 Função no serviço

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
| `services/supabase.ts` | `signIn`, `signUp`, `resetPassword`, `getGoogleSignInUrl`, `setSessionFromOAuthUrl`, `ensureUserProfileForOAuth`, `getCurrentUser`; configuração do client e persistência de sessão. |
| `App.tsx` | Estado global de auth; `checkAuthStatus`; `onAuthStateChange`; tratamento de URL de callback OAuth (deep link e web, incluindo popup → postMessage). |

---

## 11. Regras de negócio resumidas

- **Senha mínima:** 6 caracteres (apenas no cadastro por e-mail).
- **Perfil em `users`:** criado no `signUp` (e-mail) ou no primeiro login com Google (`ensureUserProfileForOAuth`).
- **Role padrão:** sempre `'user'` ao criar perfil; admins são definidos manualmente (ou por outro processo) na tabela `users`.
- **Web PWA:** login Google em popup + postMessage para manter o retorno no atalho da tela inicial; pop-ups devem estar permitidos para o site.

Este documento descreve o comportamento atual do código; alterações em Supabase (políticas, triggers, confirmação de e-mail) podem acrescentar ou modificar passos (ex.: confirmação de e-mail obrigatória).
