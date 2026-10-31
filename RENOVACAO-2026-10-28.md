# Exam Solver AI — Relatório de Execução

**Data:** 28 de outubro de 2026
**Âmbito executado:** Fase 0 (auditoria e baseline) + correções de segurança P0/P1 + Fase 1 (sistema de design, temas e landing page)
**Base do trabalho:** `main`, último commit `4d5bce8` (01/10/2026), com 83 alterações pré-existentes no working tree que **não foram revertidas nem sobrescritas**.

---

## 1. Arquitetura encontrada

Next.js 14.2.35 (App Router) · React 18.3 · TypeScript strict · Tailwind 3.4 · shadcn/ui + Base UI · framer-motion · react-markdown + KaTeX · Zustand (quase inerte). Backend Supabase (Auth + Postgres + RLS) e chamadas diretas por `fetch` à API da Cerebras com streaming SSE tratado à mão. Pagamentos por Stripe Checkout e por comprovativo de transferência.

Números reais: 56 ficheiros TS/TSX, 9.932 linhas, 22 rotas de API, 8 páginas. `src/app/dashboard/page.tsx` tem 3.307 linhas num único componente com 30 `useState` e zero `useMemo`; `admin-command-center.tsx` tem 1.087 e `pricing-modal.tsx` 662.

O padrão estrutural mais importante — e a origem da maioria das falhas de segurança — é este: quase todas as rotas usam `createServiceClient()` (`service_role`), que **ignora RLS**. A partir desse momento, cada consulta passa a ser responsável pela sua própria verificação de dono, e onde essa verificação não foi escrita à mão o isolamento entre utilizadores desaparece.

---

## 2. Problemas críticos confirmados e respetivas correções

### P0-1 · Qualquer pessoa se dava Premium e 1.000.000 de créditos
**Confirmado.** `approve_payment_proof()` era `SECURITY DEFINER` sem verificação de administrador, e funções novas em Postgres recebem `EXECUTE` para `PUBLIC` — exposta em `/rest/v1/rpc/approve_payment_proof`. Bastava enviar um comprovativo falso (a rota devolve o `proof_id`) e chamar o RPC com a chave anónima pública.

**Corrigido** em `supabase/migrations/2026-10-28_security_hardening.sql`: a função exige `is_current_user_admin()` ou `service_role`, tem `SET search_path` fixo, e o `EXECUTE` foi revogado de `PUBLIC`/`anon`.

### P0-2 · Auto-promoção directa do próprio perfil
**Confirmado.** A política `"Users can update their own profile."` era `FOR UPDATE USING (auth.uid() = id)` sem `WITH CHECK` nem restrição de colunas, e o trigger existente protegia apenas `is_admin`. Um `update({plan_type:'premium', credits_balance:999999})` a partir do browser funcionava.

**Corrigido** na mesma migração: política recriada com `WITH CHECK` e novo trigger `protect_billing_columns` que bloqueia alterações a `plan_type`, `credits_balance`, `is_banned` e `is_admin` fora de `service_role`/admin.

### P0-3 · IDOR: dados de outros utilizadores
**Confirmado, em quatro sítios** — e encontrei um quinto, mais grave, durante a correção:

| Local | Antes | Agora |
|---|---|---|
| `GET /api/chat/messages` | devolvia mensagens de qualquer conversa | valida dono; 404 se não for dele |
| `POST /api/notebooks/ai-tool` | lia caderno, conversas, mensagens, notas e materiais de qualquer `notebook_id` | valida caderno **e** conversa |
| `GET/POST /api/notebooks/analytics` | idem, por `notebook_id` | valida caderno |
| `POST /api/chat` | aceitava `conversation_id`/`notebook_id` alheios e injetava o histórico dessa pessoa no prompt | valida dono antes de qualquer leitura |
| **`DELETE /api/notebooks`** *(novo)* | apagava materiais, notas e analytics de **qualquer** caderno antes de validar o dono — destruição de dados alheios | valida primeiro; 404 se não for dele |

