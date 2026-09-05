# NOVA

Private, multi-page editorial workspace. Runs on Vinext/React and Cloudflare Workers with D1 metadata and R2 text sources. The existing Sites project identity is retained in `.openai/hosting.json`.

## Product

- `/`: short landing; `/como-funciona`, `/confianza`: product information.
- `/proyectos`: create, search and filter projects.
- `/proyectos/:id`: chapter editor with explicit saves, revision history, conflict detection and source search.
- Project subpages: `/fuentes`, `/memoria`, `/estilo`, `/configuracion`.
- `/estadisticas`: saved words, chapters, sources, memory, goals and 30-day revision counts.
- `/ajustes`: account/storage/provider state.

Private Site dispatch authenticates visitors. API routes require `oai-authenticated-user-id`; all resource reads and writes check project ownership. Browser writes require matching Origin. Do not expose this Worker outside the trusted Sites dispatcher without replacing header-based identity with verified authentication.

## Persistence

Schema: `db/schema.ts`. Generated migrations: `drizzle/`. D1 stores projects, chapters, versions, source metadata, text passages and memory. R2 stores the complete uploaded/pasted source text. UI state is not the authoritative store. No provider or API key is configured.

Limits: 100 projects per user; 300 chapters and 5 million manuscript characters per project; 100 sources and 10 MB source text per project; 500,000 characters per source; 500 memory entries. Text/Markdown uploads use UTF-8. PDF and DOCX parsing are not implemented. Dates entered in memory are author-owned labels; automatic chronology interpretation is not implemented.

## AI integration seam

Replace the disabled implementation of `WritingProvider` in `lib/ai-provider.ts` with a server-only provider adapter. No OpenAI-specific requests, credentials or dependencies are present. Do not place secrets in public or client-prefixed environment variables. Configure hosted values using Sites environment management when integrating.

`POST /api/nova/projects/:id/context` accepts `{chapterId, action: 'continue'|'rewrite'|'verify', instruction}` and produces actual context from the saved chapter, style rules, sample, memory and retrieved passages. It returns explicit context limits and `retrieval: 'lexical'`.

`POST /api/nova/projects/:id/ai` validates identity and ownership; returns HTTP 503 with `AI_NOT_CONFIGURED` until the adapter is available. Once supplied, returns a proposal plus the chapter version it was based on. Do not automatically overwrite the manuscript. Wire explicit acceptance into the editor using the existing version-checked chapter PUT. Usage accounting, provider cancellation/timeouts, semantic embeddings and model verification remain part of API integration; the current UI accurately describes them as unavailable. Sources are untrusted content, not model instructions; a source match does not establish factual support.

## API

Under `/api/nova`:

- `GET /status`, `GET /stats`.
- `GET/POST /projects`; `GET/PATCH/DELETE /projects/:id`.
- `POST /projects/:id/chapters`; `GET/PUT/DELETE /projects/:id/chapters/:chapter`.
- `GET /projects/:id/chapters/:chapter/revisions` (last 40). PUT requires the current integer `version`; conflict returns 409.
- `POST /projects/:id/sources`; `GET/DELETE /projects/:id/sources/:source`.
- `GET /projects/:id/search?q=...`: accent-insensitive lexical retrieval, up to 12 passages.
- `POST /projects/:id/memory`; `PUT/DELETE /projects/:id/memory/:entry`.
- `GET /projects/:id/export` for Markdown; `?format=json` includes project, chapters, source content and memory. No history, no JSON import endpoint.

Deletion removes metadata and attempts R2 cleanup; cleanup errors are logged. No application trash/restore feature exists. Project archive is reversible.

## Development and verification

Keep the supplied lockfile. `npm run db:generate` generates new immutable migration files. Use Sites build/hosting skills for deployment; platform supplies D1 and R2 resources. `npm run build` compiles the Worker and browser assets. `node --test tests/nova-api.test.mjs` runs against Miniflare D1/R2, testing persistence, access isolation, cross-origin rejection, conflicts, search, style/memory context, metrics, exports, cascades and object cleanup without contacting an LLM.
