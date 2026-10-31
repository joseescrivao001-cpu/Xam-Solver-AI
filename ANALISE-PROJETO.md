# Análise Técnica — Exam Solver AI

**Data:** 28 de outubro de 2026
**Âmbito:** código-fonte em `exam-solver-ai` (frontend, API, SQL e configuração)
**Método:** leitura do código, `tsc --noEmit` (limpo, sem erros), inspeção das políticas RLS, verificação de dependências instaladas e do histórico Git. Não corri `npm run build` para não mexer na pasta `.next`.

---

## 1. Veredito rápido

> **Nota de revisão (2026-10-28):** duas afirmações desta análise foram verificadas e corrigidas após inspeção do diretório `node_modules`. O pacote `cn` **não** é o problema que descrevi — é o pacote oficial `shadcn-ui/cn`, substituto compilado de `clsx` + `tailwind-merge`. E `@import "shadcn/tailwind.css"` **resolve** corretamente. O problema real de estilo é outro e está identificado na secção 7: utilitários de Tailwind 4 num projeto com Tailwind 3. As secções 4-A e 4-B mantêm-se válidas e foram confirmadas no código.

O projeto está **muito mais completo do que a média** de um TCC ou MVP de estudante: autenticação server-side correta, RLS ativa em todas as tabelas, painel de administração protegido, streaming de IA a funcionar, renderização KaTeX, PDF, OCR, cadernos de estudo e dois canais de pagamento. A arquitetura base é sólida e o produto tem uma proposta de valor real.

O problema é que **a monetização pode ser anulada em três passos, sem escrever uma linha de código de ataque**. Encontrei falhas que permitem a qualquer visitante dar-se plano Premium e 1.000.000 de créditos gratuitamente, ler as conversas de outros utilizadores e usar a tua chave da Cerebras sem limite. Além disso, existe uma quarta inconsistência que te faz **mostrar preços diferentes conforme o site esteja saudável ou degradado**.

A boa notícia: os três riscos críticos de faturação resolvem-se com dois scripts SQL e três guardas de código, num dia de trabalho. O resto é dívida técnica acumulada — 75 scripts de patch na raiz do repositório, 5 fontes de verdade contraditórias para preços e um ficheiro de 3.307 linhas que concentra toda a aplicação.

Prioridade, por ordem de impacto financeiro e de risco: **fechar a auto-promoção de plano → fechar os IDOR → limitar o custo da IA → pôr o Stripe a entregar o que vende.**

---

## 2. Retrato do projeto

| Dimensão | Valor |
|---|---|
| Ficheiros TS/TSX em `src/` | 56 |
| Linhas de código em `src/` | 9.932 |
| Rotas de API (`route.ts`) | 22 |
| Páginas | 8 |
| Dependências de produção | 36 (13 não usadas) |
| Scripts `fix*.js` / `patch*.js` na raiz | 75 |
| Ficheiros de backup e PDFs de teste na raiz | 13 |

**Stack:** Next.js 14.2.35 (App Router), React 18.3, TypeScript strict, Tailwind 3.4, shadcn/ui + Base UI, framer-motion, react-markdown + KaTeX, Zustand (quase inerte). Backend: Supabase (Auth + Postgres + RLS). IA: chamadas diretas por `fetch` à Cerebras (`gpt-oss-120b` para texto, `qwen-3.8-27b` para visão), com streaming SSE tratado manualmente. Pagamentos: Stripe Checkout e comprovativo manual por transferência (MCX).

**Concentração de código:** `src/app/dashboard/page.tsx` tem 3.307 linhas num único componente, com 30 `useState`, 7 `useEffect`, zero `useCallback`/`useMemo` e 12 acessos a `localStorage`. Segue-se `admin-command-center.tsx` com 1.087 linhas e `pricing-modal.tsx` com 662. Ou seja, **33% de todo o código do projeto está em três ficheiros de interface**.

O fluxo principal é: o aluno fotografa a prova → o cliente converte PDF em JPEG com pdf.js → `POST /api/chat` → verificação de sessão e créditos → prompt de sistema longo em português → Cerebras em streaming → resposta em Markdown com KaTeX → gravação em `messages` e desconto de 1 crédito no fecho do stream.

