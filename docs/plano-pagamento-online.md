# Plano: pagamento online (Mercado Pago)

Próxima etapa do Presenzo depois das fases 4–8 (planos, limites e orçamento).
Hoje a venda fecha pelo WhatsApp: a pessoa simula na home, manda a mensagem pronta, você confirma o valor, recebe o Pix e cria o evento no super. A ideia é que a pessoa consiga **contratar e pagar sozinha**, a qualquer hora, sem passar pelo seu número.

Nesta primeira versão o pagamento é automático e a criação do evento continua com você: o pedido pago fica **"em preparação"** até o super criar o evento. Depois, quando o fluxo estiver redondo, o próprio webhook passa a criar o evento.

---

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Gateway | **Mercado Pago, Checkout Pro**: a página de pagamento é do Mercado Pago (Pix, cartão, parcelado). Dado de cartão nunca passa pela API. A conta já existe e já é verificada. |
| Formas de pagamento | **Pix e cartão, sem boleto** (`excluded_payment_types: ticket`). |
| Parcelamento | **Até 4x** no cartão (`payment_methods.installments = 4` na preferência). |
| Prazo do pedido | **24 horas** pendente. Depois expira e a pessoa faz outro, com a tabela atual. |
| E-mail já admin | **Bloqueado antes de pagar**: um e-mail só pode ser admin de um evento, então o `POST /orders` recusa com um aviso. |
| Data do evento | **Opcional**, com "ainda não sei". |
| Cadastro | **Sem conta antes do pagamento.** O pedido guarda nome, e-mail e WhatsApp. A senha vem depois, pelo e-mail de convite que já existe, quando o evento é criado. |
| Criação do evento | **Manual no começo**: pedido pago aparece em "Pedidos" no super, e o botão "Criar evento" abre o formulário já preenchido. Automática numa fase depois. |
| Preço | Calculado **no servidor** com o `compute_quote` que já existe e **travado no pedido**: mudar a tabela depois não muda pedido já feito. |
| WhatsApp | Continua como **opção secundária** ("Prefere conversar antes?") na home e na tela de contratar. |

### Por que sem conta antes do pagamento
Todo admin pertence a um evento: `admin_users.event_id`, com e-mail único na tabela. Uma conta "solta", sem evento, não existe no modelo, e criar uma mexeria em login, cadastro e numa tela de painel sem evento. Com o pedido no meio, o "cadastro" é o próprio pedido (nome + e-mail), e o acesso nasce junto com o evento pelo fluxo que já funciona:

`handle_create_event` → `create_event_admin` → `issue_and_send_password_token(..., 'invite')` → e-mail "crie sua senha".

---

## Fluxo

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

