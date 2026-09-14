# Smārana

Smārana is an offline-capable care and memory-support platform for elderly people in North-East India. The repository is a monorepo with a Django backend and a React/TypeScript PWA frontend.

## Prerequisites

- Git
- Docker Desktop or Docker Engine with Docker Compose
- GNU Make

Node.js 20 and Python 3.12 are supplied by the development containers, so they are not required on the host for the standard workflow.

## Start the development environment

Copy the example environment file if you want to override the safe development defaults:

```sh
cp .env.example .env
```

Build and start every service:

```sh
make up
```

The first build downloads container images and language packages, so it can take a few minutes.

## Development URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend health check | http://localhost:8000/api/v1/health/ |
| Django Admin | http://localhost:8000/admin/ |
| MinIO API | http://localhost:9000 |
| MinIO console | http://localhost:9001 |

PostgreSQL and Redis are available to the application containers on the internal Compose network. Every host port and credential used by Docker Compose is documented in `.env.example`.

## Common commands

```sh
make up      # build and start all services
make down    # stop all services
make test    # run the current backend and frontend checks
make lint    # run the current backend and frontend static checks
make seed    # seed command placeholder until demo data is introduced
```

You can inspect service state and logs directly:

```sh
docker compose ps
docker compose logs -f
```

## Repository layout

```text
backend/            Django backend and Celery processes
frontend/           React/TypeScript PWA
shared/             Cross-language fixtures and test vectors
docs/               Product and engineering specifications
tasks/              Ordered implementation task cards
.github/workflows/  Continuous-integration workflows
```

Development follows one task card at a time. See [the task-card guide](tasks/README.md) before starting a task.