---

## 3. O que está bem feito

Vale a pena reconhecer isto antes das críticas, porque várias decisões aqui são melhores do que as que vejo em projetos profissionais:

**Autenticação e sessão.** O uso de `@supabase/ssr` com `createServerClient` e o middleware a refrescar o token está feito como a documentação manda. Não há token em `localStorage`, não há chave de serviço a chegar ao browser.

**Defesa em profundidade no admin.** `verifyAdmin()` valida sessão, depois UUID/e-mail, depois `is_admin` e `is_banned` na base de dados, e devolve 404 em vez de 403 para não revelar a existência das rotas. Isto é uma prática acima da média.

**Segredos.** Confirmei que `.env.local` está no `.gitignore` e que **nunca foi commitado** (verifiquei o histórico completo de `.env`). Não há chaves, JWTs nem `sk-` escritos em código versionado.

**Renderização de Markdown segura.** O `SafeMarkdown` usa `react-markdown` sem `dangerouslySetInnerHTML`, o que significa que HTML injetado pelo modelo não executa. Muitos projetos usam `rehype-raw` e abrem aqui um XSS. Não é o caso.

**Streaming.** O parser SSE acumula fragmentos num buffer e descarta linhas incompletas — a forma correta de ler `text/event-stream`, em vez de fazer `JSON.parse` a cada chunk e rebentar a meio de uma palavra.

**Engenharia de prompt.** O prompt de sistema é notavelmente cuidado: exige transcrição literal dos dados, autocorreção, validação de unidades, e instrui explicitamente a **não inventar dados** quando a informação é insuficiente. O tratamento de "dados insuficientes" é a defesa mais eficaz contra alucinação neste tipo de produto.

**RLS.** Todas as tabelas têm Row Level Security ativa com políticas por `user_id`, e a escalada de `is_admin` está bloqueada por trigger. O problema (ver secção 4) é que a política de `UPDATE` é larga demais e que essas políticas são contornadas em todo o lado pelo cliente `service_role`.

---

## 4. Segurança e faturação — riscos críticos

### P0-1. Qualquer pessoa se pode dar Premium e 1.000.000 de créditos (bypass total de pagamento)

`supabase_payment_settings.sql`, linha 43:

```sql
CREATE OR REPLACE FUNCTION public.approve_payment_proof(proof_id UUID)
RETURNS void AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;
```

A função é `SECURITY DEFINER` (corre com privilégios de owner), **não verifica se quem chama é administrador** e, em Postgres, funções novas recebem `EXECUTE` para `PUBLIC` por omissão. Está exposta pelo PostgREST em `/rest/v1/rpc/approve_payment_proof`.

O caminho completo, sem autenticação especial e sem conhecimento técnico:

1. `POST /api/checkout/mcx` com `proof_base64` inventado (um print qualquer). A rota devolve `proof_id`.
2. `POST /rest/v1/rpc/approve_payment_proof` com esse `proof_id`, usando a chave anónima pública que já está no bundle do browser.
3. O perfil fica `plan_type = 'premium'` e `credits_balance = 999999`. IA ilimitada para sempre.

Existe uma segunda cópia da mesma lógica em `admin/payments/route.ts`, que dá 999.999.999 créditos no plano premium — ou seja, mesmo o caminho legítimo não bate certo com a função SQL.

### P0-2. A política RLS de `profiles` permite auto-promoção direta

`supabase_admin.sql`, linha 60:

```sql
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );
```

Sem `WITH CHECK` e sem restrição de colunas. O trigger `protect_is_admin_escalation` protege **apenas** `is_admin`. Portanto qualquer utilizador autenticado pode, a partir da consola do browser:

```js
await supabase.from('profiles')
  .update({ plan_type: 'premium', credits_balance: 999999 })
  .eq('id', meu_id)
```

Isto não exige sequer o passo do comprovativo. Também pode pôr `is_banned = false` em si próprio.

### P0-3. IDOR: leitura de conversas e cadernos de outros utilizadores

Todo o código de dados usa `const db = serviceClient || supabase`, e o cliente `service_role` **ignora RLS**. Onde o filtro por dono não foi escrito à mão, o isolamento desaparece:

