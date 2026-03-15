# Passo a passo para publicar o app Guest Jovem

Este guia cobre a publicação do app **Guest Jovem** (Expo/React Native) nas lojas e na web.

---

## 1. Pré-requisitos

- Conta no [Expo](https://expo.dev) (gratuita)
- **Android:** conta no [Google Play Console](https://play.google.com/console) (taxa única ~US$ 25)
- **iOS:** conta no [Apple Developer Program](https://developer.apple.com/programs/) (anual ~US$ 99)
- **Web:** um provedor de hospedagem (Vercel, Netlify, etc.) ou servidor próprio
- Node.js e npm/yarn instalados
- EAS CLI instalado globalmente: `npm install -g eas-cli`

---

## 2. Configurar o projeto para produção

### 2.1 Variáveis de ambiente

- Crie um arquivo `.env` (ou use EAS Secrets) com as variáveis de produção:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Não** commite `.env` no Git. Use `.env.example` só com nomes das variáveis (sem valores).

### 2.2 Versão e identificadores

No `app.json` (ou `app.config.js`), confira:

- **version:** ex.: `"1.0.0"` — a cada nova publicação nas lojas, aumente (ex.: 1.0.1, 1.1.0).
- **ios:** se for publicar na App Store, defina `bundleIdentifier` (ex.: `com.suaempresa.guestjovem`).
- **android:** `package` já está como `com.thiagosc31.GuestJovem` — use o mesmo no Google Play.

### 2.3 Ícone e splash

- Ícone: `./assets/app-icon.png` (recomendado 1024x1024 px).
- Splash: já configurado no `app.json`; mantenha o mesmo arquivo ou ajuste o caminho se mudar.

---

## 3. Configurar o EAS (Expo Application Services)

### 3.1 Login no EAS

```bash
eas login
```

Use a mesma conta do expo.dev.

### 3.2 Criar o arquivo `eas.json`

Na raiz do projeto, crie `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "@EXPO_PUBLIC_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "@EXPO_PUBLIC_SUPABASE_ANON_KEY"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "@EXPO_PUBLIC_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "@EXPO_PUBLIC_SUPABASE_ANON_KEY"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "seu-email@apple.com",
        "ascAppId": "ID_DA_APP_NO_APP_STORE_CONNECT",
        "appleTeamId": "TEAM_ID"
      }
    }
  }
}
```

- **development:** build com dev client (testes internos).
- **preview:** APK/IPA para testes (internal).
- **production:** AAB (Android) e IPA (iOS) para lojas.
- Ajuste `submit.production` quando for usar `eas submit` (veja seção 6).

### 3.3 Definir secrets no EAS (variáveis sensíveis)

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://seu-projeto.supabase.co" --type string
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "sua-anon-key" --type string
```

Assim o build na nuvem usa essas variáveis sem você colocá-las no código.

---

## 4. Gerar builds (binários do app)

### 4.1 Android (Google Play)

- Build de **produção** (recomendado para publicar):

```bash
eas build --platform android --profile production
```

- O EAS gera um **AAB** (Android App Bundle). Ao terminar, você recebe um link para baixar.
- Opcional: para testar em dispositivo sem Play Store, use o perfil **preview** (gera APK):

```bash
eas build --platform android --profile preview
```

### 4.2 iOS (App Store)

- Build de **produção**:

```bash
eas build --platform ios --profile production
```

- Na primeira vez, o EAS pode pedir credenciais Apple (Apple ID, senha, team). Siga o assistente.
- O resultado é um **IPA** para enviar à App Store Connect.

### 4.3 Build para as duas plataformas

```bash
eas build --platform all --profile production
```

---

## 5. Publicar na Google Play (Android)

### 5.1 Primeira vez: criar o app no Play Console

1. Acesse [Google Play Console](https://play.google.com/console).
2. Crie um novo app (nome “Guest Jovem”, idioma padrão, etc.).
3. Preencha a política e as páginas obrigatórias (conteúdo, privacidade, público-alvo, etc.).

### 5.2 Enviar o AAB

**Opção A – Envio manual**

1. Baixe o AAB do link que o EAS enviou após o build.
2. No Play Console: **Produção** (ou **Teste interno**) → **Criar nova versão**.
3. Faça upload do arquivo `.aab`.
4. Preencha “O que há de novo” e salve.
5. Envie para revisão.

**Opção B – Envio com EAS Submit**

1. Crie uma **Service Account** no Google Cloud vinculada ao Play Console, com permissão para enviar apps.
2. Baixe o JSON da chave e salve como `google-service-account.json` na raiz (não commite no Git).
3. No `eas.json`, em `submit.production.android`, coloque o caminho correto.
4. Rode:

```bash
eas submit --platform android --profile production --latest
```

(O `--latest` usa o último build Android do EAS.)

### 5.3 Revisão

- A Google pode levar de algumas horas a alguns dias para aprovar.
- Depois da aprovação, o app fica disponível (ou em “publicação gradual”, conforme sua escolha).

---

## 6. Publicar na App Store (iOS)

### 6.1 Primeira vez: App Store Connect

1. Acesse [App Store Connect](https://appstoreconnect.apple.com).
2. **Apps** → **+** → **Novo app** (plataforma iOS).
3. Preencha nome (“Guest Jovem”), idioma, bundle ID (o mesmo do `app.json`), SKU.
4. Preencha as abas obrigatórias: preço, privacidade, informações do app, etc.

### 6.2 Enviar o IPA

**Opção A – Envio manual (Transporter)**

1. Instale o app [Transporter](https://apps.apple.com/app/transporter/id1450874784) (Mac).
2. Baixe o IPA do link do EAS.
3. Abra o Transporter, faça login com o Apple ID do desenvolvedor e envie o IPA.

**Opção B – EAS Submit**

1. No `eas.json`, em `submit.production.ios`, preencha:
   - `appleId`: e-mail da conta Apple Developer.
   - `ascAppId`: ID do app no App Store Connect (número na URL do app).
   - `appleTeamId`: ID do time (Apple Developer → Membership).
2. Rode:

```bash
eas submit --platform ios --profile production --latest
```

### 6.3 Revisão

- Na App Store Connect, escolha a versão enviada, preencha “O que há de novo” e envie para revisão.
- A Apple costuma levar de 24h a alguns dias para analisar.

---

## 7. Publicar na Web (PWA/ site)

### 7.1 Gerar o build web

```bash
npx expo export --platform web
```

(ou use o script do projeto: `npm run build:web` se existir.)

- A saída fica em `dist/` (ou o diretório configurado no projeto).

### 7.2 Hospedar

- **Vercel:** arraste a pasta `dist` no [Vercel](https://vercel.com) ou conecte o repositório e defina o comando de build e a pasta de output.
- **Netlify:** conecte o repo, build command: `npx expo export --platform web`, publish directory: `dist`.
- **Outro servidor:** faça upload do conteúdo de `dist/` para um servidor web (HTTPS recomendado).

### 7.3 Variáveis no build web

- Configure no painel da Vercel/Netlify (ou no servidor) as variáveis:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Rebuild após alterar variáveis.

---

## 8. Checklist antes de publicar

- [ ] Variáveis de produção (Supabase) configuradas e testadas.
- [ ] Versão no `app.json` atualizada (e no `package.json` se quiser manter igual).
- [ ] Ícone e splash corretos e em boa resolução.
- [ ] Testado em dispositivo real (Android e/ou iOS).
- [ ] Política de privacidade e termos (URLs) preparados para as lojas e para a web.
- [ ] Contas de desenvolvedor (Google e Apple) ativas e em dia.

---

## 9. Resumo dos comandos

| Ação | Comando |
|------|---------|
| Login EAS | `eas login` |
| Build Android (produção) | `eas build -p android --profile production` |
| Build iOS (produção) | `eas build -p ios --profile production` |
| Build ambos | `eas build -p all --profile production` |
| Enviar Android (EAS) | `eas submit -p android --profile production --latest` |
| Enviar iOS (EAS) | `eas submit -p ios --profile production --latest` |
| Build web | `npx expo export --platform web` |

---

## 10. Atualizações futuras (OTA – Expo Updates)

Para enviar correções/novos textos sem nova build nas lojas:

1. Configure o [Expo Updates](https://docs.expo.dev/versions/latest/sdk/updates/) no projeto.
2. Publique uma atualização:

```bash
eas update --branch production --message "Correção de textos"
```

- Usuários com o app já instalado (que suporta Updates) receberão a alteração na próxima abertura.
- Para mudanças nativas (novas permissões, libs nativas, etc.), é necessário novo build e nova submissão nas lojas.

---

Se algo falhar em um passo (build, submit ou loja), use a mensagem de erro e a [documentação do EAS](https://docs.expo.dev/eas/) e do [Expo](https://docs.expo.dev/) para ajustar. O projeto já tem `projectId` do EAS no `app.json`, então o vínculo com o expo.dev já está pronto.
