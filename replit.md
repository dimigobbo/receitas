# Receitas da Saboaria

App de gerenciamento de receitas artesanais para saboaria — cadastre produtos com ingredientes, quantidades, modo de preparo, rendimento, tipo de embalagem e foto.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — rodar o servidor API (porta 5000)
- `pnpm --filter @workspace/saboaria run dev` — rodar o frontend (porta configurada pelo workflow)
- `pnpm run typecheck` — typecheck completo de todos os pacotes
- `pnpm run build` — typecheck + build de todos os pacotes
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks React Query e schemas Zod a partir do OpenAPI
- `pnpm --filter @workspace/db run push` — aplicar mudanças no schema do banco (somente dev)
- Required env: `DATABASE_URL` — string de conexão Postgres

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter (roteamento)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (do OpenAPI spec)
- Build: esbuild (CJS bundle)
- Upload de fotos: multer (armazenamento local em /uploads)

## Where things live

- `lib/api-spec/openapi.yaml` — contrato OpenAPI (fonte da verdade)
- `lib/db/src/schema/recipes.ts` — tabela de receitas
- `lib/db/src/schema/ingredients.ts` — tabela de ingredientes
- `artifacts/api-server/src/routes/recipes.ts` — rotas de receitas e ingredientes
- `artifacts/api-server/src/routes/uploads.ts` — rota de upload de foto
- `artifacts/saboaria/src/` — frontend React

## Architecture decisions

- Upload de foto não está no OpenAPI spec (multer/multipart não gera tipos compatíveis com o servidor Zod); é uma rota Express pura que serve arquivos de `/uploads/`.
- Ingredientes têm cascade delete com a receita (apagar receita apaga ingredientes).
- Stats endpoint (`GET /api/recipes/stats`) registrado ANTES de `/recipes/:id` para evitar conflito de rota.

## Product

- Dashboard: visão geral com total de receitas, tipos de embalagem e receitas recentes
- Caderno de Receitas: grade de cards com todos os produtos
- Detalhe de receita: foto, todos os campos, lista de ingredientes
- Criar/editar receita: formulário completo com upload de foto e gestão de ingredientes

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Após mudanças em `lib/*`, rodar `pnpm run typecheck:libs` antes de verificar artifacts.
- O upload de fotos grava em `artifacts/api-server/uploads/` — esse diretório não é comitado no git.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