| Rota | Problema | Impacto |
|---|---|---|
| `GET /api/chat/messages?conversation_id=` | Devolve `messages` filtrado só por `conversation_id` | Ler qualquer conversa de qualquer aluno |
| `POST /api/notebooks/ai-tool` | Carrega `notebooks`, `conversations`, `messages`, `notes`, `materials` só por `notebook_id` | Ler o caderno inteiro de outro aluno, e escrever mensagens dentro das conversas dele |
| `GET/POST /api/notebooks/analytics` | Idem, por `notebook_id` | Ler histórico e materiais de terceiros |
| `POST /api/chat` com `notebook_id` ou `conversation_id` alheios | Contexto do caderno e histórico da conversa entram no prompt e são gravados | Exfiltração de dados de outro utilizador através da resposta do modelo |

O caso do `/api/chat` é o mais grave: o histórico de outra pessoa entra no prompt e sai na resposta. É exploração de dados pessoais de menores, com implicações sérias.

Comparação: `notebooks/route.ts`, `notes/route.ts` e `move-conversation/route.ts` **têm** `.eq("user_id", user.id)` — a correção é mecânica e copiável.

### P0-4. `/api/system-check-ai` é público e revela parte da chave

`src/app/api/system-check-ai/route.ts` não tem autenticação. Devolve:

```json
"envKeys": { "detected": true, "variable": "CEREBRAS_API_KEY", "keyPreview": "csk_...9f2a" }
```

E, por cada pedido, faz **seis chamadas pagas** à Cerebras (`LOCKED_MODELS`, cada uma com uma inferência). Qualquer pessoa pode fazer um loop a este endpoint para queimar o teu saldo e confirmar o prefixo e sufixo da chave. É simultaneamente um oráculo de chave e uma negação de serviço com custo.

Há ainda a página `system-check` e `system-check-ai` em produção, que deviam ser de desenvolvimento.

### P0-5. Sem qualquer limitação de uso, e convidados usam a API sem login

Não existe rate limiting em nenhuma rota (`grep` por `rateLimit|upstash|429` → zero resultados). E `POST /api/chat` aceita utilizadores não autenticados (`isGuest`), com os créditos pagos a viver no `localStorage` do browser:

```js
// dashboard/page.tsx, linha 1418
if (!user) localStorage.setItem("guestCredits", newVal.toString());
```

Basta `localStorage.setItem("guestCredits", "999999")` para uso ilimitado. Combinado com P0-4, o custo da Cerebras está aberto a qualquer visitante. Para um app de exames, isto é também um vetor de abuso de conta: um professor não precisa de conta para extrair tudo.

### P1 — Riscos altos, não críticos

**Stripe cobra e não entrega.** `checkout/stripe/route.ts` cria a sessão e o `success_url` aponta para `/dashboard?upgrade=success&plan=...`, mas **não existe webhook nem fulfillment**: nenhum endpoint valida o pagamento e ativa o plano. O `STRIPE_WEBHOOK_SECRET` está no `.env.local` e não é usado em lado nenhum. Resultado: um utilizador paga com cartão, volta ao dashboard, e fica com o plano Free. Confirmei que o dashboard **não** promove ninguém pelo URL (bom), portanto não há o contrário — simplesmente o pagamento nunca tem efeito.

**Admin impossível de revogar.** `joseescrivao001@gmail.com` e dois UUIDs estão fixos em `middleware.ts`, `admin-auth.ts` e `user/profile/route.ts`. Além disso, a lógica do `ADMIN_USER_ID` é **aditiva**: o código acrescenta sempre os UUIDs mestre à lista permitida, mesmo quando a variável de ambiente está definida. Ou seja, tirar um admin do `.env` não o remove; só mudando o código.

**Fuga de mensagens de erro.** Em `/api/solve` e `/api/chat`, os `catch` devolvem `error.message` cru ao cliente (erros do Supabase, do Postgres, caminhos internos).

**Sem cabeçalhos de segurança.** `next.config.mjs` está vazio: sem CSP, sem `X-Frame-Options` (o app é emoldura­vel — clickjacking), sem `Referrer-Policy`. E `pdf-renderer.ts` carrega `pdf.min.js` do cdnjs **sem `integrity`/SRI**, com versão 3.11.174 fixa e dependência de um CDN externo no caminho crítico.

