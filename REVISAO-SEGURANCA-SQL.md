# Revisão de Segurança da Migração — Round 2

**Data:** 28 de outubro de 2026
**Objeto:** `supabase/migrations/2026-10-28_security_hardening.sql` (v1 → v2)
**Estado:** migração corrigida, executada e testada num PostgreSQL 16.2 descartável. **Nada foi aplicado ao Supabase real.**

---

## 1. O erro mais grave era meu, e o ponto 1 estava certo

A v1 autorizava assim, dentro de `approve_payment_proof()` e de `protect_billing_columns()`:

```sql
OR CURRENT_USER IN ('postgres', 'supabase_admin')
```

Dentro de uma função `SECURITY DEFINER`, `CURRENT_USER` é o **proprietário** da função — `postgres` — e não o chamador. A condição era, portanto, **sempre verdadeira**. A v1 não fechava nenhuma das duas falhas críticas: `anon` continuava a poder aprovar o próprio comprovativo e qualquer utilizador continuava a poder escrever `plan_type` e `credits_balance`.

Confirmei-o antes de reescrever (`grep` no ficheiro real, linhas 34 e 95 da v1). Se a v1 tivesse ido para produção, teria dado a falsa segurança de uma migração de hardening aplicada com sucesso, e o relatório dizia "P0 corrigido".

---

## 2. O que mudou, ponto por ponto

### 2.1 · Autorização dentro de funções `SECURITY DEFINER` (pontos 1 e 5)

Substituí toda a autorização por uma função única, `public.is_trusted_writer()`, que lê **apenas** fontes que não dependem do contexto de execução:

| Contexto | Como é identificado | Resultado |
|---|---|---|
| `service_role` | `request.jwt.claims->>'role'` (GUC do PostgREST) | confiável |
| Administrador autenticado | `claims->>'sub'` + `profiles.is_admin` + não banido | confiável |
| `anon` / utilizador comum | mesmos claims | recusado |
| Sessão direta de administração | `session_user` com `rolsuper`/`rolbypassrls`, ou `postgres`/`supabase_admin` | confiável |
| Sessão direta sem privilégios | `session_user` comum | recusado |

`session_user` (papel de login) não é alterado por `SECURITY DEFINER` e não pode ser escolhido por um pedido HTTP — o PostgREST liga-se sempre como `authenticator`. `CURRENT_USER` não aparece em nenhuma linha de código (só em comentários que explicam o defeito; há um teste que verifica isso com `\bCURRENT_USER\b`, para não colidir com o nome `is_current_user_admin`).

A função passou a `SECURITY DEFINER` por uma razão concreta que os testes revelaram: sendo `INVOKER`, a consulta a `profiles` sofria a RLS dessa tabela e entrava em **recursão infinita** (`infinite recursion detected in policy for relation "profiles"`). Agora lê `profiles` sem RLS, mas a decisão continua a depender só de JWT e `session_user`.

**Permissões (ponto 5):**

| Função | anon | authenticated | service_role | sessão direta |
|---|---|---|---|---|
| `approve_payment_proof` | ✗ | ✗ | ✓ | ✓ |
| `consume_credit` / `refund_credit` | ✗ | ✗ | ✓ | ✓ |
| `is_current_user_admin` | ✓ | ✓ | ✓ | ✓ |
| `is_trusted_writer` | ✓ | ✓ | ✓ | ✓ |
| `protect_billing_columns` (trigger) | ✗ | ✗ | ✗ | — |

A distinção entre permissão de execução e autorização interna está testada em separado: `T35` prova que nem um administrador autenticado executa a RPC (a rota do painel usa `service_role`), e `T35b` prova que esse mesmo administrador, via API de tabela, consegue alterar colunas de faturação de terceiros.

### 2.2 · Aprovação repetida (ponto 2)

`approve_payment_proof` passou a:

1. `SELECT ... FOR UPDATE` sobre o comprovativo — bloqueia a linha, pelo que duas chamadas concorrentes serializam;
2. exige `status = 'pending'`; qualquer outro estado (`approved`, `rejected`, `processing`) **lança exceção**;
3. valida o plano no catálogo **antes** de escrever;
4. só então atualiza o perfil e o comprovativo, na mesma transação;
5. confirma que o perfil existe (`ROW_COUNT`), senão reverte tudo.

Devolve os créditos concedidos (0 para ilimitados), o que dá ao chamador confirmação explícita em vez de silêncio.

Testes: `T22` (repetição → `P0001`), `T23` (saldo inalterado), `T24` (rejeitado não reabre), `T26`/`T29` (estado e créditos intactos quando algo falha a meio).

### 2.3 · Planos e créditos (ponto 3)

Criei `public.plan_catalog` como fonte de verdade do lado do SQL, semeada com os valores de `src/lib/plans.ts`:

| Plano | Créditos | Ilimitado | Preço |
|---|---|---|---|
| `free` | 50 | não | $0 |
| `pro` | 20 000 | não | $5 |
| `premium` | 1 000 000 | sim | $10 |