### Migração 021: pedidos
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
- **Deploy:** um arquivo re-executável `sql/deploy_021.sql`, como os anteriores.

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
],
'app' => [
    'api_url' => 'https://api.presenzo.com.br',  // monta a notification_url
    'notify_email' => '',      // quem recebe o aviso de pedido pago
],
```
Sem `access_token`, o botão "Contratar" não aparece (como o simulador que some com preços zerados) e a home segue só com o WhatsApp.

---

## API

### Público
- **`POST /orders`**
  - Body: `{ choice: { event_type, guest_tier_id, gifts, premium, extra_admins, coupon? }, customer: { name, email, phone }, event: { host_name, host_name_secondary?, event_date? }, notes?, website? }`.
  - Valida tudo, recalcula com `compute_quote` (o front nunca manda preço), grava o pedido `pending` com `expires_at`, cria a preferência no MP e devolve `{ public_id, checkout_url, total }`.
  - **E-mail já usado por um admin:** responde 409 **antes** do pagamento, com "Esse e-mail já acessa outro evento no Presenzo. Use outro e-mail ou fale com a gente no WhatsApp.", para ninguém pagar e travar na criação do evento.
  - `website` é um campo isca (honeypot): preenchido, a API finge sucesso e não cria nada. Pedido cria preferência no MP, então vale barrar robô.
- **`GET /orders/{public_id}`**
  - Devolve só o necessário para a tela de status: `status`, `total`, tipo e nomes do evento, forma de pagamento, `checkout_url` enquanto `pending`. Nunca devolve e-mail/telefone.
  - Pedido `pending` com `expires_at` vencido é devolvido (e gravado) como `expired`.
- **`POST /webhooks/mercadopago`**
  - Valida a assinatura (`x-signature` + `x-request-id`, HMAC-SHA256 com `webhook_secret`). Inválida → 401 e nada muda.
  - Para `type = payment`: busca `GET /v1/payments/{data.id}`, acha o pedido por `external_reference` (= `public_id`), confere `transaction_amount` com `orders.total`, grava no diário e aplica o status.
  - Sempre responde 200 rápido depois de gravar (o MP reenvia o que não recebe 2xx); e-mail fica depois do commit.

### Super
- **`GET /admin/super/orders`** (filtro por status) e **`GET /admin/super/orders/{id}`** (com o diário de notificações).
- **`PUT /admin/super/orders/{id}`**: notas do super e cancelar.
- **`POST /admin/super/events` aceita `order_id`**: na mesma transação do evento, o pedido vira `event_created` com `event_id`, e o evento grava `price_charged = paid_amount`, `price_breakdown` e `coupon_code` do pedido. Pedido que não está `paid` → 409.
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
3. **Evento criado → cliente:** o e-mail de convite "crie sua senha" que já existe. Nada novo.

---

## Telas

### Público
- **Home, simulador:** o botão principal vira **"Contratar"** (leva as escolhas para `/contratar`). "Pedir pelo WhatsApp" fica como link secundário.
- **`/contratar`:**
  - as mesmas escolhas do simulador (reaproveita `QuoteFields`/`QuoteSummary`), já preenchidas;
  - "Seus dados": nome, e-mail, WhatsApp;
  - "Sobre o evento": nome(s) como vão aparecer no convite, data (com "ainda não sei");
  - resumo com o total e "Ir para o pagamento" (Pix ou cartão em até 4x);
  - aviso curto: "Depois do pagamento, a gente prepara seu convite e te manda um e-mail para criar a senha do painel."
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

Cada fase vai separada, com testes no banco dev e o deploy na ordem migração → API → front. **Nada vai pro ar até as fases 9–11 estarem prontas**: o botão "Contratar" só aparece com o `access_token` configurado.

### Fase 9: pedidos e pagamento na API
1. Migração 021 (`orders`, `payment_notifications`) e `sql/deploy_021.sql`.
2. Cliente do Mercado Pago em `src/MercadoPago.php` (criar preferência, buscar pagamento, validar assinatura).
3. `POST /orders`, `GET /orders/{public_id}` e `POST /webhooks/mercadopago`.
4. `coupon_uses` contando pedidos pagos.
5. E-mails de pedido pago (cliente e você).
6. Testes: um servidor falso do MP local para preferência/pagamento/assinatura, e depois um pagamento de teste de verdade com as credenciais de teste.

### Fase 10: telas públicas
1. "Contratar" no simulador e a página `/contratar`.
2. A página `/pedido/:publicId`.

### Fase 11: pedidos no super
1. Lista e detalhe de pedidos, cancelar, notas.
2. "Criar evento" a partir do pedido (`order_id` em `POST /admin/super/events`).
3. Card no dashboard.
4. **Antes do deploy:** um pagamento real de valor baixo (ex: cupom de 99% num pedido seu) de ponta a ponta, e estorno.

### Fase 12 (depois): criação automática
- O webhook faz o que o botão "Criar evento" faz: cria o evento com o que veio no pedido e manda o "crie sua senha" na hora. O super só revisa.
- Só quando as fases 9–11 estiverem rodando há um tempo sem susto.

---

## Testes

- **Dev:** o webhook do MP não alcança `localhost`. Duas formas, as duas na fase 9:
  1. um servidor falso do MP em Python (como os testes anteriores), com o `api_base` do cliente apontando pra ele: cobre preferência, pagamento aprovado/recusado/estornado, assinatura inválida, webhook repetido, valor diferente;
  2. as **credenciais de teste** do MP com um túnel (`cloudflared` ou `ngrok`) para a API local, com cartão de teste e Pix de teste.
- **Produção:** um pedido real de valor baixo antes de divulgar o botão.

---

## Perguntas em aberto

1. **Boleto:** fora? *(Respondido: fora. Só Pix e cartão.)*
2. **Juros do parcelado:** por padrão quem paga o juro das parcelas é o comprador. Parcelado sem juros sai da sua taxa. *(Sugestão: juros com o comprador. Conferir na conta do MP como está configurado.)*
3. **Recebimento do cartão:** na hora (4,98%), em 14 dias (4,49%) ou em 30 dias (3,98%)? Isso é configurado na conta do MP, não no código.
4. **E-mail que já é admin de outro evento:** *(Respondido: bloquear no `POST /orders`, antes de pagar.)*
5. **Prazo do pedido pendente:** *(Respondido: 24 horas.)*
6. **Data do evento:** *(Respondido: opcional, com "ainda não sei".)*
7. **Aviso de pedido pago:** em qual e-mail você quer receber? Fica no `notify_email` do `config.local.php`, então dá pra decidir só no deploy.