**Open redirect no callback.** `/auth/callback` aceita `?next=` arbitrário e confia em `x-forwarded-host`, construindo `https://${forwardedHost}${next}`. Em deployments com proxy mal configurado isto é um redirecionamento para domínio de atacante.

**Logs poluíveis.** A política de `api_error_logs` permite `INSERT ... WITH CHECK (true)` a qualquer utilizador — dá para inundar a tabela (custo de storage) e intoxicar a tua auditoria.

---

## 5. Bugs e riscos técnicos

**O caminho de PDF do servidor está morto e envia `null`.** Em `api/chat/route.ts`, `pdfExtractedText` é declarado (linha 168) e usado (linha 278) mas **nunca é atribuído**. Se um PDF chegar à API por qualquer via que não o cliente (scripts, integrações, chamada direta), o modelo recebe literalmente `[CONTEÚDO DO PDF EXTRAÍDO]:\n\nnull`. O código está a funcionar em produção por acidente: o browser converte o PDF em JPEG antes de enviar, e o ramo `isPdf` nunca é exercitado.

**Desconto de créditos não atómico.** O código lê `profile.credits_balance` no início do pedido e grava `Math.max(0, balance - 1)` dentro do `flush()` do stream. Duas consequências: dois pedidos em paralelo podem ambos gravar o mesmo resultado (perdes créditos devidos), e se o cliente desligar a meio do stream o `flush` pode não correr (não cobras nada). Deve ser uma função SQL atómica (`credits_balance = credits_balance - 1 WHERE credits_balance > 0`).

**Limite de upload incompatível com a Vercel.** O cliente aceita até 10 MB (`dashboard/page.tsx:450`), mas o limite de corpo de pedido das funções serverless da Vercel é 4,5 MB. Uma fotografia de telemóvel moderna (4–8 MB) passa na validação e falha na plataforma com 413 — e como vai em `multipart/form-data`, nem sequer há mensagem de erro decente. Não há redimensionamento no cliente antes do envio. Para um produto cujo caso de uso principal é "fotografar a prova", este é provavelmente o bug que mais utilizadores perde na prática.

**Imagens em base64 na base de dados.** `messages.image_url` e `notebook_materials.file_url` guardam data-URLs completos (o segundo até converte PDFs em JPEG de 4 páginas). A base cresce em dezenas de MB por utilizador, e `GET /api/chat/messages` devolve tudo — a conversa fica lenta e caro de servir. O correto é Supabase Storage com URLs assinados.

**Texto corrompido no repositório.** 25 caracteres `U+FFFD` (perda irreversível de codificação) em 5 ficheiros:

```
api/notebooks/materials/route.ts    → "OCR VIS�O AVAN�ADA", prompt de OCR com "Voc� � um extrator..."
api/payment-settings/route.ts       → "22.000 Cr�ditos", "100.000 Cr�ditos"
api/admin/stats/route.ts            → "Raciocínio R�pido", "Matem�tica Complexa"
app/pricing/page.tsx
components/admin/admin-command-center.tsx
```

O último commit diz "clean utf-8 corruption", mas a corrupção continua lá — só foram limpos os ficheiros que estavam a dar 500. O prompt de OCR vai chegar ao modelo com caracteres inválidos.

**`resolveModelId` duplicado e divergente.** Existe em `lib/models.ts` (ignora o parâmetro, devolve sempre `gpt-oss-120b` exceto se contiver "vision/qwen/opus") e outra versão no `api/chat/route.ts` com o dobro da lógica. Duas funções com o mesmo nome, comportamento diferente, a decidir que modelo o utilizador recebe.

**`/api/solve` é código morto mas público.** Nenhum ficheiro em `src/` chama esta rota, e ela continua exposta, com a sua própria lógica de créditos, modos e API key.

**`pdf-parse` sem `serverComponentsExternalPackages`.** `next.config.mjs` está vazio e o `pdf-parse` é carregado com `require()` dentro de uma rota Node. Este pacote é conhecido por quebrar no build da Vercel (o famoso `ENOENT .../test/data/05-versions-space.pdf`). Os ficheiros `apply_pdf_fixes.js` e `fixRequires.js` na raiz sugerem que já perdeste tempo com isto.