### P0-4 · Endpoint de diagnóstico público a queimar saldo
**Confirmado.** `/api/system-check-ai` não exigia sessão, expunha `keyPreview` (primeiros e últimos 4 caracteres da chave) e fazia seis inferências pagas por pedido.

**Corrigido**: exige administrador, deixou de expor qualquer fragmento da chave, e fica desativada em produção salvo `ENABLE_SYSTEM_CHECK=true`.

### P0-5 · Custo de IA sem limite e créditos no browser
**Confirmado.** Zero rate limiting em todo o projeto; convidados usavam a API sem conta e os créditos viviam em `localStorage`.

**Corrigido**: limite por utilizador/IP (`src/lib/rate-limit.ts`), quota de convidado em cookie `HttpOnly` assinada com HMAC (`src/lib/guest-quota.ts`) — o browser já não consegue forjar o contador —, validação de upload no servidor (tipo + 4 MB) e consumo de crédito atómico (`consume_credit`), com reembolso automático se a chamada ao modelo falhar.

### P1 · Stripe cobrava e não entregava
**Confirmado.** Não existia webhook nem fulfillment: o `success_url` limitava-se a redirecionar para o dashboard e o plano nunca era ativado. O `STRIPE_WEBHOOK_SECRET` estava no ambiente sem qualquer uso.

**Implementado** `src/app/api/webhooks/stripe/route.ts` com verificação de assinatura HMAC (tolerância de 5 minutos contra replay), idempotência pela PK de `payment_events`, ativação por `service_role` e devolução de 500 para o Stripe repetir em caso de falha. O checkout passou a enviar `metadata[user_id]`/`metadata[plan]` e deixou de apresentar sucesso simulado quando não há chave configurada.

### P1 · Admin impossível de revogar
**Confirmado.** E-mail e dois UUIDs fixos em `middleware.ts`, `admin-auth.ts` e `user/profile/route.ts`, e a variável de ambiente era apenas aditiva — remover um admin do ambiente não o removia da aplicação.

**Corrigido**: `src/lib/admin-config.ts` como única fonte, lida exclusivamente do ambiente, com **falha fechada** (sem configuração, ninguém é administrador). Isto obriga a configurar `ADMIN_USER_ID`/`ADMIN_EMAILS` **antes** do deploy — ver secção 10.

### P1 · Outros endurecimentos
Cabeçalhos de segurança e CSP em `next.config.mjs`; `poweredByHeader: false`; `serverComponentsExternalPackages` para o `pdf-parse` (causa provável de falhas de build anteriores); sanitização das mensagens de erro em 12 pontos que devolviam `error.message` cru ao browser; inserção de logs de erro deixou de aceitar tráfego anónimo.

---

## 3. Páginas e componentes efetivamente redesenhados

**Landing page (`src/app/page.tsx`) — reescrita por completo.** Cabeçalho com navegação e seletor de tema; hero com a mensagem "A prova na sua mão. A resolução na sua frente."; demonstração do formato de resposta (desconstrução → resolução → resposta final) marcada explicitamente como exemplo; três passos; seis recursos que existem de facto; planos lidos de `@/lib/plans`; seis perguntas frequentes factuais; chamada final; rodapé apenas com destinos que existem. Sem números inventados, sem testemunhos, sem métricas fictícias.

**Sistema de design (`globals.css` + `tailwind.config.ts`).** Os tokens estavam partidos: `:root` definia cores em `oklch(...)` e o `tailwind.config` consumia-as como `hsl(var(--token))`, produzindo valores inválidos — o tema claro era literalmente impossível e por isso o `body` estava forçado a `bg-zinc-950`. Substituí por um conjunto coerente de triplas HSL com dois temas, superfícies em níveis, tipografia, raios, sombras discretas, movimento, `prefers-reduced-motion`, foco visível e estado de seleção.

**Temas.** `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`; novo `ThemeToggle` com `role="radiogroup"` e as três preferências reais (`system`/`light`/`dark`), persistidas pelo `next-themes` e sem flash de tema.

