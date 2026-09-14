.PHONY: up down test lint seed

up:
	docker compose up --build -d

down:
	docker compose down

test:
	docker compose run --build --rm backend pytest -q
	docker compose run --build --rm --no-deps frontend npm test

lint:
	docker compose run --build --rm --no-deps backend ruff check .
	docker compose run --build --rm --no-deps frontend npm run lint

seed:
	@echo "Seed data will be added by a later foundation task."
