# Plano: planos, limites e orçamento

Próxima etapa do Presenzo depois das fases 1–3 (tipos de evento, aberturas, painéis).
Cobre os três itens do backlog:

1. **Eventos Premium**: hoje o único benefício é o prazo de acesso depois do evento ser o dobro. Depois entram funções exclusivas.
2. **Orçamento**: uma matriz de fatores define o preço (tipo de evento, lista de presentes, faixa de convidados, admins…). O que o cliente não contrata some do produto.
3. **Evento ilimitado**: uma marcação interna, acima de tudo. O seu casamento é o primeiro, mas o super pode colocar **qualquer evento** nela. O evento tem todas as funções, sem limite e sem prazo de acesso.

---

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Planos vendidos | **Padrão** e **Premium**. O **Ilimitado** é interno, nunca aparece em venda nem para o cliente, e o super pode colocar qualquer evento nele. |
| Quem usa o orçamento | **Os dois**: simulador público na home, que manda o pedido pelo WhatsApp, e calculadora no super ao criar ou editar o evento. |
| Faixa de convidados | **Limite com tolerância**: a faixa contratada vale, mas há uma margem (padrão de 20%: 50 → até 60). Dentro da margem o admin vê um aviso. Quando a margem enche, trava e pede pra entrar em contato. |
| Composição do preço | **Base por tipo de evento + adicionais**: faixa de convidados, lista de presentes, admins extras, Premium. Os valores são editáveis no super. |

---

## Conceitos

### Plano do evento
- `standard` (Padrão), `premium` (Premium) e `unlimited` (Ilimitado, interno).
- O plano define **padrões**. O super pode ajustar cada evento individualmente.
- **Ilimitado em qualquer evento:** o super escolhe esse plano para o evento que quiser, novo ou existente (o seu casamento, família, amigos, demonstração).

### Direitos do evento ("o que o evento pode")
Tudo o que o sistema libera ou bloqueia passa por **uma função só** no backend, `event_entitlements($event)`, espelhada no front. Ela junta o plano com o que foi contratado:

| Direito | Padrão | Premium | Ilimitado |
|---|---|---|---|
| Prazo de acesso depois do evento | 15 dias | 30 dias (o dobro) | sem prazo |
| Lista de presentes + Pix | se contratada | se contratada | sempre |
| Faixa de convidados | contratada + tolerância | contratada + tolerância | sem limite |
| Admins | incluídos + extras contratados | incluídos + extras contratados | sem limite |
| Funções Premium (futuras) | — | ✓ | ✓ |

Com isso, uma função Premium nova é só uma linha em `event_entitlements` e um `if` onde ela aparece.

### Lista de presentes como módulo
- **Presentes e Pix são um módulo só:** quem não quer a lista também não quer a chave Pix no convite. Desligado:
  - o botão "Lista de presentes" some do convite e da tela de confirmação;
  - "Presentes" some do menu do admin;
  - a chave Pix some das configurações e do convite;
  - os endpoints de presentes respondem 404 (público) ou 403 (admin).
- **Desligar não apaga nada:** presentes e escolhas já feitas ficam guardados, só escondidos. Religar mostra tudo de novo.

### Faixa de convidados com tolerância
- **O que conta:** **pessoas** cadastradas (titulares + relacionados), não convites. É isso que pesa no preço.
- **Contas:**
  - `limite` = a faixa contratada (ex: 50);
  - `teto` = `limite + ceil(limite × tolerância)` (ex: 50 + 10 = 60);
  - abaixo do limite: normal;
  - entre o limite e o teto: aviso no admin ("Você passou da faixa de 50 convidados. Dá pra adicionar mais 6 antes de precisar mudar de faixa.");
  - no teto: adicionar trava (API 422 `guest_limit`), com um botão pra falar no WhatsApp.
- **Liberar espaço:** apagar convidados libera vaga.
- **Upgrade:** o super muda a faixa a qualquer hora.

---

## Modelo de dados (API)

Tudo **aditivo**, seguindo a regra do casamento em produção: os valores padrão reproduzem o comportamento atual.

### Migração 015: plano e direitos do evento
```sql
ALTER TABLE events
  ADD COLUMN plan ENUM('standard','premium','unlimited') NOT NULL DEFAULT 'standard' AFTER show_calendar,
  ADD COLUMN gifts_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER plan,
  ADD COLUMN guest_limit INT UNSIGNED NULL AFTER gifts_enabled,   -- NULL = sem limite (eventos existentes)
  ADD COLUMN admin_limit INT UNSIGNED NULL AFTER guest_limit,     -- NULL = sem limite
  ADD COLUMN price_breakdown TEXT NULL AFTER payment_notes;       -- JSON do orçamento usado (histórico, opcional)
```
- **Eventos existentes:** ficam Padrão, com presentes ligados e **sem limite**. Nada muda para eles, e cada um só ganha limite quando for renovado ou ajustado.
- **Seu casamento:** vira `unlimited` pelo super, logo depois do deploy desta fase.