**Componentes base.** `button.tsx` e `card.tsx` usavam utilitários que só existem em Tailwind 4 (`gap-(--card-spacing)`, `--spacing(4)`, `ring-3`), que em Tailwind 3 não geram CSS nenhum. Traduzidos para equivalentes válidos, com a API de variantes intacta.

**Preços.** O plano `ultra` (descontinuado) saiu do modal, do filtro e do formulário de administração; `Pro (2.000 Créditos)` corrigido para 20.000; `$10`/`$39` literais substituídos pelos valores da fonte oficial; referências a "Cerebras LLaMA 3.1 70B" substituídas por descrições verdadeiras.

---

## 4. Funcionalidades preservadas

Streaming SSE intacto, com o mesmo contrato (`text/plain` + `X-Conversation-Id`); Markdown e KaTeX inalterados; upload de imagem e PDF mantido (e o ramo de PDF do servidor passou finalmente a extrair texto — antes enviava a string `null` ao modelo); cadernos, materiais, notas, analytics e ferramentas de IA com as mesmas rotas e tabelas; autenticação Supabase, middleware de sessão e ocultação do painel admin; Stripe e comprovativo manual; nenhuma tabela, coluna ou linha foi apagada.

---

## 5. Ficheiros

**Novos (10):** `supabase/migrations/2026-10-28_security_hardening.sql` · `src/lib/http.ts` · `src/lib/rate-limit.ts` · `src/lib/guest-quota.ts` · `src/lib/access.ts` · `src/lib/credits.ts` · `src/lib/plans.ts` · `src/lib/admin-config.ts` · `src/app/api/webhooks/stripe/route.ts` · `src/components/theme-toggle.tsx` · `.env.example`

**Alterados (26):** middleware · `admin-auth` · `plan-config` · rotas `chat`, `chat/messages`, `chat/conversations`, `solve`, `system-check-ai`, `payment-settings`, `checkout/stripe`, `admin/payments`, `user/profile`, `notebooks`, `notebooks/ai-tool`, `notebooks/analytics`, `notebooks/materials`, `notebooks/notes`, `notebooks/move-conversation` · `globals.css` · `layout.tsx` · `page.tsx` · `tailwind.config.ts` · `next.config.mjs` · `ui/button` · `ui/card` · `pricing-modal` · `admin-command-center` · `dashboard` (apenas o toggle de tema).

---

## 6. Migração proposta (não executada)

`supabase/migrations/2026-10-28_security_hardening.sql` é **não destrutiva**: só recria políticas e funções, adiciona `payment_events` e três colunas em `profiles` com `IF NOT EXISTS`. Termina com um bloco `DO` que verifica se o `EXECUTE` de `approve_payment_proof` foi de facto revogado de `anon` e se o trigger está ativo.

**Não a executei.** Não tenho credenciais e alterações de esquema em produção exigem a tua autorização explícita.

---

## 7. Resultados reais das verificações

| Verificação | Comando | Resultado |
|---|---|---|
| TypeScript | `tsc --noEmit -p tsconfig.json` | **0 erros** (após 3 correções minhas: iteração de `Map` sem `downlevelIteration`, `theme()` tipado no config, import não usado) |
| Lint | `next lint` | **0 erros**, 4 avisos pré-existentes de `<img>` em vez de `next/image` |
| CSS | `tailwindcss -c tailwind.config.ts` sobre o novo `globals.css` | **compila**, 129 KB gerados, tokens e utilitários corrigidos presentes na saída |
| Build | `next build` | **não concluído neste ambiente** |

Sobre o build: o processo arranca, imprime `Environments: .env.local` e não avança dentro dos ~3 minutos que o sandbox permite por comando — sem emitir erro de compilação. A explicação mais provável é o `next/font/google` a tentar descarregar Inter e Merriweather sem saída de rede, ou a leitura de `node_modules` sobre o mount do Windows. **Não posso afirmar que o build passa.** Corre `npm run build` na tua máquina ou deixa a Vercel compilar — se falhar, o erro será de compilação e não do meu código, porque `tsc` e `lint` passam.

---

## 8. Testes de segurança realizados

