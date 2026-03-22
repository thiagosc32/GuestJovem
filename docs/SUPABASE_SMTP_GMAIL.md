# SMTP Gmail + Supabase Auth — Guest Jovem

O **envio de e-mails** (códigos OTP, reset de senha, confirmações) é feito **pelo Supabase**, usando o SMTP que você configurou no Dashboard. **Não coloque senha de app nem credenciais SMTP no código do app** — só no projeto Supabase.

---

## 1. Conta Gmail (senha de app)

1. Acesse [Conta Google](https://myaccount.google.com/) → **Segurança**.
2. Ative a **Verificação em duas etapas** (se ainda não estiver).
3. Em **Senhas de app**, crie uma senha (ex.: nome `Supabase App`).
4. Copie os **16 caracteres** — use **somente** no campo **Password** do SMTP no Supabase, **não** a senha normal do Gmail.

---

## 2. Supabase — Custom SMTP

1. **Project Settings** (engrenagem) → **Auth**.
2. Em **SMTP Settings**, ative **Enable Custom SMTP**.
3. Exemplo (Gmail):

| Campo | Valor |
|--------|--------|
| Sender email | `guestjovemapp@gmail.com` (ou o que você usar) |
| Sender name | Ex.: `Equipe Guest Jovem` |
| Host | `smtp.gmail.com` |
| Port | `587` |
| User name | Mesmo e-mail do remetente |
| Password | **Senha de app** (16 caracteres) |

4. Salve.

---

## 3. URLs de redirecionamento (obrigatório para links nos e-mails)

Quando o e-mail contém um **link** (reset de senha, magic link, etc.), o Supabase só redireciona para URLs **allowlist**.

1. **Authentication** → **URL Configuration**.
2. **Site URL**: URL principal do app (ex.: `https://seu-dominio.vercel.app` ou `https://guestjovem.com`).
3. **Redirect URLs**: inclua **todas** as URLs que o app pode usar ao abrir o link do e-mail, por exemplo:

   - `https://seu-dominio.com/**`
   - `https://*.vercel.app/**` (se usar preview Vercel)
   - `guestjovem://**` (deep link do app — scheme em `app.json` / `app.config.js`)
   - URLs de desenvolvimento Expo (`exp://...`) se testar no Expo Go

No código, `getAuthEmailRedirectUrl()` em `services/supabase.ts` define o `redirectTo` / `emailRedirectTo` usado em:

- `resetPasswordForEmail` (esqueci a senha)
- `signInWithOtp` (cadastro com código por e-mail)

Se definir **`EXPO_PUBLIC_WEB_URL`** no `.env` ou nos **Environment variables** do EAS (ex.: `https://guestjovem.com`), essa URL tem prioridade para links em **builds nativos** (iOS/Android). Na **web**, usa-se `window.location.origin` se não houver essa variável.

---

## 4. Templates de e-mail (Auth)

Em **Authentication** → **Email Templates**:

| Template | Uso no app |
|----------|------------|
| **Confirm signup** | Cadastro na aba **Cadastrar** usa `signUp` com `emailRedirectTo`. Personalize o texto do e-mail; o link de confirmação vem do Supabase. |
| **Magic Link** | Opcional para outros fluxos; o cadastro principal **não** usa código de 6 dígitos no app. |
| **Reset Password** | “Esqueci a senha” — `resetPassword` envia `redirectTo`. |

**SMTP customizado** passa a enviar **todos** esses e-mails com o remetente Gmail configurado.

---

## 5. Código (já integrado)

- **`getAuthEmailRedirectUrl()`** — exportada em `services/supabase.ts` para consistência dos links.
- **`resetPassword`** — `resetPasswordForEmail(email, { redirectTo })`.
- **`signUp`** — `signUp({ email, password, options: { data: { name }, emailRedirectTo } })` (confirmação por e-mail).

O app **não** contém credenciais SMTP.

---

## 6. iOS / Android — deep link após clicar no e-mail

1. O scheme **`guestjovem`** está no Expo (`app.config.js`).
2. No Supabase, inclua **Redirect URLs** com `guestjovem://**` (ou o path exato que o `Linking.createURL` gerar).
3. No **App.tsx**, o fluxo OAuth já trata URLs; links de **recovery** do Supabase costumam abrir com `access_token` no hash — o cliente Supabase com `detectSessionInUrl` na web trata isso; na nativa, confira se o [deep linking do Expo](https://docs.expo.dev/guides/linking/) está alinhado ao `redirectTo` permitido.

Se o link abrir no **Safari** em vez do app instalado, revise **Associated Domains** e o scheme no Xcode / AndroidManifest — isso é configuração nativa além do JS.

---

## 7. Variável de ambiente recomendada

```env
EXPO_PUBLIC_WEB_URL=https://seu-dominio.com
```

Inclua no `.env` local e no **EAS** (Environment variables) para builds de produção, para que os links dos e-mails apontem para o domínio correto.
