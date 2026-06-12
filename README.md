# TaskManager

Full-stack task management application — Next.js, Go, PostgreSQL.

## Stack

- Frontend: Next.js 16, React 19, Tailwind CSS v4
- Backend: Go, Gin
- Database: PostgreSQL 16
- Auth: JWT
- Realtime: Server-Sent Events
- Storage: AWS S3 (optional)

## Run with Docker

Requires Docker Desktop only.

```bash
copy .env.example .env   # fill in JWT_SECRET and optionally AWS vars
docker compose up --build
```

- App: http://localhost:3000
- API: http://localhost:8080

## Run locally

Requires Go 1.24+, Node.js 20+, PostgreSQL 16+

```bash
copy .env.example .env   # set DATABASE_URL to your local PostgreSQL
```

Terminal 1 — backend:

```bash
cd backend && go run .
```

Terminal 2 — frontend:

```bash
cd frontend && npm install && npm run dev
```

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_USER` | Yes | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `POSTGRES_DB` | Yes | Database name |
| `DATABASE_URL` | Yes | Connection string (Docker sets this automatically) |
| `JWT_SECRET` | Yes | JWT signing secret |
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL for the frontend |
| `AWS_*` | No | S3 credentials — leave blank to disable attachments |

## Tests

```bash
cd backend && go test ./...
cd frontend && npm run lint
```

## Admin

Sign up normally, then run:

```bash
docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "UPDATE users SET role = 'admin' WHERE email = 'you@example.com';"
```

Log out and back in for the change to take effect.

## Assumptions

- Attachments are optional — app works without S3 credentials
- SSE is used instead of WebSockets because the `/events` endpoint requires an `Authorization` header, which `EventSource` does not support
- Database migrations run automatically on backend startup
- JWT is stored in localStorage for simplicity
