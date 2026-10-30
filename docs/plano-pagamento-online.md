# Plano: uma conta com vários eventos e pagamento online (Mercado Pago)

Próxima etapa do Presenzo depois das fases 4–8 (planos, limites e orçamento).
Hoje a venda fecha pelo WhatsApp: a pessoa simula na home, manda a mensagem pronta, você confirma o valor, recebe o Pix e cria o evento no super. A ideia é que a pessoa consiga **contratar e pagar sozinha**, a qualquer hora, sem passar pelo seu número.

São duas partes, nesta ordem:

1. **Uma conta, vários eventos** (fase 9). Hoje cada e-mail só pode ser admin de um evento. Quem faz um aniversário e depois uma formatura teria que ter duas contas. Isso vem antes do pagamento porque muda o que acontece quando um cliente que já tem conta compra de novo.
2. **Pagamento online** (fases 10–13). O pagamento é automático e a criação do evento continua com você: o pedido pago fica **"em preparação"** até o super criar o evento. Depois, quando o fluxo estiver redondo, o próprio webhook passa a criar o evento.

---

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Gateway | **Mercado Pago, Checkout Pro**: a página de pagamento é do Mercado Pago (Pix, cartão, parcelado). Dado de cartão nunca passa pela API. A conta já existe e já é verificada. |
| Formas de pagamento | **Pix e cartão, sem boleto** (`excluded_payment_types: ticket`). |
| Parcelamento | **Até 4x** no cartão (`payment_methods.installments = 4` na preferência). |
| Prazo do pedido | **24 horas** pendente. Depois expira e a pessoa faz outro, com a tabela atual. |
| Contas | **Uma conta, vários eventos.** O mesmo e-mail pode ser admin de quantos eventos precisar e troca de evento dentro do painel. Pedido com e-mail que já tem conta é aceito normalmente. |
| Data do evento | **Opcional**, com "ainda não sei". |
| Cadastro | **Sem conta antes do pagamento.** O pedido guarda nome, e-mail e WhatsApp. Quando o evento é criado, quem não tem conta recebe o "crie sua senha" que já existe, e quem já tem recebe "seu evento novo está no painel". |
| Criação do evento | **Manual no começo**: pedido pago aparece em "Pedidos" no super, e o botão "Criar evento" abre o formulário já preenchido. Automática numa fase depois. |
| Preço | Calculado **no servidor** com o `compute_quote` que já existe e **travado no pedido**: mudar a tabela depois não muda pedido já feito. |
| WhatsApp | Continua como **opção secundária** ("Prefere conversar antes?") na home e na tela de contratar. |

### Por que sem conta antes do pagamento
Mesmo com vários eventos por conta, uma conta sempre nasce **junto com um evento**: um painel sem nenhum evento não teria o que mostrar. Com o pedido no meio, o "cadastro" é o próprio pedido (nome + e-mail), e o acesso nasce junto com o evento pelo fluxo que já funciona:

`handle_create_event` → `create_event_admin` → `issue_and_send_password_token(..., 'invite')` → e-mail "crie sua senha".

Se o e-mail já tem conta, o evento novo só entra na lista de eventos dela (fase 9).

---

## Uma conta, vários eventos (fase 9)

### Como é hoje
- `admin_users.event_id` liga cada conta a **um** evento, e `uq_admin_users_email` impede o mesmo e-mail em duas linhas.
- `event_id IS NULL` é o que marca o super.
- `require_admin` devolve o `event_id` da conta, e as **22 rotas** do painel do evento (convidados, presentes, configurações) usam `$admin['event_id']`.

### A ideia: o evento ativo fica na sessão
- A conta (e-mail + senha) continua **única por e-mail**. Quem muda é a ligação com os eventos: vira uma tabela `event_admins` (conta × evento).
- A sessão guarda o **evento ativo** (`admin_sessions.event_id`). `require_admin` passa a devolver o evento da sessão em `$admin['event_id']`, então **as 22 rotas do painel não mudam**.
- Trocar de evento é trocar o evento ativo da sessão, sem novo login.

