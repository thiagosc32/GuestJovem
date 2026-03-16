# Checklist antes de publicar o Guest Jovem

Use este checklist para garantir que tudo está pronto para publicação.

---

## ✅ Já feito no projeto

- [x] **app.json** – Nome "Guest Jovem", versão 1.0.0, ícone e splash configurados
- [x] **iOS bundleIdentifier** – `com.thiagosc31.GuestJovem` (igual ao Android para consistência)
- [x] **Android package** – `com.thiagosc31.GuestJovem`
- [x] **eas.json** – Perfis `development`, `preview` e `production` com env via EAS Secrets
- [x] **.gitignore** – `.env` e arquivos sensíveis ignorados (nunca commitar chaves)
- [x] **.env.example** – Modelo das variáveis (sem valores reais)
- [x] **EAS projectId** – Projeto já vinculado no expo.dev
- [x] **Assets** – `assets/app-icon.png` existe e está referenciado

---

## 📱 Testar no celular (development build)

Se ao abrir o app no celular aparecer **"localhost está inacessível"**, é porque o aparelho não consegue acessar o servidor de desenvolvimento do seu PC. Use o **túnel**:

- No terminal: `npm run start:tunnel` (ou `npx expo start --tunnel`).
- O Expo vai gerar uma URL pública (ex.: `exp://xxx.ngrok.io`). Escaneie de novo o QR code ou abra o link no celular.
- Celular e PC não precisam estar na mesma rede; o túnel funciona de qualquer lugar.

**Alternativa (mesma rede Wi‑Fi):** rode `npx expo start` e, no terminal do Expo, pressione `s` para alternar a conexão para **LAN**. Use o IP que aparecer (ex.: `exp://192.168.x.x:8081`) no celular.

---

## 🔲 O que você precisa fazer

### 1. Variáveis de ambiente (produção)

