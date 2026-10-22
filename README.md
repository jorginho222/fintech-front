# Fintech Front

The web app for the [Fintech API](https://github.com/jorginho222/fintech), a business credit platform. Companies register, apply for credit, accept loan proposals, pay them back in installments, and manage which of their users can do what.

Built with **React 19**, **TypeScript** and **Vite**. The whole development environment runs in Docker. The UI is in Spanish.

## Features

- **Company accounts:** registration, login by CUIT/CUIL, JWT sessions with automatic token refresh, and logout. The session is kept in sync across browser tabs.
- **Credit applications:** list a company's applications and apply for credit.
- **Credit requests:** confirm a loan proposal, list credit requests, see a credit request's installments, and pay them.
- **Payments calendar and total debt:** pending installments by due date, and the company's total debt.
- **User management (Gestion de Usuarios):** the company admin creates up to 10 active member users, edits their names and permissions, and activates or deactivates them. Members must change the admin-set password on their first login.
- **Permission-aware UI:** members only see the sections they have permissions for. Actions they can't perform are disabled with the missing permission named. The backend remains the source of truth.

## Tech stack

| Component | Used for |
|---|---|
| React 19 / TypeScript | UI, with strict type checking |
| Vite | Dev server and production build |
| Tailwind CSS v4 | Styling |
| React Router 7 | Routing and route guards |
| Zustand | Auth session store, persisted to `localStorage` |
| react-hook-form + zod | Forms, with schemas that mirror the backend's validation |
| Vitest | Unit tests |
| oxlint | Linting |
| Nginx | Serves the production build |

## Architecture

The code is organized by domain module, mirroring the backend's modules:

```
src/
  company/                      # Registration, login, session, permissions, password change
  credit-request-applications/  # Credit applications
  credit-requests/              # Credit requests, proposals and installment payments
  payments-calendar/            # Pending installments by due date
  total-debt/                   # Company's total debt
  member-users/                 # User management (admin only)
  dashboard/                    # Landing page after login
  shared/                       # API client, error handling, shared components
  store/                        # Zustand auth store
    {module}/
      types/        # Domain types mirroring the backend DTOs
      schemas/      # zod schemas mirroring the backend's validation constraints
      api/          # Calls to the module's endpoints
      components/   # Views and forms
```

- `src/shared/api/api-client.ts` talks to the backend under `/api/v1`. It adds the access token, refreshes it once on a 401 (shared by concurrent requests), and handles the backend's 403s: a pending password change and a missing permission.
- `src/navigation.ts` maps each route to the permissions it needs. The same map drives the menu, the route guards and the disabled action buttons.
- Entity IDs sent to the backend are UUID v4s generated in the browser.

## Installation

### Requirements

- Docker with Docker Compose
- The [backend](https://github.com/jorginho222/fintech) running locally (its nginx listens on port 8080)

Node.js is not needed on the host: every command runs in a container.

### 1. Clone the repository

```bash
git clone git@github.com:jorginho222/fintech-front.git
cd fintech-front
```

### 2. Start the dev server

```bash
docker compose up -d --build dev
```

The app is at http://localhost:5173, with hot reload. Vite proxies `/api` to the backend at `http://host.docker.internal:8080`. To point it somewhere else, change `VITE_API_PROXY_TARGET` in `docker-compose.yml`.

After changing dependencies, recreate the container so it gets a fresh `node_modules`:

```bash
docker compose up -d --build --renew-anon-volumes dev
```

### 3. First steps

1. Open http://localhost:5173/register and register a company. Its CUIT and password make the admin login.
2. Log in, then go to **Gestion de Usuarios** to create member users and give them permissions.
3. A member logs in with their CUIL and the password the admin set, and is asked to change it.

## Production build

```bash
docker compose up -d --build app
```

This serves the built app with nginx at http://localhost:4173. The nginx config only serves the static files and does not proxy `/api`. Put the app and the backend behind the same reverse proxy, or build with `VITE_API_BASE_URL` set to the backend's URL (`VITE_API_VERSION` defaults to `v1`).

## Development commands

Run these from the project root:

```bash
# Type-check, build and lint
docker run --rm -v "$PWD":/app -w /app --user "$(id -u):$(id -g)" \
  -e npm_config_cache=/tmp/.npm node:22-alpine sh -c "npm run build && npm run lint"

# Unit tests (tests/)
docker run --rm -v "$PWD":/app -w /app --user "$(id -u):$(id -g)" \
  -e npm_config_cache=/tmp/.npm node:22-alpine npm test

# Add a dependency
docker run --rm -v "$PWD":/app -w /app --user "$(id -u):$(id -g)" \
  -e npm_config_cache=/tmp/.npm node:22-alpine npm install <pkg>
```

Unit tests cover pure logic: schemas, permission helpers, navigation filtering and API error parsing.

## Specs and plans

Each feature starts with a spec in `_specs/` and an implementation plan in `_plans/`, matching the ones in the backend repo.