### Migração 021: contas e eventos
```sql
CREATE TABLE IF NOT EXISTS event_admins (
  event_id      INT UNSIGNED NOT NULL,
  admin_user_id INT UNSIGNED NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, admin_user_id),
  KEY idx_event_admins_user (admin_user_id),
  CONSTRAINT fk_event_admins_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_admins_user FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

ALTER TABLE admin_users ADD COLUMN is_super TINYINT(1) NOT NULL DEFAULT 0 AFTER event_id;
ALTER TABLE admin_sessions ADD COLUMN event_id INT UNSIGNED NULL AFTER admin_user_id,
  ADD CONSTRAINT fk_admin_sessions_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- preenchimento a partir do modelo atual
INSERT IGNORE INTO event_admins (event_id, admin_user_id, created_at)
  SELECT event_id, id, created_at FROM admin_users WHERE event_id IS NOT NULL;
UPDATE admin_users SET is_super = 1 WHERE event_id IS NULL;
UPDATE admin_sessions s INNER JOIN admin_users au ON au.id = s.admin_user_id
  SET s.event_id = au.event_id WHERE s.event_id IS NULL;
```
- **Aditiva:** `admin_users.event_id` continua existindo. O código novo para de ler, e ela sai numa migração futura.
- **Rollback seguro:** o código novo continua gravando `admin_users.event_id` (com o primeiro evento) em toda conta de cliente. Assim, se precisar voltar a API antiga, ela nunca enxerga um cliente como super (`event_id NULL`).
- **Sessões abertas:** o preenchimento de `admin_sessions.event_id` mantém logado quem já está no painel (os admins do seu casamento não caem).
- **Produção:** hoje só tem o seu casamento, os 3 exemplos e um evento de teste, então o preenchimento é pequeno. Arquivo re-executável `sql/deploy_021.sql`, rodado duas vezes seguidas no dev sem mudar nada na segunda.
- **Ordem do deploy:** SQL → API → **SQL de novo** → front. A segunda rodada pega o que a API anterior tiver criado no intervalo (um admin novo sem ligação, um login com sessão sem evento). A API nova também se vira sozinha nesses dois casos (usa o `admin_users.event_id` da conta), então a segunda rodada é só arrumação.

### API
- **`require_admin`:** lê `au.is_super` e `s.event_id`, e confere em `event_admins` que a conta ainda é admin daquele evento (removida do evento → 401). A sessão aberta pelo super ("entrar como admin") continua passando.
- **`require_super_admin`:** `is_super = 1` no lugar de `event_id IS NULL`.
- **`require_event_admin`:** igual a hoje (evento da sessão + prazo de acesso daquele evento).
- **`POST /admin/login`:** com um evento, a sessão já nasce nele. Com vários, nasce no evento mais próximo (data futura mais perto; sem data, o mais recente) e a resposta traz a lista `events`. O super nasce sem evento.
- **`POST /admin/session/event`** `{ event_id }`: troca o evento ativo (só entre os eventos da conta).
- **`GET /admin/me` e login:** devolvem `is_super` e `events` (os eventos da conta: nome, tipo, data, acesso encerrado ou não), e **continuam devolvendo `admin.event_id`** (o evento ativo), para o front antigo seguir funcionando durante o deploy. O painel chama `/admin/me` ao abrir, então um evento novo ligado à conta aparece sem entrar de novo.
- **Super, aba Admins do evento:**
  - adicionar um e-mail **novo** cria a conta e manda o "crie sua senha", como hoje;
  - adicionar um e-mail que **já tem conta** só liga a conta ao evento e manda "você ganhou acesso a mais um evento" (sem senha nova);
  - remover tira a ligação; conta que fica sem nenhum evento (e não é super) é apagada;
  - editar nome/e-mail muda a conta da pessoa, que vale para todos os eventos dela: a tela avisa "essa pessoa também acessa: …";
  - o limite de admins contratados conta as ligações do evento.
- **Super, evento:** "Novo evento" com e-mail que já tem conta liga a conta em vez de dar 409; "entrar como admin" abre a sessão já no evento; apagar evento apaga as ligações e as contas que ficarem sem evento.
- **"Esqueci a senha":** já é por e-mail, não muda. O e-mail de redefinição não cita evento quando a conta tem mais de um.

### Front
- **Quem é super** passa a vir de `is_super` (hoje `event_id === null` em `AdminLogin`, `AdminLayout` e `SuperAdminLayout`).
- **"Seus eventos":** depois do login, quem tem mais de um evento escolhe em cards (nome, tipo, data, "acesso encerrado" quando for o caso).
- **Trocar evento:** no topo do painel, só para quem tem mais de um.
- **Aba Admins no super:** o aviso de conta compartilhada e a mensagem "essa pessoa já tinha conta e agora também acessa este evento".