**Middleware a correr em tudo.** O `matcher` exclui só imagens e `_next`, portanto `/api/*` também passa pelo middleware, e cada pedido faz `supabase.auth.getUser()` (uma chamada de rede) antes de a rota fazer a mesma chamada outra vez. Latência duplicada em cada pedido de IA.

**`notebooks/analytics` e `ai-tool` não descontam créditos.** São funcionalidades de IA completas (resumos, exercícios, quiz, análise de erros) e são gratuitas mesmo para o plano Free, sem sequer contabilização.

---

## 6. Preços e créditos: cinco fontes de verdade contraditórias

Este é o problema de produto mais caro depois da segurança, porque afeta a confiança e a receita de forma visível.

| Fonte | Pro | Premium | Créditos Pro | Créditos Premium |
|---|---|---|---|---|
| `lib/plan-config.ts` (PLANS) | $5 | $10 | 20.000 | 1.000.000 |
| `api/payment-settings` (caminho normal) | $5 | $39 | 22.000 | Ilimitado |
| `api/payment-settings` (fallback de erro) | **$10** | $39 | 22.000 | Ilimitado |
| `components/pricing-modal.tsx` | **$10** | **$39** | — | — |
| `admin/payments/route.ts` (aprovar) | plano `pro` | plano `premium` | +2.000 | 999.999.999 |
| `supabase_payment_settings.sql` (aprovar) | plano `pro` | plano `premium` | 1.000 | 999.999 |
| `app/pricing/page.tsx` (fallback) | 4.750 Kz | 9.500 Kz | 50 iniciais | — |

Repara no detalhe mais perigoso: dentro do **mesmo ficheiro** (`api/payment-settings/route.ts`), o preço do Pro é `5` USD no caminho normal (linha 46) e `10` USD no fallback de erro (linha 90). Basta a API de câmbio falhar para o site passar a mostrar o dobro do preço. E existe um plano `ultra` na API e na base de dados que não existe em `PLANS` nem no checkout.

Um cliente que veja a landing page, o modal de pricing e o comprovativo vai encontrar três preços diferentes para o mesmo plano.

---

## 7. Dívida técnica e organização do repositório

A raiz do projeto tem 75 scripts `fix*.js` e `patch*.js`, 8 ficheiros de backup (`api_backup.ts`, `page_backup.tsx`, `page_backup2.tsx`, `dashboard_backup3/4/5.tsx`, `refactor.js`) e 5 PDFs de teste (`test_corrupted.pdf`, `real_test.pdf`, …). **Todos estão versionados no Git.** Isto não é apenas estética:

- O `tsconfig.json` inclui `"**/*.ts"` e `"**/*.tsx"`, portanto os `*_backup*.tsx` são **type-checked no build** — dois deles são cópias de 3.000 linhas do dashboard. Um erro num ficheiro que já não usas quebra o deploy.
- Cada `git status` mostra dezenas de ficheiros modificados, o que torna impossível ver o que realmente mudou.
- O histórico de commits (`fix(core)`, `fix: Type error res.body is possibly null`, `chore: force redeploy`) descreve sintomas, não intenções — e não existe **um único teste automatizado** no projeto.

**Dependências não usadas (13):** `ai`, `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/groq`, `@openrouter/ai-sdk-provider`, `@google/generative-ai`, `pdf-parse-new`, `pdfjs-dist`, `react-speech-recognition`, `@radix-ui/react-dialog`, `tw-animate-css`, `regenerator-runtime`, `uuid`. Há duas stacks de IA instaladas (Vercel AI SDK completa + chamadas manuais à Cerebras) e só uma é usada. `shadcn` (uma CLI) e `@types/uuid` estão em `dependencies` em vez de `devDependencies`.

**Sobreposição de estilos: Tailwind 3 com utilitários de Tailwind 4.** O projeto corre Tailwind 3.4, mas `globals.css` importa `shadcn/tailwind.css` (sintaxe v4: `@theme`, `@custom-variant`) e os componentes base usam utilitários que só existem em v4 — `gap-(--card-spacing)`, `--spacing(4)`, `ring-3`, `in-data-[...]`. Em v3 essas classes não geram CSS, pelo que espaçamentos e anéis simplesmente não se aplicam. É metade da explicação para o espaçamento irregular das interfaces.

