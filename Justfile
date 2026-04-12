# Show available commands by default
default:
    @just --list

# ==========================================
# Infrastructure (Docker Compose)
# ==========================================

# Start local infrastructure (Postgres, Traefik, etc.) in the background
infra-up:
    docker compose -f infra/preview/docker-compose.preview.yml up -d

# Stop local infrastructure
infra-down:
    docker compose down

# View infrastructure logs
infra-logs:
    docker compose logs -f

# ==========================================
# Backend (Rust)
# ==========================================

# Start the backend server
be-dev:
    cd backend && cargo run

# Run backend tests
be-test:
    cd backend && cargo test

# Generate backend coverage report
be-cov:
    @cargo llvm-cov --version > /dev/null 2>&1 || cargo install cargo-llvm-cov
    cd backend && cargo llvm-cov --html
    @echo "Done! Open backend/target/llvm-cov/html/index.html to view."

# Run backend linter
be-lint:
    cd backend && cargo clippy -- -D warnings
    cd backend && cargo fmt --all -- --check

# ==========================================
# Frontend (Next.js)
# ==========================================

# Install frontend dependencies
fe-install:
    cd frontend && npm install

# Run frontend dev server
fe-dev:
    cd frontend && npm run dev

# Run frontend linter
fe-lint:
    cd frontend && npm run lint

# Fix frontend linting and formatting issues automatically
fe-lint-fix:
    cd frontend && npm run lint:fix

# Run TypeScript typechecking
fe-typecheck:
    cd frontend && npm run typecheck

# Run frontend unit tests (Vitest)
fe-test:
    cd frontend && npm run test:run

# Generate frontend test coverage
fe-cov:
    cd frontend && npm run test:coverage

# Run frontend End-to-End (E2E) tests via Playwright
fe-test-e2e:
    cd frontend && npm run test:e2e

# Open Playwright UI for interactive E2E testing
fe-test-e2e-ui:
    cd frontend && npm run test:e2e:ui

# Build the Next.js frontend for production
fe-build:
    cd frontend && npm run build

# Generate OpenAPI types (syncs API types from backend)
fe-gen-types:
    cd frontend && npm run generate:api-types

# ==========================================
# Monorepo (Global)
# ==========================================

# Run all tests (backend + frontend)
test-all: be-test fe-test

# Generate all coverage reports
cov-all: be-cov fe-cov

# Lint both backend and frontend
lint-all: be-lint fe-lint

# Full strict check (linting + frontend typechecking)
check-all: be-lint fe-lint fe-typecheck