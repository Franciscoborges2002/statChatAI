# Docker

Runs the backend only. Requires `backend/.env` with `OPENAI_API_KEY` set (copy from `backend/.env.example`).

## Production

```bash
docker compose up backend
```

Builds `backend/Dockerfile`, serves on **:8000**, no reload.

## Development

```bash
docker compose --profile dev up backend-dev
```

Builds `backend/Dockerfile.dev`, mounts `backend/app` for live reload on code changes.

Both services mount `backend/data` as a volume so the answer cache and any fetched match data persist across restarts.