**Zustand quase inerte.** `chat-store.ts` tem 29 linhas e um consumidor; todo o estado real vive em 30 `useState` no dashboard.

---

## 8. Produto: onde estão as oportunidades

**O posicionamento é forte.** "Fotografa a prova, recebe a resolução passo a passo em português, com fórmulas bem formatadas" resolve uma dor real e específica de estudantes de STEM em Angola e no Brasil, onde o acesso a explicações é caro ou inexistente. O prompt de sistema, quando funciona, entrega uma experiência que poucos concorrentes dão em português.

**O fluxo de convidado é a decisão de produto mais inteligente do projeto** — 5 créditos sem registo é a forma certa de converter curiosos. Só precisa de ser servido no servidor, não no `localStorage`.

**O que hoje trava a conversão:** o pagamento com cartão não entrega o plano; o preço muda conforme o estado do servidor; as fotografias grandes falham com 413; e o uso gratuito ilimitado remove a razão para pagar.

**Risco reputacional no prompt de identidade.** O prompt obriga o modelo a negar que foi criado por OpenAI/Anthropic/Cerebras e a afirmar que "teve a honra de ser criado por José Escrivão Silvestre". Recomendo reformular para algo verdadeiro e igualmente forte: *"O Exam Solver AI é um produto criado por José Escrivão Silvestre, que usa modelos de linguagem de terceiros por baixo."* Mantéms o crédito de autor do produto, sem alegar autoria do modelo — que é verificável como falso pelo utilizador e contraria os termos de uso dos fornecedores.

**Falta o essencial de confiança:** não há Termos de Serviço, Política de Privacidade, nem política de dados para menores — e este produto processa fotografias de provas e dados de estudantes, muitos deles adolescentes. Para Angola, isto é também relevante à luz da Lei de Proteção de Dados.

**Inconsistência de variante de português:** o prompt força "Português Brasileiro" e a UI usa "utilizador", "faça upgrade", "palavra-passe" (PT-PT). Escolhe uma variante e sê consistente.

**Duas páginas de diagnóstico em produção** (`/system-check`, `/system-check-ai`) — além do risco de segurança já descrito, não passam credibilidade a um utilizador.

---

## 9. Plano de ação priorizado

### P0 — hoje (≈4 a 6 horas)

1. **Fechar `approve_payment_proof`**: adicionar verificação de admin dentro da função e `REVOKE EXECUTE FROM PUBLIC, anon`. Script pronto no Anexo A.
2. **Restringir a política de `profiles`**: `UPDATE` só em colunas de perfil, nunca em `plan_type`/`credits_balance`/`is_banned`. Anexo B.
3. **Adicionar filtro de dono** em `chat/messages`, `notebooks/ai-tool`, `notebooks/analytics` e validar `conversation_id`/`notebook_id` em `api/chat` antes de os usar.
4. **Proteger ou apagar** `/api/system-check-ai` (e as páginas `system-check*`) e apagar a rota morta `/api/solve`.

### P1 — esta semana (≈2 a 3 dias)

5. **Webhook do Stripe** com verificação de assinatura (`STRIPE_WEBHOOK_SECRET` já existe) que ativa o plano no servidor. Sem isto, não aceites cartões.
6. **Rate limiting** por utilizador e por IP nas rotas de IA (Upstash Redis ou tabela de contadores no Supabase), e servir os créditos de convidado a partir do servidor.
7. **Desconto de crédito atómico** via função SQL, movido para fora do `flush()` do stream.
8. **Unificar preços e créditos** numa única fonte (`plan-config.ts` + tabela `plans`), incluindo decidir se `ultra` existe ou não. Corrigir o modal, a página de pricing, o fallback da API e as duas rotas de aprovação.
9. **Corrigir o upload**: redimensionar/comprimir no cliente para ≤2 MB antes de enviar, e alinhar o limite da UI com os 4,5 MB da Vercel.
10. **Corrigir a corrupção UTF-8** dos 5 ficheiros e o `pdfExtractedText` do `/api/chat`.
11. **Remover os UUIDs e o e-mail de admin do código**, passando a ler só do ambiente (com falha fechada se não estiver definido).
12. **Cabeçalhos de segurança** e SRI no pdf.js.

