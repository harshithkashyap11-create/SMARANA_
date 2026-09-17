.PHONY: up down test lint seed

up:
	docker compose up --build -d

down:
	docker compose down

test:
	docker compose run --build --rm -e DJANGO_SETTINGS_MODULE=config.settings.test backend pytest -q
	docker compose run --build --rm --no-deps frontend npm test -- --run

lint:
	docker compose run --build --rm --no-deps backend ruff check .
	docker compose run --build --rm --no-deps frontend npm run lint

seed:
	docker compose exec backend python manage.py seed_demo

local:
	./scripts/start-local.sh
