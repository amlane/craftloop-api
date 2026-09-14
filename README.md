# <p align="center">Node.js + Express API with JWT Auth (Knex / Postgres)</p>

A small boilerplate for a Node.js REST API with register/login, password hashing
(bcrypt), JWT-protected routes, and a Knex + Postgres database (Postgres runs
locally via Docker).

Stack: **Express 4**, **Knex 3**, **pg 8** (Postgres), **helmet 8**, **bcryptjs 3**,
**jsonwebtoken 9**, **express-rate-limit 8**, **dotenv**. Requires **Node 20+**
and **Docker**.

---

## Quick start (after forking / cloning)

```bash
nvm use                     # optional, respects .nvmrc (Node 20)
npm install
cp .env.example .env         # then set JWT_SECRET, POSTGRES_PASSWORD,
                              # DATABASE_URL_LOCAL, DATABASE_URL_TEST

docker compose up -d         # starts local Postgres (creates the craftloop_dev database)

# one-time: the Postgres image only auto-creates the database named in
# POSTGRES_DB (craftloop_dev) - the test database needs to be created manually
docker exec -it craftloop_postgres createdb -U craftloop_db_user craftloop_test

npm run migrate              # apply migrations to DATABASE_URL_LOCAL
npm run seed                 # optional: insert sample users + a sample pattern
npm run server                # start with nodemon on http://localhost:8000
```

Other scripts:

| Command | Description |
| --- | --- |
| `npm start` | Run without nodemon (production) |
| `npm test` | Run the Vitest + Supertest suite (against the Postgres database at `DATABASE_URL_TEST`) |
| `npm run migrate` / `npm run rollback` | Apply / undo migrations (uses `NODE_ENV`, defaults to `development`) |
| `npm run seed` | Run seed files |

---

## Local Postgres (Docker)

`docker-compose.yml` at the repo root defines a single `postgres:16` service
(container name `craftloop_postgres`) with a named volume, so data survives
`docker compose restart` / machine reboots.

```bash
docker compose up -d      # start Postgres in the background
docker compose ps         # check it's healthy
docker compose down       # stop it (keeps the data volume)
docker compose down -v    # stop it AND wipe the data volume (full reset)
```

Connect with `psql` or any GUI client using the credentials in `.env`
(`POSTGRES_PASSWORD`, plus the user/db baked into `docker-compose.yml`:
`craftloop_db_user` / `craftloop_dev`).

Two databases are expected inside the container - `craftloop_dev` (created
automatically on first boot) and `craftloop_test` (create it yourself once,
see Quick start above, or after a `docker compose down -v` reset).

---

## Environment variables

Configured in `.env` (git-ignored). See `.env.example`.

| Variable | Notes |
| --- | --- |
| `PORT` | HTTP port (default `8000`) |
| `NODE_ENV` | `development` \| `test` \| `production` |
| `JWT_SECRET` | **Required in production** — the app throws without it |
| `POSTGRES_PASSWORD` | Password for the local Docker Postgres container - must match what you connect with |
| `DATABASE_URL_LOCAL` | Connection string for local dev, e.g. `postgresql://craftloop_db_user:<password>@localhost:5432/craftloop_dev` |
| `DATABASE_URL_TEST` | Same shape, pointed at the `craftloop_test` database - used when `NODE_ENV=test` |
| `DATABASE_URL_PROD` | Connection string for the deployed database. Not set up yet - hosting is still TBD (evaluating Supabase's free Postgres tier). Many managed Postgres providers require `ssl` on the connection; `knexfile.js` has a note about this for when it's relevant. |

---

## API

| Method | Route | Auth | Body | Description |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | – | `{ username, password }` | Create a user, returns `{ user, token }` |
| `POST` | `/api/auth/login` | – | `{ username, password }` | Returns `{ user, token }` |
| `GET` | `/api/users` | Bearer token | – | List users (no password hashes) |
| `GET` | `/api/users/:id` | Bearer token | – | One user |
| `GET` | `/api/patterns` | Bearer token | – | List patterns |
| `POST` | `/api/patterns` | Bearer token | pattern fields (see `data/migrations/`) | Create a pattern for the authenticated user |
| `PUT` | `/api/patterns/:id` | Bearer token | partial pattern fields | Update a pattern |
| `DELETE` | `/api/patterns/:id` | Bearer token | – | Delete a pattern |

Send the token as `Authorization: Bearer <token>` (a raw token without the
`Bearer ` prefix is also accepted). The `/api/auth` routes are rate-limited to
20 requests per 15 minutes per IP.

`tags` and `sections` on a pattern are plain JS arrays/objects in requests and
responses - they're stored as `jsonb` columns and knex's `pg` driver
serializes/deserializes them automatically, no manual `JSON.stringify`/`parse`
needed at the call site. Photo storage is not wired up yet (see `pattern_photos`
migration and the `TO DO` in `patterns-router.js`).

---

## Project layout

```
index.js                     entrypoint (loads .env, starts the server)
knexfile.js                  per-environment Knex config (Postgres)
docker-compose.yml           local Postgres container
API/server.js                Express app: middleware + route mounting
config/secrets.js            JWT secret resolution
middleware/
  restricted-middleware.js   verifies the JWT, attaches req.decodedToken
users/
  auth-router.js             /api/auth register + login
  users-router.js            /api/users (restricted)
  users-model.js             DB helpers
patterns/
  patterns-router.js         /api/patterns (restricted)
  patterns-model.js          DB helpers
data/
  dbConfig.js                Knex instance for the active NODE_ENV
  migrations/                schema
  seeds/                     sample data
test/
  auth.test.js               integration tests
```

---

## Notes on building this from scratch

1. `npm init -y`, then `npm i express helmet cors knex pg dotenv express-rate-limit bcryptjs jsonwebtoken` and `npm i -D nodemon vitest supertest`.
2. `npx knex init`, then point the config at `pg`:

   ```js
   module.exports = {
     development: {
       client: "pg",
       connection: process.env.DATABASE_URL_LOCAL,
       migrations: { directory: "./data/migrations" },
       seeds: { directory: "./data/seeds" }
     }
   };
   ```

   Postgres enforces foreign keys by default, so there's no SQLite-style
   pragma/`afterCreate` hook needed.

3. `npx knex migrate:make users` and define the schema (see `data/migrations/`).
   Prefer `.jsonb(...)` over `.json(...)` for columns you may want to query or
   index into later (used for `tags`/`sections` on `patterns`).
4. `npx knex seed:make 001-users` — note that in Knex 3 the seed signature is
   `exports.seed = async function (knex) { ... }` (no `Promise` argument).
5. `data/dbConfig.js`:

   ```js
   const knex = require("knex");
   const config = require("../knexfile.js");
   module.exports = knex(config[process.env.NODE_ENV || "development"]);
   ```

6. Local Postgres for development: a `docker-compose.yml` with a single
   `postgres` service (image, `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`,
   port `5432:5432`, a named volume for persistence). The image only
   auto-creates the one database named in `POSTGRES_DB` - a second database for
   the `test` environment has to be created manually (`createdb`) after the
   container is up.