### P2 — próximas 2 a 3 semanas

13. **Mover imagens para Supabase Storage** com URLs assinados, e limpar a base do que já está em base64.
14. **Dividir `dashboard/page.tsx`** em componentes por domínio (chat, composer, sidebar, notebooks, galeria, modais) e extrair a lógica para hooks e para o store Zustand.
15. **Limpar o repositório**: apagar os 75 scripts, os 8 backups e os 5 PDFs de teste; restringir o `tsconfig` a `src/` e `app/`; remover as 13 dependências não usadas; trocar `cn` por `clsx` + `tailwind-merge`.
16. **Introduzir testes**: pelo menos unitários nas regras de planos/créditos e um teste de integração por rota crítica (auth, chat, aprovação de pagamento).
17. **Páginas legais** (Termos, Privacidade, dados de menores) e escolha definitiva de variante de português.
18. **Reposicionar a mensagem de identidade** do assistente.

---

## Anexo A — Correção de `approve_payment_proof`

```sql
CREATE OR REPLACE FUNCTION public.approve_payment_proof(proof_id UUID)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_plan    TEXT;
  v_credits INT;
BEGIN
  -- Só administradores, ou o backend com service_role
  IF NOT (
    public.is_current_user_admin()
    OR current_setting('role', true) = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT user_id, plan_type INTO v_user_id, v_plan
  FROM public.payment_proofs WHERE id = proof_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Comprovativo inexistente';
  END IF;

  v_credits := CASE v_plan
                 WHEN 'ultra'   THEN 1000000
                 WHEN 'premium' THEN 999999
                 ELSE 1000
               END;

  UPDATE public.profiles
     SET plan_type = v_plan,
         credits_balance = credits_balance + v_credits
   WHERE id = v_user_id;

  UPDATE public.payment_proofs
     SET status = 'approved', updated_at = now()
   WHERE id = proof_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.approve_payment_proof(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_payment_proof(UUID) TO authenticated, service_role;
```

## Anexo B — Política de `profiles` sem auto-promoção

```sql
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

-- O utilizador só pode alterar o próprio perfil, e nunca campos de dinheiro/estado
CREATE POLICY "Users can update own profile fields."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id )
  WITH CHECK ( auth.uid() = id );

-- Bloqueio por coluna (a RLS não distingue colunas; o trigger sim)
CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.credits_balance IS DISTINCT FROM OLD.credits_balance
     OR NEW.plan_type     IS DISTINCT FROM OLD.plan_type
     OR NEW.is_banned     IS DISTINCT FROM OLD.is_banned THEN
    IF current_setting('role', true) NOT IN ('service_role','postgres','supabase_admin')
       AND NOT public.is_current_user_admin() THEN
      RAISE EXCEPTION 'Campos de faturação são protegidos.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_billing ON public.profiles;
CREATE TRIGGER trg_protect_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_billing_columns();
```

## Anexo C — Crédito atómico

```sql
CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE v_ok BOOLEAN;
BEGIN
  UPDATE public.profiles
     SET credits_balance = credits_balance - 1
   WHERE id = p_user_id
     AND plan_type <> 'premium'
     AND credits_balance > 0
  RETURNING TRUE INTO v_ok;

  IF v_ok THEN RETURN TRUE; END IF;

  -- Premium não consome créditos
  RETURN EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = p_user_id AND plan_type = 'premium');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Anexo D — Ordem de leitura sugerida

Se quiseres revisitar o código por ordem de risco: `supabase_payment_settings.sql` (P0-1) → `supabase_admin.sql` (P0-2) → `src/app/api/chat/messages/route.ts` e `src/app/api/notebooks/ai-tool/route.ts` (P0-3) → `src/app/api/system-check-ai/route.ts` (P0-4) → `src/app/api/chat/route.ts` (créditos, contexto, PDF) → `src/app/api/payment-settings/route.ts` (preços).