---

## Pagamento online: fluxo (fases 10–13)

```
Home (simulador) ──"Contratar"──▶ /contratar
  escolhas do orçamento + nome, e-mail, WhatsApp, nome(s) do evento, data
        │ POST /orders
        ▼
API cria o pedido (pending), recalcula o preço, cria a preferência no MP
        │ checkout_url (init_point)
        ▼
Página de pagamento do Mercado Pago (Pix / cartão até 4x)
        │                                   │
        │ volta (back_urls)                 │ webhook (notification_url)
        ▼                                   ▼
/pedido/{public_id}                 API busca o pagamento no MP,
mostra o status (consulta a API)    confere valor e referência,
                                    marca o pedido como pago (uma vez só),
                                    e-mail pro cliente + aviso pra você
        │
        ▼
Super › Pedidos › "Criar evento" (formulário preenchido com o pedido)
        │ POST /admin/super/events com order_id
        ▼
Evento criado, pedido = event_created, cliente recebe "crie sua senha"
(ou "seu evento novo está no painel", se o e-mail já tem conta)
```

- **Quem manda é o webhook.** A volta do cliente pelo `back_urls` só mostra a tela; ela nunca marca nada como pago (a URL pode ser aberta por qualquer um).
- **O webhook não é confiável sozinho**: a API sempre busca o pagamento em `GET /v1/payments/{id}` com o access token e só confia no que vem de lá.

---

## Status do pedido

| Status | Quando | O que aparece |
|---|---|---|
| `pending` | Pedido criado, aguardando pagamento (inclui Pix gerado e não pago, cartão em análise) | Cliente: "Aguardando pagamento", com botão para voltar ao pagamento. Super: na lista, filtrado por padrão. |
| `paid` | Mercado Pago aprovou | Cliente: "Pagamento confirmado, seu convite está sendo preparado". Super: destaque "aguardando criação". |
| `event_created` | Super criou o evento a partir do pedido | Cliente: "Seu convite está pronto, confira seu e-mail". |
| `expired` | Pendente além do prazo, sem pagamento | Cliente: "Esse pedido expirou", com link para fazer outro. |
| `canceled` | Cancelado pelo super, ou pagamento recusado/cancelado no MP | — |
| `refunded` | Estornado ou chargeback no MP | Super: alerta. O evento, se existir, **não** é apagado sozinho: você decide. |

- **Transições:** `pending → paid → event_created` e as saídas para `expired`/`canceled`/`refunded`. O `UPDATE` sempre filtra pelo status de origem (`WHERE status = 'pending'`), então webhook repetido ou fora de ordem não faz nada duas vezes.
- **Pagamento recusado** (`rejected`): o pedido continua `pending`, porque a pessoa pode tentar de novo na mesma preferência.

---

## Modelo de dados (API)

### Migração 022: pedidos
```sql
CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(32) NOT NULL,              -- token aleatório da URL /pedido/{public_id}
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  customer_name VARCHAR(150) NOT NULL,
  customer_email VARCHAR(190) NOT NULL,
  customer_phone VARCHAR(30) NULL,
  event_type VARCHAR(20) NOT NULL,
  host_name VARCHAR(150) NOT NULL,
  host_name_secondary VARCHAR(150) NULL,
  event_date DATE NULL,
  customer_notes TEXT NULL,                 -- "algo mais que a gente deva saber?"
  price_breakdown TEXT NOT NULL,            -- mesmo formato do events.price_breakdown
  total DECIMAL(10,2) NOT NULL,
  coupon_code VARCHAR(40) NULL,
  mp_preference_id VARCHAR(64) NULL,
  checkout_url VARCHAR(500) NULL,
  mp_payment_id VARCHAR(32) NULL,
  payment_method VARCHAR(30) NULL,          -- pix, credit_card, debit_card…
  installments TINYINT UNSIGNED NULL,
  paid_amount DECIMAL(10,2) NULL,
  paid_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  event_id INT UNSIGNED NULL,               -- evento criado a partir do pedido
  super_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_public_id (public_id),
  KEY idx_orders_status (status),
  KEY idx_orders_coupon_code (coupon_code),
  KEY idx_orders_mp_payment_id (mp_payment_id)
);

CREATE TABLE IF NOT EXISTS payment_notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NULL,
  mp_payment_id VARCHAR(32) NULL,
  mp_status VARCHAR(30) NULL,
  payload TEXT NOT NULL,                    -- o que o MP mandou + o pagamento consultado
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payment_notifications_order (order_id)
);
```
- **Tudo aditivo:** tabelas novas, nenhuma coluna mexida. O seu casamento e os eventos atuais não passam por nada disso.
- **`payment_notifications`** é um diário de cada webhook recebido, para investigar "paguei e não liberou" sem depender do painel do MP.
- **Colação:** a contagem de cupom vai comparar `orders.coupon_code` com `coupons.code`. Usar o mesmo `COLLATE utf8mb4_general_ci` explícito que a subconsulta de usos já usa (ver a nota da migração 016).
- **Deploy:** um arquivo re-executável `sql/deploy_022.sql`, como os anteriores.

