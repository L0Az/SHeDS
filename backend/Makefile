format:
	uv run isort app config
	uv run black app config
	uv run flake8 app config

test:
	uv run pytest -q --cov-report "xml:coverage.xml" --cov-append --cov=app app || ( ret=$$?; [ $$ret -eq 5 ] && exit 0 || exit $$ret )

tests:
	uv run pytest -q --cov-report "xml:coverage.xml" --cov-report=term-missing:skip-covered --cov-append --cov=app app > pytest-coverage.txt || ( ret=$$?; [ $$ret -eq 5 ] && exit 0 || exit $$ret )

run_prod:
	docker run -p 443:9000 --network sheds_default sheds_prod

build:
	docker build -t sheds .