- [ ] No [expo.dev](https://expo.dev) → seu projeto → **Environment variables** (ou **Secrets**), cadastre:
  - `EXPO_PUBLIC_SUPABASE_URL` = URL do seu projeto Supabase (ex.: `https://xxxx.supabase.co`)
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = anon key do Supabase (produção)
- [ ] Confirme que o `.env` local tem as mesmas variáveis para desenvolvimento (e que **não** está no Git).

**Se o app abrir com tela branca ou mensagem "Supabase não configurado" mesmo após gerar build no EAS depois de configurar as variáveis:**

1. **Confira o log do EAS Build**  
   Ao rodar `eas build --platform android --profile production`, nos **logs do build** no site do EAS procure por:  
   `[app.config.js] SUPABASE_ENV_IN_BUILD: url=... key=...`  
   - Se aparecer **url=no** ou **key=no**: as variáveis **não estão sendo injetadas** no servidor do EAS. Siga os passos abaixo.  
   - Se aparecer **url=yes key=yes**: o problema pode ser na forma como o app lê (avise no suporte).

2. **Nome exato das variáveis**  
   No expo.dev, os nomes têm de ser **exatamente** (copie e cole):  
   `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`  
   O `eas.json` usa `@EXPO_PUBLIC_SUPABASE_URL` — isso referencia a variável/secret com esse nome. Qualquer diferença (espaço, maiúscula/minúscula) faz o EAS não injetar.

3. **Onde cadastrar no expo.dev**  
   Se o projeto tiver **Secrets** e **Environment variables**, use **Secrets** para valores sensíveis (anon key). O `@` no `eas.json` costuma puxar de Secrets. Cadastre as duas:  
   - Nome: `EXPO_PUBLIC_SUPABASE_URL`, valor: `https://SEU_PROJETO.supabase.co`  
   - Nome: `EXPO_PUBLIC_SUPABASE_ANON_KEY`, valor: a anon key do Supabase  

4. **Ambiente (environment)**  
   Confira se as variáveis estão associadas ao ambiente **Production** (ou ao ambiente usado pelo perfil `production` do `eas.json`).

5. **Teste rápido (só para validar o fluxo)**  
   Para confirmar que o build está recebendo variáveis, você pode **uma vez** colocar a URL direto no `eas.json` no perfil `production` (só a URL, **nunca** a anon key no repositório):  
   `"EXPO_PUBLIC_SUPABASE_URL": "https://SEU_PROJETO.supabase.co"`  
   Gere um build e instale. Se o app conectar ao Supabase, o problema é a injeção das variáveis pelo dashboard (nome, Secrets vs Environment variables ou ambiente). Depois **remova** a URL do `eas.json` e use de novo só as variáveis do expo.dev.

### 2. EAS CLI e login

- [ ] Instalar: `npm install -g eas-cli`
- [ ] Login: `eas login` (conta Expo)

### 3. Builds

**Build Android no EAS:** o projeto usa **`.easignore`** com `/android`. Assim o EAS **não** envia a pasta `android/` e roda **prebuild na nuvem**, gerando um `android/` compatível com o autolinking (evita o erro "No variants exist"). O `app.json` já tem `package: "com.thiagosc31.GuestJovem"`, então o prebuild gera o pacote correto.

Se no futuro você precisar customizar código nativo Android, remova `/android` do `.easignore` e mantenha a pasta `android/` no repositório (aí o EAS usará a sua pasta em vez de rodar prebuild).

Se o build Android falhar com **"Unresolved reference 'R' ou 'BuildConfig'"**: confira se o `app.json` tem `android.package` igual ao namespace em `android/app/build.gradle`. Com `.easignore` ignorando `/android`, o prebuild gera tudo certo a partir do `app.json`.

Se falhar com **"No variants exist"** mesmo com `.easignore`:
- Rode `npx expo-doctor@latest` e corrija versões de pacotes sugeridas.
- Confirme que o `.easignore` contém `/android` para o EAS gerar o `android/` na nuvem.

**Logs Android (com.thiagosc31.GuestJovem):** O projeto já trata o aviso "context is not ready" em `MainActivity`: o repasse de `onNewIntent` é atrasado 300 ms para o React estar pronto. O manifest tem `android:enableOnBackInvokedCallback="true"` para o gesto de voltar (Android 13+). Se ainda aparecer "onWindowFocusChange while context is not ready", é SoftException (não derruba o app) e tende a ser corrigido em futuras versões do React Native/Expo.

- [ ] **Android (AAB para Play Store):**  
  `eas build --platform android --profile production`
- [ ] **iOS (IPA para App Store):**  
  `eas build --platform ios --profile production`  
  (na primeira vez o EAS pode pedir Apple ID e senha.)
- [ ] Baixar o AAB/IPA pelo link que o EAS enviar ao terminar o build.

**Erro ao instalar no Android: "signatures do not match" / INSTALL_FAILED_UPDATE_INCOMPATIBLE**  
O aparelho já tem o app instalado com outra assinatura (ex.: build local vs EAS). **Solução:** desinstale o app pelo Android (Configurações → Apps → Guest Jovem → Desinstalar) e instale de novo o AAB/APK novo.

### 4. Publicar na Google Play

- [ ] Conta no [Google Play Console](https://play.google.com/console) (taxa única ~US$ 25).
- [ ] Criar o app "Guest Jovem" e preencher políticas (privacidade, conteúdo, etc.).
- [ ] Em **Produção** ou **Teste interno**, criar nova versão e fazer upload do **AAB**.
- [ ] Enviar para revisão.

### 5. Publicar na App Store

- [ ] Conta no [Apple Developer Program](https://developer.apple.com/programs/) (anual ~US$ 99).
- [ ] Em [App Store Connect](https://appstoreconnect.apple.com), criar o app com o bundle ID `com.thiagosc31.GuestJovem`.
- [ ] Enviar o **IPA** (pelo app Transporter ou `eas submit --platform ios --profile production --latest`).
- [ ] No `eas.json`, em `submit.production.ios`, trocar:
  - `appleId` pelo seu e-mail Apple
  - `ascAppId` pelo ID do app no App Store Connect
  - `appleTeamId` pelo ID do seu time
- [ ] Enviar a versão para revisão na App Store Connect.

### 6. Web (opcional)

- [ ] Build: `npx expo export --platform web`
- [ ] Hospedar a pasta `dist/` na Vercel, Netlify ou outro.
- [ ] Se usar check-in de visitantes, configure `EXPO_PUBLIC_WEB_URL` com a URL final do site.

**Login e criação de conta na web (guestjovem.com + Google)**

Para o “Entrar com Google” e “Criar conta” funcionarem na web:

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**:
   - **Site URL:** `https://guestjovem.com` (ou a URL onde o app web está hospedado).
   - **Redirect URLs:** adicione exatamente:
     - `https://guestjovem.com/`
     - `https://guestjovem.com/**`
     - Se usar outro domínio (ex.: Vercel), adicione também `https://seu-dominio.vercel.app/` e `https://seu-dominio.vercel.app/**`.
   - Em desenvolvimento local, adicione `http://localhost:8081/` e `http://localhost:8081/**` (ou a porta que o Expo usar).

2. **Mensagem “Prosseguir para … supabase.co”**  
   Ao clicar em “Entrar com Google”, o navegador pode mostrar algo como “Prosseguir para ytfysvzkcdwfuftwwwyp.supabase.co”. Isso é **normal**: o login é feito nos servidores do Supabase (parceiro de autenticação). O usuário só é redirecionado para o seu domínio depois do login.  
   Para no futuro mostrar um domínio próprio (ex.: “Prosseguir para auth.guestjovem.com”), é possível usar **Custom Auth Domain** do Supabase (recurso de planos pagos) ou self-hosted Auth; não é obrigatório para o fluxo funcionar.

### 7. Conferências finais

- [ ] Testar o app em dispositivo real (Android e/ou iOS) antes de enviar às lojas.
- [ ] Política de privacidade e termos (se as lojas exigirem) – ter URL pronta.
- [ ] Para cada nova versão nas lojas, aumentar `version` no `app.json` (ex.: 1.0.1).

---

## Comandos úteis

| Ação | Comando |
|------|--------|
| Login EAS | `eas login` |
| Build Android | `eas build -p android --profile production` |
| Build iOS | `eas build -p ios --profile production` |
| Build ambos | `eas build -p all --profile production` |
| Enviar Android | `eas submit -p android --profile production --latest` |
| Enviar iOS | `eas submit -p ios --profile production --latest` |
| Build web | `npx expo export --platform web` |

---

## Documentação completa

Passo a passo detalhado em ** [PUBLICAR_APP.md](./PUBLICAR_APP.md) **.
