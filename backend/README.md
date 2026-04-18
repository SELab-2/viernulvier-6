# How to setup development for the backend

### Tools needed

- [Rust](https://rust-lang.org/learn/get-started/)
- [Podman](https://podman.io/) or [Docker](https://www.docker.com/) (or a local postgres database)

#### Optional

- [sqlx-cli](https://docs.rs/crate/sqlx-cli/latest)

## First setup

Setup your .env file

```sh
cp .env.example .env
```

> [!CAUTION]
> Make sure to add your api key for the VierNulVier API, or the import will not work

Setup your database container. Migrations happen automatically at startup.

```sh
podman run --name sel2-dev-postgres -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_USER=sel2-dev -e POSTGRES_DB=sel2-dev postgres:latest
```

You can add `--rm` here which means your data will be deleted when you stop the container, this makes it easier to test the api import.

`^C` will stop your container, but not delete it (unless you added `--rm`)

## Running

Start the database in a second terminal.

```sh
podman start sel2-dev-postgres --attach
```

Start the backend.

```sh
cargo run
```

## Running tests

```sh
cargo test --all
```

This requires a running database.

## Test coverage

Install `cargo-llvm-cov`:
```sh
cargo install cargo-llvm-cov
```

Run coverage:
```sh
# Quick overview in terminal
cargo llvm-cov

# Detailed HTML report (saved to target/llvm-cov/html/index.html)
cargo llvm-cov --html

# As text file
cargo llvm-cov --text
```

## Seed pipeline (offline normalization)

The 404 API data is messy, so we normalize it offline and ship the result as a
Postgres dump restored on first boot of every environment. See
[issue #253](https://github.com/SELab-2/viernulvier-6/issues/253) for the full
design.

### Prerequisites

Git LFS must be installed once per machine:

```sh
git lfs install
```

The artifacts under `backend/seed/raw/*.json` and `backend/seed/*.sql` are
tracked via LFS.

### Stage 1: mirror the 404 API to local JSON

Produces `backend/seed/raw/*.json` + `manifest.json`. No DB, no LLM.

Full refresh (takes ~15 min, mostly gallery fetches):

```sh
API_KEY_404=... cargo run --release -p api --bin fetch_404
```

Selective fetch - useful when only refreshing taxonomies:

```sh
cargo run -p api --bin fetch_404 -- --list                              # show names
cargo run -p api --bin fetch_404 -- tags genres uitdatabank_keywords    # fetch these
cargo run -p api --bin fetch_404 -- --only productions,events           # comma form
```

Selected counts merge into the existing `manifest.json`; untouched entries are
preserved. `max_updated_at` is only overwritten when `productions` is in the
selection. `media_galleries` requires productions in memory or on disk.

Idempotent: rerunning overwrites the targeted files. Only run when refreshing
data from the 404 API; bumping the normalizer alone does not require rerunning
this.

### Stage 2: normalize into a seed DB and dump

TODO - implemented in a later issue (#286). Will read `backend/seed/raw/*.json`,
run normalization, and emit `backend/seed/seed.sql` via `pg_dump --data-only`.

### LLM normalization (feature-gated)

The normalization module at `api/src/normalization/` is the shared foundation
used by the inline importer path and (eventually) the stage 2 seed binary.
Compiled out by default; enable with the `ai-normalization` cargo feature:

```sh
cargo build -p api --features ai-normalization
```

Env vars (all optional; defaults target Groq's free tier):

- `LLM_PROVIDER`: only `groq` is supported; leaving this unset is fine
- `LLM_API_KEY`: Groq API key; if unset, normalization is skipped with a
  one-time warning and the importer still runs
- `LLM_MODEL`: overrides the default (`llama-3.3-70b-versatile`)
- `LLM_BASE_URL`: optional override for testing
- `LLM_CONFIDENCE_THRESHOLD`: float in `[0.0, 1.0]`, default `0.8`

Actions executed by the normalizer are persisted to the `normalization_log`
table (see migration `20260415000000_normalization_log`).
## sqlx offline mode

The Docker build uses `SQLX_OFFLINE=true`, so sqlx checks queries at compile time using the cached metadata in `.sqlx/` instead of connecting to a live database.

Whenever you add or modify a `query!` or `query_as!` macro, regenerate the cache and commit it:

```sh
cargo sqlx prepare --workspace
```

This requires a running database and `DATABASE_URL` set in your `.env`.
