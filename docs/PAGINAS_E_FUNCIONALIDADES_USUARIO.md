# Páginas e Funcionalidades do Usuário — FireYouth

Documento de referência de todas as telas e funcionalidades disponíveis para o usuário no app FireYouth.

---

## 1. Navegação geral

- **Menu inferior (4 itens):** Início, Devocional, Eventos, Perfil
- **Menu lateral (drawer):** Hambúrguer com Jornada, Disciplinas, Bíblia, Comunidade, etc.
- **Onboarding:** Modal exibido na primeira vez após o login com a declaração sobre os níveis

---

## 2. Autenticação

### AuthScreen
- Login
- Registro
- Redefinição de senha

---

## 3. Telas principais (menu inferior)

### UserDashboard (Início)
- Saudação (Bom dia/Boa tarde/Boa noite)
- Barra de constância
- Versículo da semana
- Resumo da jornada espiritual (etapa e progresso)
- Devocionais semanais (próximos)
- Eventos em destaque
- Avisos
- Ações rápidas: Pedidos de oração, Notificações
- Cards de atalho para Devocional e Eventos

### DevotionalScreen (Devocional)
- Lista de devocionais semanais
- Leitura de devocional selecionado (passagem bíblica, reflexão, pontos de oração)

### EventsScreen (Eventos)
- Lista de eventos da igreja
- Inscrição em eventos e check-in via QR Code — **todos os níveis participam plenamente**

### ProfileScreen (Perfil)
- Foto e dados do usuário
- Editar perfil (nome, foto, igreja, chamado, voluntariado)
- Meu QR Code (presença em eventos)
- Card de crescimento espiritual (etapa e progresso)
- Link para Termos de uso espiritual
- Botão Painel de Admin (se for admin)
- Sair da conta

---

## 4. Menu lateral (drawer)

### JourneyScreen (Jornada Espiritual)
- Card da etapa atual (Ouvir, Seguir, Permanecer, Frutificar, Multiplicar)
- Disclaimer sobre níveis
- Funcionalidades sugeridas para a etapa
- Práticas que contam na jornada (devocional, oração, eventos, reflexões, disciplinas)
- Link para Reflexões espirituais

### DisciplinesScreen (Disciplinas Espirituais)
- Lista de disciplinas diárias, semanais e mensais
- Marcar conclusão de cada disciplina
- XP por disciplina concluída

### BibleScreen (Bíblia)
- **Ler a Bíblia:** Navegação por livros e capítulos (66 livros)
- **Versão:** Escolher entre Almeida, NVI, ACF, RA
- **Planos de leitura:** Planos predefinidos e personalizados
- **Planos predefinidos:** Provérbios 31 dias, João 21 dias, Salmos 30 dias, NT 90 dias
- **Criar meu plano:** Plano personalizado (nome, descrição, dias de leitura)
- **Progresso:** Marcar leituras como concluídas, continuar de onde parou

### VerseOfTheDayScreen (Versículo do dia)
- Versículo aleatório do dia
- Lista de versículos de referência

### BadgesScreen (Conquistas) — nível Caule+
- Badges/emblemas desbloqueados
- Progresso de conquistas

### CommunityWall (Comunidade)
- Feed de posts da comunidade
- Ver posts (todos)
- Curtir e comentar (nível Seguir+)
- Criar posts (nível Frutificar+)

### PrayerRequestScreen (Pedidos de oração)
- Lista de pedidos de oração públicos
- Criar pedido de oração (todos)
- Orar por e comentar (todos)
- Marcar respondido (nível Frutificar+)

### BadgesScreen (Conquistas) — nível Caule+

### GuidedStudiesScreen (Estudos em grupo) — nível Caule+
- Iniciar novo estudo sobre temas ou livros bíblicos
- Lista de estudos criados pela comunidade
- Detalhe do estudo com descrição
- Comentários e interação em cada estudo

---

## 5. Telas secundárias (acessíveis por navegação)

### SpiritualReflectionsScreen (Reflexões Espirituais)
- Registrar reflexões espirituais
- Ver histórico de reflexões

### EventDetails
- Detalhes do evento
- Inscrição
- Link para pagamento (EventPaymentScreen)

### EventPaymentScreen
- Pagamento do evento

### RegistrationScreen
- Inscrição em evento (formulário)

### SpiritualTermsScreen (Termos de uso espiritual)
- Declaração sobre os níveis (não medem fé)
- Acessível pelo link no Perfil