### Cupom: pedido pago também conta
Hoje um "uso" é um evento vendido com o cupom (`events.coupon_code`). Com pedidos, entre o pagamento e a criação do evento o cupom ficaria sem contar, e um cupom com limite poderia ser vendido além do limite.
- `coupon_uses` passa a somar **eventos com o cupom + pedidos `paid`** (pedido `event_created` já conta pelo evento, então não duplica).
- Pedido **pendente não reserva** uso: se o cupom esgotar enquanto a pessoa paga, o pagamento ainda vale com o preço travado no pedido. Caso raro e a favor do cliente.
- Clique no WhatsApp continua não contando (a sua preocupação da fase 7).

### Config (`config.local.php`)
```php
'mercadopago' => [
    'access_token' => '',      // produção: APP_USR-...; dev: credencial de teste
    'webhook_secret' => '',    // "assinatura secreta" do webhook no painel do MP
    'max_installments' => 4,
    'order_ttl_hours' => 24,   // prazo do pedido pendente
    'statement_descriptor' => 'PRESENZO',  // nome na fatura do cartão
],
'app' => [
    'api_url' => 'https://api.presenzo.com.br',  // monta a notification_url
    'notify_email' => 'contato@presenzo.com.br', // aviso de pedido pago/estornado
],
```
Os padrões ficam no `config.php`; no servidor, o `config.local.php` só precisa do `access_token`, do `webhook_secret` e do `api_url`. Sem `access_token`, `GET /pricing` responde `checkout.enabled = false`, o botão "Contratar" não aparece e a home segue só com o WhatsApp.

---

## API

### Público
- **`POST /orders`**
  - Body: `{ choice: { event_type, guest_tier_id, gifts, premium, extra_admins, coupon? }, customer: { name, email, phone }, event: { host_name, host_name_secondary?, subtitle?, event_date? }, notes?, website? }`.
  - Valida tudo com mensagens do formulário ("Informe seu nome.", "Informe um WhatsApp com DDD."…), recalcula com `compute_quote` (o front nunca manda preço), grava o pedido `pending` com `expires_at`, cria a preferência no MP e devolve `{ order, checkout_url }`.
  - **WhatsApp obrigatório**, gravado só com dígitos e o 55 (`5577999990000`).
  - **Cupom inválido** responde 422 com o motivo (`code: "coupon"`), em vez de cobrar o preço cheio sem avisar. **Cupom que zera o pedido** (total abaixo de R$ 1) responde "Esse cupom precisa ser usado com a gente pelo WhatsApp.": o MP não cobra R$ 0.
  - Se o MP não criar a preferência, o pedido é apagado e a resposta é 502 ("tente de novo em instantes").
  - `website` é um campo isca (honeypot): preenchido, a API finge sucesso e não cria nada. Pedido cria preferência no MP, então vale barrar robô.
- **`GET /orders/{public_id}`**
  - Devolve só o necessário para a tela de status: `status`, itens e `total`, tipo e nomes do evento, forma de pagamento, `checkout_url` e `expires_in_seconds` enquanto `pending`, e o primeiro nome do cliente. Nunca devolve e-mail/telefone.
  - **`?payment_id=...`** (o MP põe na URL de volta): a API confere esse pagamento no MP na hora e aplica no pedido. A tela de status não depende do webhook ter chegado, e o fluxo funciona em dev sem túnel.
  - Pedido `pending` com `expires_at` vencido é devolvido (e gravado) como `expired`. A validade fica no relógio do banco (`TIMESTAMPDIFF`), então não depende de fuso.
