# Configuração do login com Google (Guest Jovem)

## 1. Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard) e abra seu projeto.
2. Vá em **Authentication** → **Providers** → **Google**.
3. Ative o provedor **Google**.
4. Preencha:
   - **Client ID (for OAuth):**  
    
   - **Client Secret (for OAuth):**  
     
5. Salve.

Em **Authentication** → **URL Configuration**:

- **Site URL:** a URL do seu app (ex.: `https://seudominio.com` para web ou o scheme do app).
- **Redirect URLs:** adicione **todas** as URLs que o app pode usar:
  - `guestjovem://google-auth` (para build de produção ou dev client com scheme)
  - **No celular com Expo Go:** ao tocar em "Entrar com Google", o app usa uma URL do tipo `exp://192.168.x.x:8081/--/google-auth`. No terminal (Metro) ou no console do app aparece a mensagem com a URL exata — **copie essa URL e adicione em Redirect URLs** no Supabase. Assim o Safari consegue voltar para o app após o login.

Salve as alterações.

---

## 2. Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/) e selecione o projeto que contém o OAuth 2.0 Client ID usado acima.
2. Vá em **APIs & Services** → **Credentials** e edite o OAuth 2.0 Client ID (tipo “Web application” ou “Android”/“iOS” conforme o caso).
3. Em **Authorized redirect URIs** adicione **exatamente** esta URL (callback do Supabase deste projeto):
   ```
   https://ytfysvzkcdwfuftwwwyp.supabase.co/auth/v1/callback
   ```
   - Não altere nada: nem `http` em vez de `https`, nem barra no final.
   - Se o seu projeto Supabase for outro, use a URL que aparece em **Authentication** → **Providers** → **Google** no Supabase.
4. Clique em **Save** e aguarde alguns minutos para propagar.

Para app **Android**: em **Credentials** crie (ou use) um cliente OAuth do tipo **Android** e preencha o package name e SHA-1 do seu app.

Para app **iOS**: adicione o **iOS URL scheme** (ex.: `guestjovem`) no Xcode / Info.plist e, no Google Cloud, use o cliente OAuth do tipo **iOS** com o bundle ID correto.

---

## 3. Resumo no app

- **Scheme do app:** `guestjovem` (deep link `guestjovem://google-auth`).
- O botão **“Entrar com Google”** na tela de login abre o fluxo OAuth; ao finalizar, o app recebe o redirect, define a sessão e cria o perfil em `public.users` se for primeiro acesso.

**Segurança:** o Client Secret não deve ficar no código do app; use-o apenas no Supabase Dashboard (Authentication → Providers → Google).