**Estáticos (executados):** confirmação por leitura e `grep` de que (a) `approve_payment_proof` não tem verificação de admin e continua em `PUBLIC`; (b) a política de `profiles` não tem `WITH CHECK`; (c) `/api/system-check-ai` não tinha autenticação; (d) não existia rate limiting; (e) os cinco pontos de IDOR; (f) nenhuma chave ou JWT em código versionado.

**Não executados:** testes dinâmicos contra a base de dados e contra a aplicação (sem credenciais e sem servidor acessível a partir deste ambiente). A prova de exploração descrita para P0-1 continua a ser teórica do meu lado — mas é reproduzível em dois pedidos HTTP assim que a migração não esteja aplicada.

---

## 9. Pendente

**Bloqueante para produção:** aplicar a migração e configurar `ADMIN_USER_ID`/`ADMIN_EMAILS`/`STRIPE_WEBHOOK_SECRET`. Sem o primeiro, os dois P0 de privilégios continuam abertos; sem o segundo, perdes o acesso ao painel.

**Fase 3 — painel do estudante:** dividir as 3.307 linhas do dashboard em módulos (chat, compositor, barra lateral, cadernos, galeria, modais); o painel continua **otimizado para o tema escuro** — o tema claro funciona na landing e nas novas superfícies, mas as telas autenticadas ainda têm cores `zinc` fixas e precisam de migração para tokens. Isto é a maior lacuna de aceitação que resta.

**Fase 4 — cadernos e histórico**, **Fase 5 — login, pricing e painel admin** para a identidade nova.

**Técnico:** imagens e PDFs continuam guardados em base64 dentro do Postgres (deveriam ir para Storage); limite de upload do cliente ainda em 10 MB contra os 4,5 MB da Vercel (o servidor já corta em 4 MB com mensagem clara, mas o cliente devia redimensionar antes de enviar); 75 scripts `fix*.js`/`patch*.js`, 8 backups e 5 PDFs de teste continuam versionados; 13 dependências não usadas; páginas legais (Termos, Privacidade, dados de menores) por criar.

**Decisão de produto:** o prompt de sistema obriga o modelo a negar que foi criado por outra organização e a atribuir a criação ao fundador. Não alterei — é comportamento do produto, não um bug. Recomendo reformular para "produto criado por X, que usa modelos de terceiros": mantém o crédito de autor sem uma afirmação que o utilizador pode verificar como falsa.

---

## 10. Como executar e publicar

**1. Base de dados (obrigatório, antes de tudo)**
Abrir o SQL Editor do Supabase e executar `supabase/migrations/2026-10-28_security_hardening.sql`. No fim, a consola deve mostrar `OK: approve_payment_proof bloqueada para anon` e `OK: trigger de proteção de colunas de faturação ativo`.

**2. Variáveis na Vercel (obrigatório)**

```
ADMIN_USER_ID      <os teus UUIDs, separados por vírgula>
ADMIN_EMAILS       <o teu e-mail>
GUEST_QUOTA_SECRET <string aleatório longo>
NEXT_PUBLIC_SITE_URL https://xam-solver-ai.vercel.app
```

O `ADMIN_EMAILS` tem de ser configurado **antes** do deploy: a autorização passou a falhar fechada, e sem ele o `/admin` devolve 404 para todos, incluindo tu.

**3. Stripe**
Criar endpoint `https://<domínio>/api/webhooks/stripe`, subscrever `checkout.session.completed`, copiar o signing secret para `STRIPE_WEBHOOK_SECRET`.

**4. Local**

```bash
npm install
cp .env.example .env.local   # preencher
npm run build
npm run dev
```

**5. Verificação manual sugerida (10 minutos)**

Depois de publicar: entrar em `/admin` com a tua conta (deve abrir) e com uma conta normal (deve dar 404); gastar as 5 resoluções de convidado e confirmar que a sexta pede conta; resolver uma questão autenticado e verificar que o saldo desceu exatamente 1; tentar `GET /api/chat/messages?conversation_id=<id de outra conta>` e receber 404; fazer um pagamento de teste no Stripe e confirmar que o plano muda sem tocar no dashboard.