- **`POST /webhooks/mercadopago`**
  - Valida a assinatura (`x-signature` + `x-request-id`, HMAC-SHA256 com `webhook_secret`). Inválida → 401 e nada muda.
  - Para `type = payment`: busca `GET /v1/payments/{data.id}`, acha o pedido por `external_reference` (= `public_id`), confere `transaction_amount` com `orders.total`, grava no diário e aplica o status.
  - Responde 200 depois de gravar. Se a consulta ao MP falhar, responde 5xx de propósito, para o MP tentar de novo.
  - **Casos de olho humano**, que não mudam o pedido e mandam aviso para o `notify_email`: aprovado com valor diferente do pedido (`amount_mismatch`) e aprovado num pedido cancelado (`paid_while_canceled`). Aprovado depois de expirar vale (o Pix pode ter sido gerado antes).

### Super
- **`GET /admin/super/orders`** (filtro por status) e **`GET /admin/super/orders/{id}`** (com o diário de notificações).
- **`PUT /admin/super/orders/{id}`**: notas do super e cancelar.
- **`POST /admin/super/events` aceita `order_id`**: na mesma transação do evento, o pedido vira `event_created` com `event_id`, e o evento grava `price_charged = paid_amount`, `price_breakdown` e `coupon_code` do pedido. Pedido que não está `paid` → 409. Se o e-mail do cliente já tem conta, o evento entra na lista dela (fase 9).
- **Dashboard:** número de pedidos pagos aguardando criação.

### Mercado Pago: a preferência
```json
{
  "items": [{ "title": "Presenzo · Convite de casamento", "quantity": 1, "unit_price": 287.00, "currency_id": "BRL" }],
  "payer": { "name": "…", "email": "…" },
  "external_reference": "<public_id>",
  "notification_url": "https://api.presenzo.com.br/webhooks/mercadopago",
  "back_urls": {
    "success": "https://presenzo.com.br/pedido/<public_id>",
    "pending": "https://presenzo.com.br/pedido/<public_id>",
    "failure": "https://presenzo.com.br/pedido/<public_id>"
  },
  "auto_return": "approved",
  "payment_methods": { "installments": 4, "excluded_payment_types": [{ "id": "ticket" }] },
  "expires": true,
  "expiration_date_to": "<expires_at>",
  "statement_descriptor": "PRESENZO"
}
```
- Chamada com `curl` direto, como o Resend no `Mailer.php`: sem SDK e sem composer (a API roda PHP 7.4 na Hostinger).
- `excluded_payment_types: ticket` tira o boleto.
- Cliente que volta sem pagar usa o mesmo `checkout_url` enquanto o pedido não expira.

### E-mails (Resend, como hoje)
1. **Pedido pago → cliente:** "Pagamento confirmado! Seu convite está sendo preparado e você recebe um e-mail para criar sua senha assim que ele estiver pronto." Com o resumo do pedido.
2. **Pedido pago → você** (`notify_email`): "Novo pedido pago: Casamento de Helena & Rafael, R$ 287,00, Pix", com link para o pedido no super.
3. **Evento criado → cliente sem conta:** o e-mail de convite "crie sua senha" que já existe.
4. **Evento criado → cliente que já tem conta:** "Seu evento novo já está no painel", com o link de login (o mesmo e-mail da fase 9 para admin adicionado a mais um evento).

---

## Telas

### Público
- **Home, simulador:** o botão principal vira **"Contratar"** (leva as escolhas para `/contratar`). "Pedir pelo WhatsApp" fica como link secundário.
- **`/contratar`:**
  - as mesmas escolhas do simulador (reaproveita `QuoteFields`/`QuoteSummary`), já preenchidas;
  - "Seus dados": nome, e-mail, WhatsApp;
  - "Sobre o evento": nome(s) como vão aparecer no convite, data (com "ainda não sei");
  - resumo com o total e "Ir para o pagamento" (Pix ou cartão em até 4x);
  - aviso curto: "Depois do pagamento, a gente prepara seu convite e te manda um e-mail para criar a senha do painel. Já tem conta? Use o mesmo e-mail e o evento novo aparece no seu painel."
