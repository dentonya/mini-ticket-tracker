# Mini Ticket Tracker

A small support-ticket tracker: a NestJS REST API on PostgreSQL and a React UI in one pnpm monorepo. You can create, view, edit and delete tickets, list them with a status filter and pagination, move them between statuses by dragging cards on a board, see ticket counts by status, and browse a full history of every change.

![Board](docs/screenshots/board.png)

## Contents

- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [API reference](#api-reference)
- [The UI](#the-ui)
- [Testing](#testing)
- [Deployment](#deployment)
- [Beyond the brief](#beyond-the-brief)
- [Design notes](#design-notes)
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
│   │   │   ├── activity/         Activity log: event entity, diffing, GET /activity
│   │   │   ├── common/           Shared pagination query DTO
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
│           └── pages/            Board, All Tickets, Analytics, Activity
├── packages/
│   └── shared/                   Ticket enums and request/response types
├── docker/init-test-db.sql       Creates the tickets_test database
├── docker-compose.yml            PostgreSQL 16
└── .github/workflows/ci.yml      Build + integration tests on every push/PR
```

## Getting started

### Prerequisites

- Node.js 22.13 or newer (required by pnpm 11; see `.nvmrc`)
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

### Troubleshooting

- **The API returns 404 for a route that exists, or the UI shows errors after pulling changes.** The API's watch mode may be running an old build. This happens when `packages/shared` changes, because the API consumes the shared package's compiled output and TypeScript's watcher doesn't track it. Stop `pnpm dev` and start it again; it rebuilds `@mtt/shared` first.
- **Port 5434 is already in use.** Start Postgres on another port with `POSTGRES_PORT=5435 pnpm db:up`, then set `DATABASE_URL` to match.

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

| Method   | Path             | Description                                                | Success |
| -------- | ---------------- | ---------------------------------------------------------- | ------- |
| `POST`   | `/tickets`       | Create a ticket                                            | `201`   |
| `GET`    | `/tickets`       | List tickets: `?status=`, `?page=`, `?limit=`              | `200`   |
| `GET`    | `/tickets/stats` | Count of tickets grouped by status                         | `200`   |
| `GET`    | `/tickets/:id`   | Get one ticket                                             | `200`   |
| `PATCH`  | `/tickets/:id`   | Update any of `title`, `description`, `status`, `priority` | `200`   |
| `DELETE` | `/tickets/:id`   | Delete a ticket                                            | `204`   |
| `GET`    | `/activity`      | Activity log: `?ticketId=`, `?page=`, `?limit=`            | `200`   |

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

`description` and `priority` are optional. Every new ticket starts as `open`. Sending a `status` returns 400; change the status afterwards with `PATCH`.

**List**: `GET /tickets?status=open&page=1&limit=20`

```json
{
  "data": [{ "id": 1, "title": "Login page returns 500", "...": "..." }],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

- `page` defaults to 1. `limit` defaults to 20 and can be at most 100.
- Results are ordered newest first. `id` breaks ties so pages stay stable.

**Get one**: `GET /tickets/1` returns the ticket, or `404`.

**Update**: `PATCH /tickets/1` with any subset of the editable fields, for example `{"status":"in_progress"}` or `{"title":"New title","description":""}`. Send at least one field. Titles are trimmed and can't be blank. An empty `description` clears it. `id` and `createdAt` can't be changed.

**Delete**: `DELETE /tickets/1` returns `204 No Content`, or `404` if the ticket doesn't exist.

**Stats**: `GET /tickets/stats`

```json
{ "total": 4, "byStatus": { "open": 2, "in_progress": 1, "closed": 1 } }
```

Every status is always present, with a count of `0` when no tickets have that status.

**Activity log**: `GET /activity?ticketId=1&page=1&limit=20`

```json
{
  "data": [
    {
      "id": 7,
      "ticketId": 1,
      "ticketTitle": "Login page returns 500",
      "type": "updated",
      "changes": { "status": { "from": "open", "to": "in_progress" } },
      "createdAt": "2026-10-12T10:15:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

- Every create, edit and delete adds one event. `type` is `created`, `updated` or `deleted`.
- `changes` lists only the fields that actually changed, with their old and new values. For `created`, `from` is `null`.
- An update that changes nothing (re-sending the current values) is not logged.
- Without `ticketId` you get the feed across all tickets, newest first.
- Events are kept after their ticket is deleted, so `ticketTitle` stores the title as it was at the time.

### Errors

Every error uses NestJS's standard shape:

```json
{ "statusCode": 400, "error": "Bad Request", "message": ["title should not be empty"] }
```

| Situation                                                                         | Status |
| --------------------------------------------------------------------------------- | ------ |
| Missing or blank title, or an unknown enum value                                  | `400`  |
| Unknown or read-only fields, e.g. `PATCH` with `createdAt`, or `status` on create | `400`  |
| `PATCH` with an empty body                                                        | `400`  |
| Invalid `page`/`limit` (`0`, `abc`, `limit > 100`) or unknown `status`            | `400`  |
| Non-numeric `:id`                                                                 | `400`  |
| Ticket not found                                                                  | `404`  |

## The UI

The screens follow the provided mockups and their "Kinetic Engine" design system: the same colour tokens, Inter and JetBrains Mono, and the pill-style badges. Each screen is cut down to the fields in the data model. The mockups also show assignees, sprints, PRs and velocity charts. Those features have no backing data, so I left them out rather than fake them.

| Screen                       | What you can do                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Requirement covered                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Board** (`/`)              | One column per status, each loaded page by page with **Load more**. **Drag a card to another column** to change its status; the card moves straight away and the change is saved in the background. Each card also has a status dropdown, which works with a keyboard and on touch screens. A progress bar shows the share of tickets closed. **All / Open / In Progress / Closed** filter buttons (with counts) narrow the board to one status. The filter is kept in the URL. | List with status/priority, filter, change status |
| **All Tickets** (`/tickets`) | A table with the same status filter buttons as the board and Previous/Next pagination. You can change status and priority inline. The filter and page are kept in the URL, so views can be linked and survive a refresh.                                                                                                                                                                                                                                                        | List, filter, pagination, change status          |
| **Create Ticket** (dialog)   | Opens from **New Ticket**, **Add Ticket**, or by pressing **C**. Title (with a 0/120 counter), description and priority. There is no status field: new tickets always start as Open. Validation messages appear only after you interact with a field.                                                                                                                                                                                                                           | Create form                                      |
| **Ticket detail** (drawer)   | Click any ticket to open it. Change status and priority, **Edit** the title and description, or **Delete** the ticket after confirming. A **History** timeline shows every change with old → new values.                                                                                                                                                                                                                                                                        | Change status, plus full CRUD                    |
| **Analytics** (`/analytics`) | Count cards and a donut chart of the status breakdown, from `GET /tickets/stats`.                                                                                                                                                                                                                                                                                                                                                                                               | Uses the stats endpoint                          |
| **Activity** (`/activity`)   | The log across all tickets, newest first, with pagination. Click a ticket to open it; deleted tickets are shown but can't be opened.                                                                                                                                                                                                                                                                                                                                            | Activity log                                     |

<details>
<summary>More screenshots</summary>

Board filtered to Open:

![Board filtered to Open](docs/screenshots/board-filtered.png)

| Create Ticket                                   | Ticket detail                                       |
| ----------------------------------------------- | --------------------------------------------------- |
| ![Create ticket](docs/screenshots/create.png)   | ![Ticket drawer](docs/screenshots/drawer.png)       |
| **Edit ticket**                                 | **Delete confirmation**                             |
| ![Edit ticket](docs/screenshots/edit.png)       | ![Delete confirmation](docs/screenshots/delete.png) |
| **Ticket history**                              | **Activity**                                        |
| ![Ticket history](docs/screenshots/history.png) | ![Activity](docs/screenshots/activity.png)          |
| **All Tickets**                                 | **Analytics**                                       |
| ![All tickets](docs/screenshots/list.png)       | ![Analytics](docs/screenshots/analytics.png)        |

Mobile (390 px wide):

<img src="docs/screenshots/mobile.png" width="260" alt="Mobile board" />

</details>

UI implementation notes:

- **Server state** lives in TanStack Query. **Updates are optimistic.** The change is applied straight away to every cached copy of the ticket: lists, board columns and stats. Then every ticket query is re-fetched, so the server has the final say. If the request fails, the cache is restored, so a card you dragged goes back to its old column. Create and delete just re-fetch once they succeed.
- **Drag and drop** uses the browser's native HTML5 drag events, with no extra library. Columns highlight when a card can be dropped on them, and dropping on the card's current column does nothing. Touch devices don't reliably support native drag and drop, so the status dropdown on each card is the fallback.
- **Dialogs** use the native `<dialog>` element with `showModal()`. The browser handles focus trapping, closing on Esc and making the background inert. `closedby="any"` closes the dialog when you click outside it, and there is a small fallback for Safari, which doesn't support `closedby`.
- **Form validation** relies on native constraints (`required`, `maxLength`, `pattern`) and the `:user-invalid` CSS pseudo-class, so errors only show after you interact with a field. `aria-invalid` is kept in sync for screen readers. The server validates everything again, and API errors are shown in the form.
- **Loading, empty and error states** (with a retry button) appear on every data view. The sidebar footer says whether the API can be reached.
- **Responsive:** below 768 px the sidebar becomes a compact top bar and the board columns stack.

## Testing

```bash
pnpm db:up
pnpm test
```

The integration tests in [apps/api/test/](apps/api/test/) start the full Nest application, with the same `ValidationPipe` setup as `main.ts`. They send real HTTP requests with Supertest to a real PostgreSQL database, `tickets_test`, which is kept separate from development data. The tables are truncated before each test. There are **39 test cases**, covering:

- **POST /tickets**: defaults applied, title trimmed, an explicit priority with the status still `open`, and six invalid payloads (including any attempt to set a status) that must return 400
- **GET /tickets**: status filter combined with pagination and newest-first order, the unfiltered list, and invalid query parameters
- **GET /tickets/:id**: returns the ticket, and 404 for a missing one
- **PATCH /tickets/:id**: status/priority updates, title/description edits with trimming, clearing a description, 404 for a missing ticket, an empty body, a blank title, an immutable field, an invalid enum value, and a non-numeric id
- **DELETE /tickets/:id**: 204, after which the ticket is gone from GET, the list and stats; 404 for a missing ticket
- **Activity log**:
  - a "created" event with the initial values
  - update events that contain only the changed fields, newest first
  - no event for an update that changes nothing, or for a failed write
  - a deleted ticket keeps its history
  - the cross-ticket feed paginates
  - invalid query parameters return 400
- **GET /tickets/stats**: zero counts for an empty table, and counts after creates and updates
- **OpenAPI document**: every endpoint, its parameters and responses, and the shared enum schemas are present

GitHub Actions ([ci.yml](.github/workflows/ci.yml)) runs the same build and tests against a Postgres service container on every push and pull request.

I also tested the UI in Chrome: creating a ticket, validation, dragging cards between columns, inline status changes, editing and deleting from the drawer, pagination, **Load more**, and the mobile layout.

## Deployment

This is a plain single-server setup on Ubuntu. Postgres runs in Docker, the API runs as a systemd service, and nginx serves the built web app and proxies `/api` to the API. The files are in [deploy/](deploy/).

```bash
# 1. Node 22 in /opt/node22 (leaves any system Node untouched), then pnpm via corepack
curl -fsSL https://nodejs.org/dist/v22.23.3/node-v22.23.3-linux-x64.tar.xz | tar -xJ -C /opt
ln -sfn /opt/node-v22.23.3-linux-x64 /opt/node22
export PATH=/opt/node22/bin:$PATH && corepack enable

# 2. Code and build
cd /var/www && git clone https://github.com/dentonya/mini-ticket-tracker.git && cd mini-ticket-tracker
pnpm install --frozen-lockfile && pnpm build

# 3. Database with a generated password (bound to 127.0.0.1 only)
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" > .env && chmod 600 .env
docker compose up -d --wait postgres

# 4. API service on 127.0.0.1:4100; its DATABASE_URL reuses the password from step 3
mkdir -p /etc/mini-ticket-tracker
printf 'PORT=4100\nDATABASE_URL=postgres://tickets:%s@127.0.0.1:5434/tickets\n' \
  "$(grep POSTGRES_PASSWORD .env | cut -d= -f2)" > /etc/mini-ticket-tracker/api.env
chmod 600 /etc/mini-ticket-tracker/api.env
cp deploy/mini-ticket-tracker-api.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now mini-ticket-tracker-api

# 5. nginx: set server_name (and listen, to match your other sites), then reload
cp deploy/nginx.conf /etc/nginx/conf.d/mini-ticket-tracker.conf
nginx -t && systemctl reload nginx
```

To update after a push:

```bash
cd /var/www/mini-ticket-tracker && git pull
export PATH=/opt/node22/bin:$PATH && pnpm install --frozen-lockfile && pnpm build
systemctl restart mini-ticket-tracker-api
```

Migrations run on API start. The web app is static, so the rebuild alone updates it.

## Beyond the brief

The required scope is the four endpoints, a single page that lists, creates and re-statuses tickets, and a few API tests. The following were added on top, deliberately and kept small:

- Swagger UI and an OpenAPI spec (`/docs`)
- Full CRUD:
  - `GET /tickets/:id` and `DELETE /tickets/:id`
  - `PATCH` can also edit the title and description
- A board where you can drag cards between status columns, plus a status filter
- An Analytics page built on `GET /tickets/stats`
- An activity log (`GET /activity`), shown as a history in each ticket and as an Activity page
- GitHub Actions CI

## Design notes

- **Shared contracts:** the API and web app import their enums and payload types from `@mtt/shared`, so a field or enum value can't change on one side only.
- **Schema:**
  - It's defined in hand-written migrations, not TypeORM's `synchronize`.
  - Status and priority are Postgres enums, so the database rejects invalid values as well as the API.
  - A `(status, created_at)` index serves both the status filter and the newest-first list.
- **New tickets always start as `open`.** The API enforces this; it isn't just left out of the form.
- **Activity log:**
  - Each event is written in the same transaction as the change it describes.
  - The ticket row is locked while the old and new values are compared, so the log can't disagree with the data, even under concurrent edits.
  - Events have no foreign key to tickets, so history survives a delete.
- **UI updates:**
  - Status changes update every cached view straight away and roll back if the request fails.
  - Create and delete re-fetch once they succeed.

## Decisions & Tradeoffs

I used NestJS (which runs on Express) for its module structure and DTO validation, pinned to v11 because v12 is ESM-only and complicates the Jest setup. To keep setup to one command, migrations run automatically when the API starts; in production they would be a separate deploy step. Pagination is offset-based (`page`/`limit`) as the brief asked, which slows down on deep pages and can skip or repeat rows while data changes, so at scale I would switch to cursor pagination on `(created_at, id)`. There is no authentication, so tickets have no reporter or assignee, and the activity log records what changed but not who changed it. The automated tests are API integration tests against a real PostgreSQL database; the UI has no automated tests and was checked by hand in Chrome. Status changes appear instantly and roll back on failure, while create and delete simply re-fetch, which keeps the complex path limited to the interaction that benefits from it. Deletes are permanent; the activity log keeps a record, but there is no undo. I kept the mockups' visual design but left out features with no backing data (assignees, sprints, PRs, velocity charts) rather than faking them. Several features go beyond the brief (listed above); on a real team I would agree that scope before building it. With more time I would add authentication with assignees, UI component and end-to-end tests, deep links to tickets, search and a priority filter, and production Dockerfiles with health checks and request logging.

### Assumptions

- New tickets always start as `open`. Create may set the priority, which defaults to `medium`.
- `PATCH` may change title, description, status and priority.
  - `id`, `createdAt` and unknown fields return 400 instead of being silently ignored.
  - An empty description clears it.
- Status changes are unrestricted; for example, closed → open is allowed.
- Titles are trimmed, required and limited to 120 characters. Descriptions are limited to 5,000 characters.
- Tickets created before the activity log existed get a backfilled "created" event, with status `open` and their current priority.
