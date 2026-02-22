# 📱 Youth Ministry App - Guia de Instalação e Configuração

Guia completo para configurar e executar o aplicativo Youth Ministry App (Expo SDK 54.0.23 + Supabase).

---

## 📦 Instalação de Dependências

### Pré-requisitos

- **Node.js**: v18.0.0 ou superior
- **npm**: v9.0.0 ou superior (ou **yarn**: v1.22.0+)
- **Expo CLI**: Instalado globalmente
- **Conta Supabase**: Gratuita (https://supabase.com)

### Instalação do Expo CLI (se não tiver)

```bash
npm install -g expo-cli
```

### Instalar Dependências do Projeto

No diretório raiz do projeto, execute:

```bash
npm install
```

Ou com Yarn:

```bash
yarn install
```

### Dependências Principais

O projeto utiliza as seguintes dependências:

**Framework & Core:**
- `expo@~54.0.23` - Expo SDK
- `react@19.1.0` - React
- `react-native@^0.81.0` - React Native
- `react-dom@19.1.0` - React DOM (para web)

**Navegação:**
- `@react-navigation/native@^7.1.19` - Navegação base
- `@react-navigation/native-stack@^7.6.2` - Stack Navigator
- `@react-navigation/bottom-tabs@^7.8.4` - Bottom Tabs
- `react-native-screens@~4.11.1` - Screens nativas
- `react-native-safe-area-context@^5.4.0` - Safe Area

**UI & Componentes:**
- `react-native-paper@^5.14.5` - Material Design
- `lucide-react-native@^0.553.0` - Ícones
- `expo-image@~3.0.10` - Otimização de imagens
- `react-native-svg@^15.11.2` - SVG support
- `expo-linear-gradient@~14.0.1` - Gradientes

**Backend & Storage:**
- `@supabase/supabase-js@^2.39.0` - Cliente Supabase
- `@react-native-async-storage/async-storage@^2.1.0` - Storage local

**Outros:**
- `expo-status-bar@~3.0.8` - Status bar
- `expo-constants@~18.0.10` - Constantes do Expo
- `expo-font@~10.2.0` - Fontes customizadas
- `expo-linking@~8.0.8` - Deep linking
- `expo-splash-screen@~31.0.10` - Splash screen
- `expo-image-picker@~16.0.6` - Seleção de imagens
- `react-native-gesture-handler@~2.24.0` - Gestos
- `react-native-url-polyfill@^2.0.0` - URL polyfill
- `react-native-web@^0.20.0` - Suporte web

---

## 🔧 Configuração do Supabase

### Passo 1: Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login ou crie uma conta gratuita
3. Clique em **"New Project"**
4. Preencha:
   - **Name**: `youth-ministry-app` (ou nome de sua escolha)
   - **Database Password**: Crie uma senha forte e **salve-a**
   - **Region**: Escolha a região mais próxima
   - **Pricing Plan**: Free (ou outro plano)
5. Clique em **"Create new project"**
6. Aguarde 1-2 minutos até o projeto ser provisionado

### Passo 2: Copiar Credenciais

1. No dashboard do projeto, vá em **Settings** (ícone de engrenagem)
2. Clique em **API** no menu lateral
3. Copie as seguintes informações:
   - **Project URL** (ex: `https://ytfysvzkcdwfuftwwwyp.supabase.co`)
   - **anon public** key (chave pública, começa com `eyJhbGciOi...`)

**⚠️ IMPORTANTE:** Nunca compartilhe a `service_role` key publicamente. Use apenas a `anon` key no frontend.

---

## 🗄️ Schema do Banco de Dados

### Passo 3: Executar SQL Schema

1. No dashboard do Supabase, vá em **SQL Editor** (ícone de banco de dados)
2. Clique em **"New query"**
3. Abra o arquivo `services/supabaseSchema.sql` do projeto
4. **Copie TODO o conteúdo do arquivo**
5. Cole no editor SQL do Supabase
6. Clique em **"Run"** (ou pressione `Ctrl+Enter`)
7. Aguarde a execução (pode levar 10-30 segundos)
8. Verifique se não há erros na aba **Results**

### Estrutura do Banco de Dados

O schema cria as seguintes tabelas:

- `users` - Usuários do sistema
- `youth_profiles` - Perfis de jovens
- `devotionals` - Devocionais diários
- `prayer_requests` - Pedidos de oração
- `community_posts` - Posts da comunidade
- `events` - Eventos e cultos
- `event_rsvps` - Confirmações de presença
- `attendance_records` - Registros de presença
- `achievements` - Conquistas dos jovens
- `notifications` - Notificações
- `announcements` - Avisos da comunidade
- `verse_of_week` - Versículo da semana

**Recursos habilitados:**
- Row Level Security (RLS) em todas as tabelas
- Políticas de acesso baseadas em roles (admin/user)
- Índices para otimização de queries
- Triggers para atualização automática de timestamps
- Funções RPC para operações customizadas

---

## 🔐 Variáveis de Ambiente

### Passo 4: Configurar .env

1. Na raiz do projeto, crie o arquivo `.env` (se não existir)
2. Adicione as seguintes variáveis:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. **Substitua** `SEU_PROJETO` e a chave `ANON_KEY` pelas credenciais copiadas no Passo 2

**Exemplo completo:**

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://ytfysvzkcdwfuftwwwyp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0ZnlzdnprY2R3ZnVmdHd3d3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzU5MTksImV4cCI6MjA4NTkxMTkxOX0.AmLe2WwLwJO74ORqNK5M6D9kWUN3PXwsaSbH-xnYQKg

# Instructions:
# 1. Supabase project URL and anon key are now configured
# 2. Run SQL schema from services/supabaseSchema.sql in Supabase SQL Editor
# 3. Restart Expo dev server: npx expo start --clear
# 4. Verify connection on web, iOS, and Android platforms

# Security Notes:
# - Never commit this file with real credentials to public repositories
# - Add .env to .gitignore
# - Use environment-specific .env files for production (.env.production)
```

**⚠️ SEGURANÇA:**
- Adicione `.env` ao `.gitignore` para não versionar credenciais
- Nunca compartilhe o arquivo `.env` publicamente
- Para produção, use variáveis de ambiente do servidor/CI/CD

---

## ✅ Verificação

### Passo 5: Testar a Configuração

1. **Reiniciar o servidor Expo** (limpar cache):

```bash
npx expo start --clear
```

2. **Abrir o app** em uma das plataformas:

- **Web**: Pressione `w` no terminal
- **iOS**: Pressione `i` (requer Xcode e simulador iOS)
- **Android**: Pressione `a` (requer Android Studio e emulador)
- **Dispositivo físico**: Escaneie o QR code com o app Expo Go

3. **Verificar conexão com Supabase**:

- Abra o console do navegador (F12) ou logs do terminal
- Procure por mensagens de erro relacionadas ao Supabase
- Se não houver erros, a conexão está OK

4. **Testar autenticação**:

- Tente criar uma conta no app
- Verifique se o usuário aparece na tabela `users` do Supabase
- Tente fazer login com as credenciais criadas

5. **Verificar tabelas no Supabase**:

- Vá em **Table Editor** no dashboard do Supabase
- Verifique se todas as tabelas foram criadas
- Insira dados de teste manualmente (opcional)

---

## 🐛 Troubleshooting

### Problema: "Supabase client not initialized"

**Causa:** Variáveis de ambiente não configuradas ou incorretas.

**Solução:**
1. Verifique se o arquivo `.env` existe na raiz do projeto
2. Confirme que as variáveis começam com `EXPO_PUBLIC_`
3. Reinicie o servidor Expo: `npx expo start --clear`
4. Verifique se as credenciais estão corretas no dashboard do Supabase

---

### Problema: "Invalid login credentials" ao fazer login

**Causa:** Usuário não existe ou senha incorreta.

**Solução:**
1. Crie uma nova conta no app
2. Verifique o email de confirmação (se habilitado no Supabase)
3. Confirme o email antes de fazer login
4. Ou desabilite confirmação de email:
   - Supabase Dashboard → **Authentication** → **Providers** → **Email**
   - Desmarque "Confirm email"

---

### Problema: Tela branca no app (web ou mobile)

**Causa:** Erro de inicialização ou componente quebrando.

**Solução:**
1. Abra o console do navegador (F12) ou logs do terminal
2. Procure por mensagens de erro em vermelho
3. Verifique se todas as dependências foram instaladas: `npm install`
4. Limpe o cache: `npx expo start --clear`
5. Verifique se o arquivo `.env` está configurado corretamente

---

### Problema: "expo-linear-gradient" não funciona no web

**Causa:** Biblioteca não é totalmente compatível com web.

**Solução:**
- O projeto já usa o componente `Gradient.tsx` que detecta a plataforma
- No web, usa CSS `linear-gradient`
- No mobile, usa `expo-linear-gradient`
- Sempre importe de `components/ui/Gradient.tsx`

---

### Problema: Erro de permissões no Supabase (RLS)

**Causa:** Row Level Security bloqueando acesso.

**Solução:**
1. Verifique se o SQL schema foi executado corretamente
2. Confirme que as políticas de RLS foram criadas
3. Verifique se o usuário está autenticado antes de acessar dados
4. Para debug, desabilite RLS temporariamente:
   - Supabase Dashboard → **Table Editor** → Selecione a tabela
   - Clique em **RLS disabled** (apenas para testes)

---

### Problema: "Cannot find module '@supabase/supabase-js'"

**Causa:** Dependência não instalada.

**Solução:**
```bash
npm install @supabase/supabase-js
```

Ou reinstale todas as dependências:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Problema: App não carrega no iOS/Android

**Causa:** Cache ou incompatibilidade de versão.

**Solução:**
1. Limpe o cache do Expo:
```bash
npx expo start --clear
```

2. Limpe o cache do Metro Bundler:
```bash
npx react-native start --reset-cache
```

3. Reinstale o app no dispositivo/emulador

4. Verifique a versão do Expo Go no dispositivo (deve ser compatível com SDK 54)

---

### Problema: Erro "Network request failed" ao conectar com Supabase

**Causa:** Problema de rede ou URL incorreta.

**Solução:**
1. Verifique se o URL do Supabase está correto no `.env`
2. Teste a conexão manualmente:
   - Abra `https://SEU_PROJETO.supabase.co` no navegador
   - Deve retornar uma resposta JSON
3. Verifique se há firewall ou proxy bloqueando a conexão
4. Teste em uma rede diferente (Wi-Fi, dados móveis)

---

### Problema: Dados não aparecem no app após criar no Supabase

**Causa:** Cache ou falta de atualização.

**Solução:**
1. Recarregue o app (shake no dispositivo → Reload)
2. Verifique se a query está correta em `services/supabase.ts`
3. Adicione logs para debug:
```typescript
const data = await getDevotionals();
console.log('Devotionals:', data);
```
4. Verifique se o RLS permite leitura pública da tabela

---

## 📚 Recursos Adicionais

- **Documentação Expo**: https://docs.expo.dev
- **Documentação Supabase**: https://supabase.com/docs
- **React Navigation**: https://reactnavigation.org/docs/getting-started
- **React Native Paper**: https://callstack.github.io/react-native-paper

---

## 🚀 Executando o Projeto

Após completar todos os passos acima:

```bash
# Iniciar servidor de desenvolvimento
npx expo start

# Ou com cache limpo
npx expo start --clear

# Abrir no navegador
npx expo start --web

# Abrir no iOS (macOS apenas)
npx expo start --ios

# Abrir no Android
npx expo start --android
```

---

## 📝 Notas Finais

- **Primeira execução**: Pode demorar alguns minutos para compilar
- **Hot Reload**: Alterações no código atualizam automaticamente
- **Logs**: Sempre verifique os logs do terminal e console do navegador
- **Suporte**: Para problemas não listados, consulte a documentação oficial do Expo e Supabase

---

**Desenvolvido com ❤️ usando Expo SDK 54.0.23 + Supabase**