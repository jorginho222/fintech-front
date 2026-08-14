# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

There is no Node.js/npm on the host — everything must run through Docker.

```bash
# One-off commands (type-check, build, lint) via a throwaway container:
docker run --rm -v "$PWD":/app -w /app --user "$(id -u):$(id -g)" \
  -e npm_config_cache=/tmp/.npm node:22-alpine npx tsc -b
docker run --rm -v "$PWD":/app -w /app --user "$(id -u):$(id -g)" \
  -e npm_config_cache=/tmp/.npm node:22-alpine sh -c "npm run build && npm run lint"

# Installing/updating a dependency (writes package.json/package-lock.json to the host):
docker run --rm -v "$PWD":/app -w /app --user "$(id -u):$(id -g)" \
  -e npm_config_cache=/tmp/.npm node:22-alpine npm install <pkg>

# Running the dev server (hot reload, proxies /api to the backend):
docker compose up -d --build dev   # http://localhost:5173

# Production build served by nginx:
docker compose up -d --build app   # http://localhost:4173
```

`node_modules` is an anonymous volume inside the `dev` container. After changing dependencies, the running container will not see them until it's recreated with a fresh volume:

```bash
docker compose up -d --build --renew-anon-volumes dev
```

There is no test suite yet.

- `npm run lint` runs **oxlint** (not ESLint) — config in `.oxlintrc.json`.
- `npm run build` runs `tsc -b && vite build`; type errors fail the build.

## Backend integration

This is the frontend for a separate Symfony backend repo (sibling directory `fintech`, DTOs under `src/<Module>/Application/DTO/`). When implementing a feature against a backend endpoint:

- Read the corresponding `*Dto.php` and its `Assert\*` constraints — the zod schema should mirror them exactly (same regex, same enum values, same required/optional fields).
- Routes are mounted under `%app.api_prefix%`, currently `/api/v1` (not the bare path shown in a controller's `#[Route]` attribute) — confirm with `docker exec fintech-php-1 php bin/console debug:router` in the backend repo if unsure.
- The backend's global exception subscriber (`ApiExceptionSubscriber`) returns two error shapes: `{"errors": {"field": ["message", ...]}}` with HTTP 422 for validation failures, and `{"error": "message"}` for domain/JSON errors. API clients should handle both.
- In dev, `vite.config.ts` proxies `/api` to the backend (`VITE_API_PROXY_TARGET`, defaulting to `http://host.docker.internal:8080` when run via `docker compose`, matching the backend's nginx port in its own `docker-compose.yml`).

## Architecture

Vite + React 19 + TypeScript + Tailwind CSS v4 + Zustand. Path alias `@/*` → `./src/*`.

Feature code is organized by domain module under `src/<module>/`, not by technical layer at the top level, e.g.:

```
src/company/
  types/       # domain interfaces mirroring backend DTOs, plus "create default" factories
  schemas/     # zod schemas used as react-hook-form resolvers, mirroring backend Assert constraints
  api/         # fetch wrappers for that module's endpoints, with typed error classes
  components/  # forms/UI for the module
```

Global/shared pieces (state stores, the API base client, etc.) live directly under `src/` (e.g. `src/store/`) rather than inside a module.

Forms use `react-hook-form` with `@hookform/resolvers/zod`. A schema's **input** type is looser than its **output** type where a field starts blank/unselected in the UI (e.g. a select with no default) — the schema's `.refine`/`.transform` narrows it, so `onSubmit` receives an already-validated, backend-shaped payload with no manual casting.

IDs sent to the backend are client-generated UUID v4s (via the `uuid` package's `v4()`), not backend-assigned — the backend's create DTOs validate the id shape but not its origin, and a create use case will silently no-op if an id already exists (check the relevant `*Creator` use case in the backend before assuming a resubmit is safe — regenerate the id rather than resubmitting the same one).

### TypeScript strictness

`tsconfig.app.json` enables `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. Notably:

- Array/object index access returns `T | undefined`; narrow before use.
- Type-only imports must use `import type` (or inline `type` specifiers) — plain imports of types will fail the build.
- Optional properties (`foo?: string`) cannot be explicitly assigned `undefined` unless the type says `foo?: string | undefined`.