- **`/pedido/:publicId`:** status do pedido (tabela acima), consultando a API a cada poucos segundos enquanto está `pending`, porque o Pix costuma confirmar em segundos e o webhook chega antes ou depois da volta.

### Super
- **"Pedidos"** no menu:
  - lista com status, cliente, evento, total, forma de pagamento e data; filtro por status, com "Pagos aguardando" em destaque;
  - detalhe: dados do cliente (com link de WhatsApp), escolhas, orçamento, pagamento, diário de notificações, notas;
  - **"Criar evento"** (só em `paid`): abre "Novo evento" já preenchido: tipo, nomes, data, plano/limites pelo `contract` do orçamento, valor cobrado, cupom e o cliente como primeiro admin;
  - **"Cancelar"** (com confirmação). Estorno em si é feito no painel do MP; o webhook traz o `refunded`.
- **Dashboard:** card "Pedidos aguardando".

---

## Fases

Cada fase vai separada, com testes no banco dev e o deploy na ordem migração → API → front. A fase 9 pode ir pro ar sozinha. **Do pagamento, nada vai pro ar até as fases 10–12 estarem prontas**: o botão "Contratar" só aparece com o `access_token` configurado.

### Fase 9: uma conta, vários eventos
> **Feita em 2026-10-30** no branch `feat/pagamento-online` dos dois repos, ainda sem deploy. Migração 021 rodada no `wedding_dev`. Testes: API 34/34 e navegador 16/16.

1. Migração 021 (`event_admins`, `is_super`, `admin_sessions.event_id`) e `sql/deploy_021.sql`.
2. `require_admin`/`require_super_admin` pela sessão, login com evento ativo, `GET /admin/me` com a lista de eventos e `POST /admin/session/event`.
3. Aba Admins e "Novo evento" no super ligando contas existentes; "entrar como admin"; apagar evento limpando contas sem evento.
4. E-mail "você ganhou acesso a mais um evento".
5. Front: `is_super`, "Seus eventos" e "Trocar evento".
6. Testes: conta com dois eventos (troca, prazo de um vencido e do outro não, remoção de um), super, "entrar como admin", sessão aberta antes da migração continuando logada.

### Fase 10: pedidos e pagamento na API
> **Feita em 2026-10-30** no branch `feat/pedidos-pagamento` dos dois repos, ainda sem deploy. Migração 022 rodada no `wedding_dev`. Testes contra um MP falso: 41/41. Teste real na conta de teste do MP (aplicação Integracao-Presenzo, Preferences), com túnel `cloudflared` para a API local: "Simular notificação" do painel passou na assinatura, a preferência foi aceita e lida de volta (4x, sem boleto, validade, fatura PRESENZO) e um pagamento com cartão de teste (APRO) virou `paid` pelo webhook. Ajuste que o teste real pegou: `auto_return` só vai com volta em `https` (o MP recusa a preferência com volta em `http://localhost`).

1. Migração 022 (`orders`, `payment_notifications`) e `sql/deploy_022.sql`.
2. Cliente do Mercado Pago em `src/MercadoPago.php` (criar preferência, buscar pagamento, validar assinatura).
3. `POST /orders`, `GET /orders/{public_id}` e `POST /webhooks/mercadopago`.
4. `coupon_uses` contando pedidos pagos.
5. E-mails de pedido pago (cliente e você).
6. Testes: um servidor falso do MP local para preferência/pagamento/assinatura, e depois um pagamento de teste de verdade com as credenciais de teste.

### Fase 11: telas públicas
> **Feita em 2026-10-30** no branch `feat/pedidos-pagamento`, ainda sem deploy. Navegador contra o MP falso: 27/27.

1. "Contratar" no simulador e a página `/contratar`.
2. A página `/pedido/:publicId`.

Decisões do Pedro (2026-10-30): **todos os "Quero o meu"** (topo da home, chamada final, banner e chamada dos convites de exemplo) vão pro `/contratar`, com o WhatsApp como link secundário; o simulador mostra o **total exato** ("Total", não "A partir de"); o `/contratar` é **uma página só**, com o resumo fixo ao lado. Com o pagamento desligado (`checkout.enabled = false`), tudo volta sozinho pro WhatsApp e pro "A partir de".