`ultra` **não é reintroduzido**: sai do catálogo (`DELETE ... WHERE plan_id NOT IN ('free','pro','premium')`) e um comprovativo com esse plano é recusado. Perfis antigos com `plan_type='ultra'` são lidos como `premium` por `normalize_plan_id()`, sem alterar os dados.

Desapareceram os valores fictícios que existiam em três sítios diferentes: `250 / 9999 / 50` (supabase_monetization.sql), `1000 / 1000000 / 999999` (v1) e `2000 / 10000 / 999999999` (rota admin). Plano `free` num comprovativo é recusado — e alinhei a rota `admin/payments` com a mesma regra.

### 2.4 · `protect_billing_columns` (ponto 4)

Reescrito para usar `is_trusted_writer()`. Bloqueia as quatro colunas — `plan_type`, `credits_balance`, `is_banned`, `is_admin` — na mesma expressão, o que impede o contorno por `UPDATE` em lote. Testado por seis caminhos diferentes (`T06`–`T10`), incluindo um `UPDATE ... WHERE id IN (próprio, alheio)` que tenta passar as duas linhas ao mesmo tempo.

Também substituí a política de `profiles` (agora com `WITH CHECK`) e o trigger antigo `trg_protect_is_admin_escalation`, que era ele próprio vulnerável ao mesmo erro de `CURRENT_USER` — foi removido, não ficou a coexistir.

### 2.5 · `search_path` e idempotência (ponto 6)

Todas as funções têm `SET search_path = public, pg_temp` e chamadas qualificadas (`public.`, `pg_catalog.`). Cada `CREATE POLICY` tem o `DROP POLICY IF EXISTS` correspondente, cada `ADD COLUMN` tem `IF NOT EXISTS`, e a migração foi **executada duas vezes seguidas** no mesmo banco sem erro (passo 3/4 do runner). A verificação final no próprio SQL avisa se alguma função `SECURITY DEFINER` ficar sem `search_path`.

### 2.6 · Sintaxe, escapes e dependências (ponto 7)

Não inspecionei o ficheiro a olho: **executei-o**. PostgreSQL 16.2, duas vezes, seguido de 45 asserções. Não há `$$` desemparelhados, aspas tipográficas, nem referência a função/tabela inexistente — o próprio Postgres teria falhado nos passos 2/4 e 3/4.

Corrigi ainda uma inconsistência de ordem que teria falhado em produção: a política de `plan_catalog` usava `is_current_user_admin()` antes de essa função existir no ficheiro.

### 2.7 · Políticas RLS adicionais fechadas

Três buracos que encontrei nesta revisão e que a v1 não tocava:

- **`payment_proofs` INSERT:** o utilizador podia criar o comprovativo já com `status = 'approved'`. Agora `WITH CHECK (... AND status = 'pending')`.
- **`conversations` UPDATE:** `USING` sem `WITH CHECK` permitia reatribuir a conversa a outro `user_id`. Corrigido.
- **`api_error_logs` INSERT:** `WITH CHECK (true)` deixava qualquer pessoa (incluindo `anon`) escrever na tabela. Agora só `authenticated`, e só com o próprio `user_id`.

---

## 3. Testes executados

### 3.1 · Automatizados contra PostgreSQL real — **45/45 PASS**

`python3 supabase/tests/run_local_tests.py` (ou `npm run test:db`)

Cria um Postgres 16.2 num diretório temporário, aplica um stub que emula o Supabase (papéis `anon`/`authenticated`/`service_role`, schema `auth`, `auth.uid()` a ler `request.jwt.claims`, tabelas e políticas originais), aplica a migração **duas vezes**, e corre a suíte. Termina com `ROLLBACK`: não fica nada.

Cobertura dos requisitos do ponto 8:

| Requisito | Testes | Resultado |
|---|---|---|
| Utilizador não promove a própria conta | `T06`–`T10` | PASSA — `42501` em `plan_type`, `credits_balance`, `is_admin`, `is_banned` e em `UPDATE` em lote |
| Utilizador não lê dados de terceiros | `T12`, `T16`–`T18` | PASSA — 1 conversa, 1 mensagem, 1 perfil visíveis; perfil alheio devolve `NULL` |
| Não-admin não aprova comprovativos | `T01`, `T05` | PASSA — `anon` e `authenticated` recebem `42501` |
| Aprovação repetida não credita de novo | `T22`, `T23` | PASSA — `P0001` e saldo inalterado em 20 050 |
| Fluxo legítimo de pagamento continua a funcionar | `T20`, `T21`, `T33b`, `T33c` | PASSA — pro +20 000, premium 1 000 000, e o `UPDATE` direto do backend (webhook/admin) não é bloqueado |
| Consumo de créditos continua a funcionar | `T31`–`T33` | PASSA — 3→0, 4.º recusado, reembolso repõe, premium não desconta |
| Sessão direta (SQL Editor) continua a aprovar | `T36`, `T37` | PASSA |
| Sessão direta sem privilégios não é confiável | `T42` | PASSA |
| Migração idempotente | passo 3/4 do runner | PASSA — duas execuções seguidas |
| Atomicidade em falha | `T26`, `T29` | PASSA — comprovativo continua `pending`, nada concedido |

