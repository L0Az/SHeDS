format:
	uv run isort app config
	uv run black app config
	uv run flake8 app config

test:
	PYTHONPATH=uv run pytest -q --cov-report "xml:coverage.xml" --cov-append --cov=app app

tests:
	PYTHONPATH=vendor uv run pytest -q --cov-report "xml:coverage.xml" --cov-report=term-missing:skip-covered --cov-append --cov=app app > pytest-coverage.txt

run_prod:
	docker run -p 443:9000 --network sheds_default sheds_prod

build:
	docker build -t sheds .