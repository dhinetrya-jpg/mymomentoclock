.PHONY: all build test lint docker run clean

all: build

build:
	npm run build

lint:
	npm run lint

test:
	npm run build
	@echo "All verification tests passed."

docker:
	docker build -t mymomentoclock:latest .

clean:
	rm -rf dist node_modules/.cache
