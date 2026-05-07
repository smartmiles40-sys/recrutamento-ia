# Culture Aligned Talent Engine

Plataforma de recrutamento com avaliação por IA. Candidatos se cadastram via link público, fazem upload de currículo e respondem ao formulário multi-etapas. A IA analisa CV (área, estabilidade, competências), respostas das etapas e DISC, e gera um score final ponderado por etapa.

## Stack

- **Frontend**: Vite + React 18 + TypeScript + shadcn-ui + Tailwind
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions Deno)
- **IA**: OpenAI Chat Completions (`gpt-4o-mini` por padrão, configurável via `OPENAI_MODEL`)
- **Deploy**: Vercel (frontend) + Supabase (backend)

## Estrutura

- `src/` — frontend React
- `src/pages/PublicApplicationForm.tsx` — formulário público de candidatura
- `supabase/functions/analyze-cv/` — IA analisa o currículo (PDF/DOCX)
- `supabase/functions/score-candidate-responses/` — IA pontua respostas das etapas
- `supabase/functions/analyze-disc/` — IA cruza DISC com perfil da vaga
- `supabase/functions/create-user/` — admin cria recrutadores
- `supabase/migrations/` — schema (jobs, candidates, stages, evaluations, DISC)

## Rotas públicas vs privadas

Públicas:
- `/auth` — login
- `/vagas-abertas` — lista de vagas com link de candidatura
- `/aplicar/:jobId` — formulário multi-step do candidato
- `/privacidade`

Privadas (auth obrigatório):
- `/` — dashboard
- `/vagas` — gestão de vagas
- `/vagas/:jobId/configurar` — configurar etapas, perguntas, critérios IA
- `/candidatos`, `/candidatos/:id` — pipeline
- `/aprovados`, `/reprovados`, `/configuracoes`

## Setup local

```bash
npm install
cp .env.example .env
# preencher VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

App em `http://localhost:8080`.

## Deploy do frontend (Vercel)

1. Pushar este repo no GitHub.
2. No Vercel: **Add New Project** → importar o repo. Framework `Vite` é detectado automaticamente.
3. **Environment Variables**:
   - `VITE_SUPABASE_URL` — `https://gubhgndxtsioihyiuhry.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — anon key do Supabase
   - `VITE_SUPABASE_PROJECT_ID` — `gubhgndxtsioihyiuhry`
4. Deploy. O `vercel.json` já cuida do rewrite SPA.
5. Após o deploy: copie o domínio Vercel e cole em **Supabase → Authentication → URL Configuration → Site URL** (e adicione em Redirect URLs).

## Deploy das edge functions (Supabase CLI)

As 3 funções de IA usam OpenAI direto (substituindo o gateway Lovable original).

```bash
npm install -g supabase
supabase login
supabase link --project-ref gubhgndxtsioihyiuhry

# secrets das edge functions
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-4o-mini   # opcional; default é gpt-4o-mini

# deploy
supabase functions deploy analyze-cv
supabase functions deploy analyze-disc
supabase functions deploy score-candidate-responses
supabase functions deploy create-user
```

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY` são injetadas automaticamente pelo runtime — não precisam ser setadas via CLI.

## Modelos OpenAI

Default `gpt-4o-mini` (suporta vision/PDF, baixo custo). Para trocar:

```bash
supabase secrets set OPENAI_MODEL=gpt-4o
# ou
supabase secrets set OPENAI_MODEL=gpt-4.1-mini
```

`analyze-cv` envia o PDF como `type: "file"` no Chat Completions — modelos sem suporte a arquivo (`gpt-3.5-turbo`, etc.) **não funcionam**.

## Storage (CVs)

A função `analyze-cv` baixa do bucket `cvs`. Se for projeto Supabase novo:

```sql
insert into storage.buckets (id, name, public) values ('cvs', 'cvs', false);
```

E criar policies para `INSERT` autenticado/anônimo conforme o fluxo público de upload.
