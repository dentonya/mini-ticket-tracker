# Mini Ticket Tracker

A small support-ticket tracker: a NestJS REST API on PostgreSQL and a React UI in one pnpm monorepo. You can create tickets, list them with a status filter and pagination, change a ticket's status or priority, and see ticket counts by status.

![Board](docs/screenshots/board.png)

## Contents

- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [API reference](#api-reference)
- [The UI](#the-ui)
- [Testing](#testing)
- [Decisions & Tradeoffs](#decisions--tradeoffs)

## Tech stack

| Layer    | Choice                                                                           |
| -------- | -------------------------------------------------------------------------------- |
| Backend  | Node.js, **NestJS 11**, TypeORM 0.3, class-validator, Swagger (OpenAPI 3)        |
| Database | **PostgreSQL 16** (Docker Compose)                                               |
| Frontend | **React 19**, Vite 7, TanStack Query 5, React Router 7, Tailwind CSS 3           |
| Shared   | `@mtt/shared`: TypeScript enums and API types used by both apps                  |
| Tooling  | pnpm workspaces, TypeScript (strict), Jest + Supertest, Prettier, GitHub Actions |

## Repository layout

```
.
├── apps/
│   ├── api/                      NestJS REST API
│   │   ├── src/
│   │   │   ├── config/           Environment loading and validation
│   │   │   ├── database/         TypeORM connection and migrations
│   │   │   ├── tickets/          Entity, DTOs, service, controller
│   │   │   ├── app.module.ts
│   │   │   ├── app.setup.ts      Global ValidationPipe (shared with tests)
│   │   │   ├── swagger.ts        OpenAPI document + Swagger UI at /docs
│   │   │   └── main.ts
│   │   └── test/                 Integration tests (Jest + Supertest + real Postgres)
│   └── web/                      React + Vite client
│       └── src/
│           ├── api/              fetch client + TanStack Query hooks
│           ├── components/       Layout, Dialog, Drawer, form, badges…
│           ├── lib/              Display metadata and formatting helpers
│           └── pages/            Board, All Tickets, Analytics
├── packages/
│   └── shared/                   Ticket enums and request/response types
├── docker/init-test-db.sql       Creates the tickets_test database
├── docker-compose.yml            PostgreSQL 16
└── .github/workflows/ci.yml      Build + integration tests on every push/PR
```

## Getting started

### Prerequisites

- Node.js 20 or newer (22 recommended; see `.nvmrc`)
- pnpm 11 (`corepack enable` picks up the version pinned in `package.json`)
- Docker (for PostgreSQL)

### Run it

```bash
pnpm install        # install all workspace dependencies
pnpm db:up          # start PostgreSQL on localhost:5434 and wait until it is healthy
pnpm dev            # build @mtt/shared, then run the API (:3000) and web app (:5173)
```

Open **http://localhost:5173** for the app and **http://localhost:3000/docs** for the interactive API docs (Swagger UI).

On startup the API runs any pending database migrations, so there is no separate migrate step. The web dev server proxies `/api/*` to `http://localhost:3000`, so the API needs no CORS configuration.

### Configuration

Every setting has a working default for local development. To override them, copy `apps/api/.env.example` and export the variables.

| Variable           | Default                                             | Used by          |
| ------------------ | --------------------------------------------------- | ---------------- |
| `PORT`             | `3000`                                              | API              |
| `DATABASE_URL`     | `postgres://tickets:tickets@localhost:5434/tickets` | API              |
| `POSTGRES_PORT`    | `5434`                                              | docker compose   |
| `API_PROXY_TARGET` | `http://localhost:3000`                             | Vite dev proxy   |
| `VITE_API_URL`     | `/api`                                              | Web (build time) |

Postgres listens on port **5434**, not 5432, so it won't clash with a Postgres already running on your machine.

### Useful scripts (from the repo root)

| Command          | What it does                                                |
| ---------------- | ----------------------------------------------------------- |
| `pnpm dev`       | Run the API and the web app in watch mode                   |
| `pnpm test`      | Run the API integration tests (needs `pnpm db:up`)          |
| `pnpm build`     | Production build of every package                           |
| `pnpm typecheck` | `tsc --noEmit` across the workspace                         |
| `pnpm db:down`   | Stop the database container (data stays in a Docker volume) |

## API reference

Base URL: `http://localhost:3000`. JSON in, JSON out.

### Interactive docs (Swagger)

While the API is running:

- **Swagger UI:** http://localhost:3000/docs. Browse every endpoint, see request and response schemas with examples, and send requests with **Try it out**.
- **OpenAPI 3 spec (JSON):** http://localhost:3000/docs-json. Import it into Postman or Insomnia, or use it to generate a client.

The spec is generated from the code, not written by hand:

- Request bodies and query parameters come from the same DTOs that do validation, so lengths, enums and defaults match what the API enforces.
- Response schemas are classes that implement the `@mtt/shared` types, so the compiler reports any mismatch between the docs and what the web client expects.
- An integration test ([openapi.e2e-spec.ts](apps/api/test/openapi.e2e-spec.ts)) fails if an endpoint or schema goes missing from the spec.

<details>
<summary>Screenshot</summary>

![Swagger UI](docs/screenshots/swagger.png)

</details>

The reference below summarises the same information.

### Data model

| Field         | Type                                | Notes                               |
| ------------- | ----------------------------------- | ----------------------------------- |
| `id`          | integer                             | Primary key (`SERIAL`)              |
| `title`       | string                              | Required, 1–120 characters, trimmed |
| `description` | string \| null                      | Optional, up to 5000 characters     |
| `status`      | `open` \| `in_progress` \| `closed` | Postgres enum, defaults to `open`   |
| `priority`    | `low` \| `medium` \| `high`         | Postgres enum, defaults to `medium` |
| `createdAt`   | ISO-8601 timestamp                  | `timestamptz`, set by the database  |

There is a composite index on `(status, created_at)`. It serves both the status filter and the newest-first ordering of the list endpoint.

### Endpoints

| Method  | Path             | Description                                   | Success |
| ------- | ---------------- | --------------------------------------------- | ------- |
| `POST`  | `/tickets`       | Create a ticket                               | `201`   |
| `GET`   | `/tickets`       | List tickets: `?status=`, `?page=`, `?limit=` | `200`   |
| `PATCH` | `/tickets/:id`   | Update a ticket's `status` and/or `priority`  | `200`   |
| `GET`   | `/tickets/stats` | Count of tickets grouped by status            | `200`   |

**Create**

```bash
curl -X POST localhost:3000/tickets -H 'Content-Type: application/json' \
  -d '{"title":"Login page returns 500","description":"Since the 14:00 deploy","priority":"high"}'
```

```json
{
  "id": 1,
  "title": "Login page returns 500",
  "description": "Since the 14:00 deploy",
  "status": "open",
  "priority": "high",
  "createdAt": "2026-10-12T09:09:34.726Z"
}
```

`status` and `priority` are optional on create.

**List**: `GET /tickets?status=open&page=1&limit=20`

```json
{
  "data": [{ "id": 1, "title": "Login page returns 500", "...": "..." }],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

- `page` defaults to 1. `limit` defaults to 20 and can be at most 100.
- Results are ordered newest first. `id` breaks ties so pages stay stable.

**Update**: `PATCH /tickets/1` with body `{"status":"in_progress"}`. You must send at least one of `status` or `priority`.

**Stats**: `GET /tickets/stats`

```json
{ "total": 4, "byStatus": { "open": 2, "in_progress": 1, "closed": 1 } }
```

Every status is always present, with a count of `0` when no tickets have that status.

### Errors

Every error uses NestJS's standard shape:

```json
{ "statusCode": 400, "error": "Bad Request", "message": ["title should not be empty"] }
```

| Situation                                                              | Status |
| ---------------------------------------------------------------------- | ------ |
| Missing or blank title, or an unknown enum value                       | `400`  |
| Unknown fields, e.g. trying to `PATCH` the `title`                     | `400`  |
| `PATCH` with an empty body                                             | `400`  |
| Invalid `page`/`limit` (`0`, `abc`, `limit > 100`) or unknown `status` | `400`  |
| Non-numeric `:id`                                                      | `400`  |
| Ticket not found                                                       | `404`  |

## The UI

The screens follow the provided mockups and their "Kinetic Engine" design system: the same colour tokens, Inter and JetBrains Mono, and the pill-style badges. Each screen is cut down to the fields in the data model. The mockups also show assignees, sprints, PRs and velocity charts. Those features have no backing data, so I left them out rather than fake them.

| Screen                       | What you can do                                                                                                                                                                                                  | Requirement covered                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Board** (`/`)              | One column per status, each loaded page by page with **Load more**. A progress bar shows the share of tickets closed. Change a card's status from its dropdown to move it to another column.                     | List with status/priority, change status |
| **All Tickets** (`/tickets`) | A table with status filter tabs (showing counts) and Previous/Next pagination. You can change status and priority inline. The filter and page are kept in the URL, so views can be linked and survive a refresh. | List, filter, pagination, change status  |
| **Create Ticket** (dialog)   | Opens from **New Ticket**, **Add Ticket**, or by pressing **C**. Title (with a 0/120 counter), description, priority and status. Validation messages appear only after you interact with a field.                | Create form                              |
| **Ticket detail** (drawer)   | Click any ticket to see its full details and edit its status and priority.                                                                                                                                       | Change status                            |
| **Analytics** (`/analytics`) | Count cards and a donut chart of the status breakdown, from `GET /tickets/stats`.                                                                                                                                | Uses the stats endpoint                  |

<details>
<summary>More screenshots</summary>

| Create Ticket                                 | Ticket detail                                 |
| --------------------------------------------- | --------------------------------------------- |
| ![Create ticket](docs/screenshots/create.png) | ![Ticket drawer](docs/screenshots/drawer.png) |
| **All Tickets**                               | **Analytics**                                 |
| ![All tickets](docs/screenshots/list.png)     | ![Analytics](docs/screenshots/analytics.png)  |

Mobile (390 px wide):

<img src="docs/screenshots/mobile.png" width="260" alt="Mobile board" />

</details>

UI implementation notes:

- **Server state** lives in TanStack Query. After a create or update, the app re-fetches every ticket query (lists, board columns and stats), so all counts stay consistent without hand-written cache updates.
- **Dialogs** use the native `<dialog>` element with `showModal()`. The browser handles focus trapping, closing on Esc and making the background inert. `closedby="any"` closes the dialog when you click outside it, and there is a small fallback for Safari, which doesn't support `closedby`.
- **Form validation** relies on native constraints (`required`, `maxLength`, `pattern`) and the `:user-invalid` CSS pseudo-class, so errors only show after you interact with a field. `aria-invalid` is kept in sync for screen readers. The server validates everything again, and API errors are shown in the form.
- **Loading, empty and error states** (with a retry button) appear on every data view. The sidebar footer says whether the API can be reached.
- **Responsive:** below 768 px the sidebar becomes a compact top bar and the board columns stack.

## Testing

```bash
pnpm db:up
pnpm test
```

The integration tests in [apps/api/test/](apps/api/test/) start the full Nest application, with the same `ValidationPipe` setup as `main.ts`. They send real HTTP requests with Supertest to a real PostgreSQL database, `tickets_test`, which is kept separate from development data. The `tickets` table is truncated before each test. There are **23 test cases**, covering:

- **POST /tickets**: defaults applied, title trimmed, explicit status and priority, and six invalid payloads that must return 400
- **GET /tickets**: status filter combined with pagination and newest-first order, the unfiltered list, and invalid query parameters
- **PATCH /tickets/:id**: a successful update, 404 for a missing ticket, an empty body, an immutable field, an invalid enum value, and a non-numeric id
- **GET /tickets/stats**: zero counts for an empty table, and counts after creates and updates
- **OpenAPI document**: every endpoint, its parameters and responses, and the shared enum schemas are present

GitHub Actions ([ci.yml](.github/workflows/ci.yml)) runs the same build and tests against a Postgres service container on every push and pull request.

I also tested the UI by hand in Chrome: creating a ticket, validation, inline status changes, the drawer, pagination, **Load more**, and the mobile layout.

## Decisions & Tradeoffs

**NestJS is a Node.js framework.** The brief lists Node.js/Express, and NestJS runs on Express. I chose it for its structure: modules, DTO validation and dependency injection. I used NestJS 11 rather than the new 12 release because 12 is ESM-only, which complicates the Jest setup for no benefit at this size. **The monorepo** lets the API and UI share the ticket enums and payload types through `@mtt/shared`, so the client and server can't fall out of step. **The database schema** is defined in a hand-written migration, not TypeORM's `synchronize`. Status and priority are Postgres enums, so invalid values are rejected by the database as well as by the API. Migrations run automatically when the API starts, so setup is one command. In production I would run them as a separate deploy step. **I used offset pagination** (`page`/`limit`) because the brief asked for it. It is simple, but it gets slower on deep pages and can skip or repeat rows while data changes. At scale I would switch to cursor pagination on `(created_at, id)`. **After any change, the UI re-fetches all ticket queries** instead of updating the cache optimistically. That costs a few cheap extra requests but makes stale counts impossible, and status changes still feel instant at this data size. **I kept the mockups' look but not their extra features.** Assignees, sprints, PRs and velocity charts need data the model doesn't have, so I didn't build fake versions of them.

**Assumptions:** `PATCH` may change only `status` and `priority`. Any other field returns 400 instead of being silently ignored. Status changes are unrestricted (for example, closed → open is allowed). Create may set an initial status and priority. Titles are trimmed and limited to 120 characters.

**With more time I would add:**

- authentication, with a reporter and assignee on each ticket
- a `GET /tickets/:id` endpoint, so a ticket page can be deep-linked
- text search and a priority filter
- an audit/activity log of status changes, as in the detail mockup
- frontend component tests (Vitest + Testing Library) and a Playwright smoke test
- request logging, health checks and rate limiting
- a production Dockerfile for each app