Como ficou:
- **Escolha na URL:** `/contratar?tipo=aniversario&convidados=100&lista=0&premium=1&admins=1&cupom=JOAO15`. O simulador manda a escolha por aí, e dá pra divulgar um link com o cupom já preenchido (`/contratar?cupom=JOAO15`). A faixa vai pela quantidade de convidados, não pelo id (o id muda quando a tabela é salva).
- **`/contratar`:** "Seu convite" (os campos do simulador), "Seus dados" (nome, email, WhatsApp com máscara) e "Sobre o evento" (nomes com os rótulos do tipo, segundo nome obrigatório no casamento, "Qual é a celebração?" no tipo Celebração, data com "Ainda não sei", observação). Cupom inválido desativa o pagamento; cupom que zera o pedido mostra o aviso do WhatsApp.
- **`/pedido/:publicId`:** aguardando (com o botão de voltar ao pagamento e a validade), recusado ("Tentar de novo"), Pix gerado, pago, evento criado ("Entrar no painel"), expirado ("Fazer um novo pedido"), cancelado e estornado. Na volta do MP usa o `payment_id` da URL, e enquanto aguarda consulta a API a cada 5 s (até 10 min, depois um "Atualizar").
- **Endereços reservados:** a API não gera mais slug de evento `admin`, `super`, `contratar` nem `pedido` (ganham sufixo), porque essas rotas do site vêm antes de `/:slug`.

### Fase 12: pedidos no super
1. Lista e detalhe de pedidos, cancelar, notas.
2. "Criar evento" a partir do pedido (`order_id` em `POST /admin/super/events`).
3. Card no dashboard.
4. **Conferir no Mercado Pago:** busca o pagamento pelo número do pedido (`GET /v1/payments/search?external_reference=...`) e aplica como o webhook. Botão no detalhe do pedido no super e, na página `/pedido`, conferência automática enquanto aguarda (com limite de frequência). Fecha a brecha que o teste real de 2026-10-30 mostrou: aviso perdido + aba do MP fechada antes de voltar = pedido pago parado em "aguardando".
5. **Antes do deploy:** um pagamento real de valor baixo (ex: cupom de 99% num pedido seu) de ponta a ponta, e estorno.

### Fase 13 (depois): criação automática
- O webhook faz o que o botão "Criar evento" faz: cria o evento com o que veio no pedido e manda o "crie sua senha" (ou o "evento novo no painel") na hora. O super só revisa.
- Só quando as fases 10–12 estiverem rodando há um tempo sem susto.

---

## Testes

- **Dev:** o webhook do MP não alcança `localhost`. Duas formas, as duas na fase 10:
  1. um servidor falso do MP em Python (como os testes anteriores), com o `api_base` do cliente apontando pra ele: cobre preferência, pagamento aprovado/recusado/estornado, assinatura inválida, webhook repetido, valor diferente;
  2. as **credenciais de teste** do MP com um túnel (`cloudflared` ou `ngrok`) para a API local, com cartão de teste e Pix de teste.
- **Produção:** um pedido real de valor baixo antes de divulgar o botão.

---

## Perguntas em aberto

1. **Boleto:** fora? *(Respondido: fora. Só Pix e cartão.)*
2. **Juros do parcelado:** por padrão quem paga o juro das parcelas é o comprador. Parcelado sem juros sai da sua taxa. *(Sugestão: juros com o comprador. Conferir na conta do MP como está configurado.)*
3. **Recebimento do cartão:** na hora (4,98%), em 14 dias (4,49%) ou em 30 dias (3,98%)? Isso é configurado na conta do MP, não no código.
4. **E-mail que já é admin de outro evento:** *(Respondido primeiro como "bloquear antes de pagar". Revisto: uma conta pode ter vários eventos, fase 9, e o pedido é aceito normalmente.)*
5. **Prazo do pedido pendente:** *(Respondido: 24 horas.)*
6. **Data do evento:** *(Respondido: opcional, com "ainda não sei".)*
7. **Aviso de pedido pago:** *(Respondido: contato@presenzo.com.br, padrão no `config.php`.)*
8. **WhatsApp no pedido:** *(Respondido: obrigatório.)*
9. **Cupom de 100%:** *(Respondido: bloqueado no site, "use com a gente pelo WhatsApp". Evento de graça continua pelo super.)*
