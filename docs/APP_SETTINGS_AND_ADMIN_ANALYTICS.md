# App Settings e Analytics Admin

## Tabela `app_settings`

Se ainda não existir no seu projeto Supabase, crie a tabela para configurações (ex.: número do WhatsApp, imagens):

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

- **key**: identificador (ex: `whatsapp_youth_count`, `events_hero_image`, `verse_of_the_day`, `verse_of_the_week`)
- **value**: valor em texto (números são armazenados como string; versículos são JSON `{"ref":"João 15:5","text":"..."}`)

### Versículo do dia

O admin pode alterar o versículo exibido na tela "Versículo do dia" em **Personalizar App**. A chave é `verse_of_the_day` e o valor é um JSON com `ref` e `text`. Se não houver valor salvo, o app usa uma lista padrão rotativa.

### Versículo da semana

Na mesma tela **Personalizar App**, o admin pode definir o **versículo da semana**. A chave é `verse_of_the_week` e o valor é um JSON com `ref` e `text`. Pode ser usado em telas do app que exibam um versículo semanal (ex.: home, devocionais).

No painel admin, a seção **App vs Grupo WhatsApp** usa a chave `whatsapp_youth_count` para comparar jovens no app com o total do grupo no WhatsApp.

## Coleta de dados para Analytics

Os dados do **Admin Dashboard** e **Análises & Insights** vêm do Supabase:

| Métrica | Fonte |
|--------|--------|
| Total de jovens | `users` (role ≠ admin) |
| Jovens ativos | Usuários com `last_active` nos últimos 30 dias ou com registro em `attendance_records` / `spiritual_xp_events` nos últimos 30 dias |
| Presença média | Total de `attendance_records` ÷ número de eventos com presença |
| Pedidos de oração | Contagem em `prayer_requests` |
| Conclusão de devocionais | Jovens com XP de tipo `devotional` na semana ÷ total de jovens |
| Crescimento semanal | Comparação de presenças esta semana vs semana anterior |
| Tendências mensais | Contagens por mês: `attendance_records`, devocionais (XP), `prayer_requests` |

Para **jovens ativos** refletirem login, atualize `last_active` no login (ex.: em `getCurrentUser` ou no callback de auth).

## Controle de presença

- **Dados reais**: lista de `attendance_records` com usuário e evento.
- **Filtros**: por data (Hoje / Todos), por método (Todos / QR / Manual), busca por nome.
- **Registro manual**: botão "Registrar presença" abre modal para escolher evento (opcional) e jovem; grava em `attendance_records` com `method: 'manual'`.

Eventos de presença (check-in) também podem ser registrados via **QR Code** na tela de scanner, gravando na mesma tabela.
