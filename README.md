# acquisitions

## Docker development with Neon Local

Copy `.env.development.example` to `.env.development` and set
`NEON_API_KEY`, `NEON_PROJECT_ID`, and `PARENT_BRANCH_ID`. The development
Compose file runs the app and Neon Local.
Neon Local creates an ephemeral branch from `PARENT_BRANCH_ID` and removes it
when the Compose environment stops.

```sh
docker compose up --build
```

The app is available at <http://localhost:3000>. Inside the Compose network,
the app uses `postgres://neon:npg@neon-local:5432/neondb?sslmode=require`.
The `NEON_FETCH_ENDPOINT` setting makes the Neon serverless driver use Neon
Local's HTTP endpoint. Run migrations from the app container when needed:

```sh
docker compose exec app npm run db:migrate
```

## Production with Neon Cloud

Copy `.env.production.example` to `.env.production` and replace
`DATABASE_URL` with the connection string from your Neon Cloud project. Do not
run Neon Local in production; Neon Cloud is an external serverless database.

```sh
docker compose -f docker-compose.prod.yml up --build -d
```

The production app is available at <http://localhost:3000>. Stop it with:

```sh
docker compose -f docker-compose.prod.yml down
```