### NotificationScreen
- Lista de notificações
- Marcar como lida
- Deep links para Pedidos de oração, Devocional, Jornada

---

## 6. Níveis e liberação progressiva

Os níveis (Ouvir → Seguir → Permanecer → Frutificar → Multiplicar) **não medem fé**. Medem uso e maturidade dentro do app, não acesso à comunhão presencial. **Eventos são para todos os níveis.**

| Nível | Nome     | Identidade   | Papel     | Funcionalidades liberadas                                                                 |
|-------|----------|--------------|-----------|--------------------------------------------------------------------------------------------|
| 1     | Ouvir      | Observador   | Recebe    | Devocional, Bíblia, versículo do dia, jornada, disciplinas, eventos (ver/inscrever/check-in), oração (ver, criar, orar por, comentar), comunidade (ver posts) |
| 2     | Seguir     | Participante | Interage  | Tudo do Ouvir + curtir e comentar na comunidade         |
| 3     | Permanecer | Discípulo    | Cresce    | Tudo do Seguir + estudos em grupo, conquistas, badges no perfil                             |
| 4     | Frutificar | Servo        | Serve     | Tudo do Permanecer + criar posts, responder pedidos de oração, mentoria, missões semanais      |
| 5     | Multiplicar| Líder        | Multiplica| Tudo do Frutificar + criar missões, criar estudos, destaque visual, reação especial            |

---

## 7. Funcionalidades por tela (detalhado)

### Bíblia
- Leitura completa (66 livros)
- Seleção de versão (Almeida, NVI, ACF, RA)
- Planos de leitura predefinidos
- Criar plano personalizado
- Marcar leituras como concluídas
- Botão "Continuar do dia X" para retomar

### Comunidade
- Ver posts moderados (todos)
- Curtir e comentar (nível 2+)
- Criar posts (nível 4+)

### Pedidos de oração
- Ver, criar e orar por pedidos (todos)
- Comentar em pedidos (todos)
- Marcar respondido com testemunho (nível 4+)

### Eventos
- Ver, inscrever e check-in — **todos os níveis participam plenamente**

### Disciplinas
- Marcar disciplinas diárias/semanais/mensais
- Ganhar passos (XP) por conclusão

### Jornada
- Ver etapa atual e progresso
- Práticas que somam passos
- Sugestões de funcionalidades por etapa

### Perfil
- QR Code pessoal para check-in em eventos
- Editar dados (igreja, chamado, voluntariado)
- Acesso a Termos espirituais

---

## 8. Área Admin (usuários admin)

Telas exclusivas para role `admin`:

- **AdminDashboard:** Início, eventos, devocionais, presença, notificações
- **AttendanceTracker:** Rastreamento de presença
- **AnalyticsScreen:** Relatórios e análises
- **NotificationScreen:** Enviar notificações
- **QRCodeScanner:** Escanear QR para check-in
- **CreateDevotionalScreen:** Criar devocional
- **CreateEventScreen:** Criar/editar evento
- **UserManagementScreen:** Gestão de usuários
- **EventPresenceScreen:** Presença em eventos
- **AdminPrivatePrayersScreen:** Pedidos de oração privados
- **AppSettingsScreen:** Configurações do app

---

## 9. Resumo de telas do usuário

| Tela                  | Acesso                 | Nível mínimo |
|-----------------------|------------------------|--------------|
| Início                | Tab inferior           | 1            |
| Devocional            | Tab inferior           | 1            |
| Eventos               | Tab inferior           | 1            |
| Perfil                | Tab inferior           | 1            |
| Jornada Espiritual    | Drawer                 | 1            |
| Disciplinas           | Drawer                 | 1            |
| Bíblia                | Drawer                 | 1            |
| Versículo do dia      | Drawer                 | 1            |
| Conquistas            | Drawer                 | 3            |
| Comunidade            | Drawer                 | 1            |
| Pedidos de oração     | Drawer                 | 1            |
| Estudos guiados       | Drawer                 | 3            |
| Reflexões espirituais | Jornada / Drawer       | 1            |
| Detalhes do evento    | Eventos                | 1            |
| Pagamento             | Inscrição em evento    | 1            |
| Inscrição em evento   | Eventos                | 1            |
| Termos espirituais    | Perfil                 | 1            |
| Notificações          | Ícone / Admin          | 1            |