### 3.2 · Verificações estáticas — **22/22 PASS**

`node --test tests/security/static-guards.test.mjs` (ou `npm run test:security`)

Lêem o código real e falham se uma proteção desaparecer: ordem das guardas de propriedade nas cinco rotas, `CURRENT_USER` ausente do SQL, `search_path` em todas as `SECURITY DEFINER`, permissões mínimas, ausência de UUIDs/e-mails de admin no código, ausência de `error.message` devolvido ao cliente, `status='pending'` no insert de comprovativos, catálogo SQL a coincidir com `plans.ts`, idempotência, e ausência de `DROP TABLE`/`TRUNCATE`/`DELETE` sobre dados de utilizador.

O teste do catálogo é o que impede a divergência que existia antes: se alguém mudar um preço em `plans.ts` sem mudar o SQL (ou vice-versa), a suíte falha.

### 3.3 · Outras verificações

`tsc --noEmit`: 0 erros. `next lint`: 0 erros, 4 avisos pré-existentes de `<img>`.

---

## 4. Riscos que permanecem

**Dependem do Supabase real (não validados por mim):**

1. **`auth.uid()` real vs. o meu stub.** O stub reproduz a implementação documentada (claim `sub`), mas não é o código do Supabase. Se a implementação deles divergir, `is_current_user_admin()` e as políticas mudam de comportamento. Mitigação: `is_trusted_writer()` não usa `auth.uid()` de todo — lê os claims diretamente.
2. **Formato dos claims do PostgREST.** Simulei `{"sub": ..., "role": ...}`. Se o projeto usar o formato antigo (`request.jwt.claim.sub`), `is_trusted_writer()` lê o claim novo e cairia no ramo "sem JWT" → falha fechada (nega). Seguro, mas potencialmente disruptivo. **Validar antes com um pedido real.**
3. **`postgres` é superuser no vosso projeto?** Não dependo disso — o ramo direto aceita `rolsuper`, `rolbypassrls` ou os nomes `postgres`/`supabase_admin`. Mas convém confirmar que o SQL Editor continua a aprovar (`SELECT public.is_trusted_writer();` deve devolver `true`).
4. **Webhook do Stripe contra eventos reais.** A idempotência (`payment_events`, PK) e a verificação de assinatura estão implementadas, mas nunca vi um evento verdadeiro, nem testei reenvio/duplicados contra o Stripe.
5. **RLS pré-existente desconhecida.** O stub recria as políticas tal como estão nos ficheiros `.sql` do repositório. Se o vosso banco tiver políticas criadas à mão no Dashboard que não estejam nesses ficheiros, não as vi.

**Estruturais, assumidos de propósito:**

6. **`plan_catalog` e `plans.ts` são duas cópias.** Só um teste as mantém alinhadas. A solução definitiva é o frontend ler os preços da tabela (já tem política pública de `SELECT`) em vez de constantes no código.
7. **Perfis legados com `plan_type='ultra'`** continuam na base de dados; são lidos como premium. A limpeza (`UPDATE profiles SET plan_type='premium' WHERE plan_type='ultra'`) é uma alteração de dados reais — não a incluí. Decidam se querem.
8. **A função antiga `protect_is_admin_escalation()`** ainda existe (o trigger foi removido); fica código morto sem risco, mas convém apagar numa migração futura.
9. **Rate limiting em memória** (referido no relatório anterior): atenua abuso por instância, não é um limite global. Continua a ser a proteção mais fraca do conjunto.

**Nada disto está em produção.** A migração não foi executada e a aplicação não foi publicada, como pedido.

---

## 5. Antes de aplicar no Supabase

1. Confirmar os claims: no SQL Editor, `SELECT current_setting('request.jwt.claims', true)` numa sessão normal devolve vazio — o que importa é o comportamento da API, não do editor.
2. Aplicar num projeto Supabase de teste (ou branch) e correr `supabase/tests/100_security_hardening.test.sql` com o stub correspondente ao vosso esquema real.
3. Verificar à mão: `SELECT public.is_trusted_writer();` no SQL Editor → `true`; login no `/admin` → abre; conta normal no `/admin` → 404.
4. Só depois aplicar em produção e correr os cinco testes manuais da secção 10 do relatório anterior.

## 6. Ficheiros

`supabase/migrations/2026-10-28_security_hardening.sql` (v2, corrigida) · `supabase/tests/000_local_stub.sql` · `supabase/tests/100_security_hardening.test.sql` · `supabase/tests/run_local_tests.py` · `tests/security/static-guards.test.mjs` · `package.json` (`test:security`, `test:db`) · `src/app/api/admin/payments/route.ts` (rejeita plano `free`)
