# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`. Organize feature code by domain under `src/<module>/`; for example, `src/company/` contains `api/`, `components/`, `schemas/`, and `types/`. Shared state belongs in `src/store/`, while routing and guards live near `src/App.tsx`. Static assets go in `public/`; global Tailwind styles are in `src/index.css`.

Use the `@/` alias for imports from `src`, such as `@/store/auth-store`. The frontend integrates with a separate Symfony backend and proxies `/api` requests during development.

## Build, Test, and Development Commands

The supported workflow uses Docker because Node.js/npm may not be installed on the host.

- `docker compose up -d --build dev`: start the Vite development server at `http://localhost:5173` with hot reload.
- `docker compose up -d --build app`: build and serve the production image at `http://localhost:4173`.
- `docker run --rm -v "$PWD":/app -w /app node:22-alpine npm run build`: type-check and create the production bundle.
- `docker run --rm -v "$PWD":/app -w /app node:22-alpine npm run lint`: run Oxlint.
- `docker compose up -d --build --renew-anon-volumes dev`: recreate the development container after dependency changes.

## Coding Style & Naming Conventions

Use two-space indentation, single quotes, and no semicolons, matching existing TypeScript. Name React components and types in PascalCase; use camelCase for functions, variables, and Zustand hooks. Files use lowercase kebab-case, such as `company-login-form.tsx`. Prefer named exports for feature modules.

TypeScript is strict: use `import type`, narrow indexed values, and do not assign `undefined` to optional properties unless explicitly allowed. Run `npm run lint` and `npm run build` before submitting changes. Forms should use React Hook Form with Zod schemas that mirror backend DTO validation.

## Testing Guidelines

There is no automated test suite or coverage requirement. Run lint and the production build, then manually verify affected routes and API error states. When tests are introduced, colocate them with features using `*.test.ts` or `*.test.tsx` and add the command to `package.json`.

## Commit & Pull Request Guidelines

The repository has no commit history from which to infer a convention. Use concise, imperative commit subjects (for example, `Add company login validation`) and keep commits focused. Pull requests should explain the behavior change, list verification steps, link relevant issues, and include screenshots for visible UI changes. Call out backend endpoint or DTO dependencies explicitly.

## Security & Configuration

Never commit credentials or tokens. Configure the development backend through `VITE_API_PROXY_TARGET`; keep environment-specific values outside tracked source files.