### Migração 016: matriz de preços e configurações
```sql
CREATE TABLE price_items (      -- valores fixos
  item_key VARCHAR(40) PRIMARY KEY,   -- base_wedding, base_birthday, base_graduation, base_other,
                                      -- gifts, extra_admin, premium
  label    VARCHAR(100) NOT NULL,
  amount   DECIMAL(10,2) NOT NULL
);

CREATE TABLE guest_tiers (      -- faixas de convidados
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  max_guests INT UNSIGNED NOT NULL,   -- 50, 100, 150, 200...
  amount     DECIMAL(10,2) NOT NULL   -- adicional da faixa
);

CREATE TABLE app_settings (     -- parâmetros editáveis no super
  setting_key VARCHAR(40) PRIMARY KEY,  -- guest_tolerance_percent, included_admins,
                                        -- grace_days_standard, grace_days_premium
  value       VARCHAR(100) NOT NULL
);
```
- **Valores iniciais na migração:** tolerância de 20%, prazos de 15 e 30 dias, e os admins incluídos (veja as perguntas abaixo).
- **Prazos de acesso:** hoje vêm de `config('access.grace_days')`. Passam a ser lidos de `app_settings`, com o config de reserva.

### Cálculo do preço: uma fonte só
- **Endpoint:** `POST /pricing/quote` recebe `{ event_type, guest_tier_id, gifts, premium, extra_admins }`.
- **Resposta:** `{ total, items: [{ label, amount }] }`, ou seja, o valor e de onde ele vem.
- **Quem usa:** tanto o simulador público quanto o super chamam esse endpoint. O front nunca soma preço sozinho, então os dois sempre mostram o mesmo valor.
- **Endpoint de leitura:** `GET /pricing` (público) devolve só o necessário pro simulador montar as opções (tipos, faixas, adicionais).
- **Limite de tempo:** o cálculo depende da tabela atual. O evento guarda o `price_charged` (o que foi cobrado) e o `price_breakdown`, então mudar a tabela depois não altera eventos já vendidos.

---

## Regras no backend

- **Acesso:**
  - **Na criação:** `access_expires_at = event_date + prazo do plano`.
  - **Ilimitado:** `access_expires_at = NULL`, e `require_event_admin` também ignora a expiração pelo plano, como defesa extra.
  - **Ao mudar o plano no super:** a tela sugere a nova data, e o super confirma ao salvar. Isso mantém a regra de hoje, em que o super tem controle direto da data.
- **Presentes desligados:**
  - rotas `/admin/gifts*` → 403 `feature_disabled`;
  - rotas `/events/{slug}/guests/{g}/gifts*` → 404;
  - `pix_key` não sai no evento público.
- **Convidados:**
  - **Bloqueio:** `POST /admin/guests` e `POST /admin/guests/{id}/dependents` checam o teto e devolvem 422 `guest_limit` quando cheio.
  - **Faixa no admin:** o evento do admin (e do super) passa a mandar `guest_limit` e `guest_cap`, já considerando o plano (null = sem limite). A contagem fica com a tela Pessoas, que já tem a lista e atualiza a cada cadastro ou remoção.
  - **Corrida:** o cadastro roda numa transação com `FOR UPDATE` no evento, então dois cadastros ao mesmo tempo não passam juntos do teto.
  - **Entrar como admin:** o super também respeita o teto. Para passar dele, muda a faixa.
- **Admins:** só o super cria admins, então `admin_limit` é **informativo**. Serve pro preço e pra tela mostrar "2 de 2 admins", sem bloquear o super.
- **Ilimitado:** ignora todos os limites e liga tudo.
- **Compatibilidade:** os campos novos são só acrescentados nas respostas, e o front antigo ignora. Os valores padrão (Padrão, presentes ligados, sem limite) mantêm tudo como hoje até alguém mudar.

---

## Telas

### Super
- **"Preços e planos"** (item novo no menu):
  - valor base por tipo de evento;
  - faixas de convidados (adicionar, editar, remover);
  - adicionais (lista de presentes, admin extra, Premium);
  - tolerância (%), admins incluídos e prazo de acesso de cada plano;
  - uma prévia: "Casamento, até 100, com lista, Premium = R$ X".
- **Página do evento:** a aba "Acesso e financeiro" vira **"Plano e financeiro"**:
  - **Plano:** Padrão, Premium ou Ilimitado, disponível para qualquer evento. O Ilimitado vem com o aviso "interno, sem limites e sem prazo".
  - **O que foi contratado:** lista de presentes (liga/desliga), faixa de convidados e admins extras.
  - **Preço sugerido** pela matriz, com o detalhamento, ao lado do **valor cobrado** (editável, para dar desconto).
  - **Acesso:** a data sugerida pelo plano, com um botão "usar data sugerida".
- **Novo evento:** a calculadora fica no topo do formulário. Ela preenche o plano, os limites e o valor cobrado.
- **Lista e dashboard:**
  - selo de plano (Premium e Ilimitado);
  - aviso "acima da faixa" quando o evento está na tolerância ou travado;
  - número de eventos Premium no dashboard.

### Admin do evento (cliente)
- **Pessoas:** uma barra de uso da faixa ("42 de 50 convidados").
  - na tolerância, um aviso amarelo;
  - no teto, um aviso vermelho com "Falar no WhatsApp" e o botão de adicionar desativado.
- **Lista de presentes desligada:** o item some do menu e o campo Pix some das configurações.
- **Configurações:** mostram o plano e até quando vai o acesso. Já mostram o acesso hoje.

### Público
- **Home, seção "Simule seu convite":**
  - a pessoa escolhe o tipo, a faixa de convidados, se quer lista de presentes e se quer Premium;
  - aparece o valor estimado, com o detalhamento;
  - o botão "Pedir pelo WhatsApp" abre com uma mensagem pronta descrevendo o que foi escolhido.
- **Convite e confirmação:** sem o botão de presentes quando o módulo está desligado.

---

## Benefícios Premium

- **Hoje:** prazo de acesso de 30 dias depois do evento, o dobro do Padrão.
- **Candidatos para depois**, a decidir um por um:
  - **sem o "Feito com Presenzo"** no rodapé do convite: marca própria, o candidato mais forte;
  - **aberturas Portas e Vertical** exclusivas, com Carta e Direto no Padrão;
  - **mais admins incluídos;**
  - **exportar a lista de presenças** (planilha ou PDF);
  - **métricas de presentes** (quem viu e quantas vezes);
  - **música e foto de capa.** Hoje são de todos, então tirar do Padrão mudaria eventos existentes. Melhor só para eventos novos.

Cada benefício entra como uma linha em `event_entitlements`, sem mudar o modelo.

---

## Fases

Cada fase vai separada, com testes no banco dev e o deploy na ordem migração → API → front.

### Fase 4: base dos planos (nada muda para os clientes)
1. Migração 015 e `event_entitlements` (API e front).
2. No super, a aba "Plano e financeiro" com plano, presentes ligado/desligado e limites. Ainda sem preço.
3. Ilimitado: sem expiração e sem limites.
4. Módulo de presentes desligável (API, convite, admin).
5. Premium: prazo de acesso dobrado na criação e na sugestão de data.
6. **Depois do deploy:** marcar o seu casamento como Ilimitado.

> Por que primeiro: o Ilimitado protege o casamento **antes** de existir qualquer limite no sistema.

### Fase 5: faixa de convidados
1. Teto com tolerância na API (422 `guest_limit`) e `guest_limit`/`guest_cap` no evento do admin.
2. Barra de uso e avisos em Pessoas, com o botão de WhatsApp no teto.
3. Selo "acima da faixa" na lista e no dashboard do super.

### Fase 6: matriz de preços
1. Migração 016 e a tela "Preços e planos" no super.
2. `GET /pricing` e `POST /pricing/quote`.
3. `app_settings` passa a comandar a tolerância, os admins incluídos e os prazos.

### Fase 7: orçamento
1. A calculadora em "Novo evento" e em "Plano e financeiro", com o preço sugerido ao lado do valor cobrado.
2. O simulador público na home e a mensagem pronta para o WhatsApp.
3. O `price_breakdown` guardado no evento.

### Fase 8: benefícios Premium
- As funções exclusivas da lista acima, conforme você for decidindo.

---

## Perguntas em aberto

Para responder antes da fase em que cada uma entra:

1. **Tolerância:** 20% para todas as faixas? Arredondando para cima (50 → 60, 100 → 120, 75 → 90)? *(Fase 5: adotado assim, no config `limits.guest_tolerance_percent`.)*
2. **O que conta como convidado:** pessoas (titulares + relacionados), como sugerido, ou convites? *(Fase 5: adotado pessoas.)*
3. **Admins incluídos no Padrão:** sugestão de 2 (um casal). No Premium, mais? *(Fase 6)*
4. **Faixas e valores:** quais faixas (ex: 50, 100, 150, 200, 300) e o que fazer acima da última ("sob consulta" no simulador)? *(Fase 6)*
5. **Simulador público:** mostrar o valor exato ou "a partir de R$ X"? *(Fase 7)*
6. **Eventos que já existem:** ficam sem limite até a renovação, como sugerido, ou já entram numa faixa? *(Fase 4)*
7. **Premium:** valor do adicional e quais benefícios entram primeiro. Sugestão: tirar o "Feito com Presenzo". *(Fase 8)*
8. **Desconto:** o valor cobrado pode ficar abaixo do sugerido livremente? Ou registra o motivo (campo de notas, que já existe)? *(Fase 7)*
