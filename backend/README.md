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

## sqlx offline mode

The Docker build uses `SQLX_OFFLINE=true`, so sqlx checks queries at compile time using the cached metadata in `.sqlx/` instead of connecting to a live database.

Whenever you add or modify a `query!` or `query_as!` macro, regenerate the cache and commit it:

```sh
cargo sqlx prepare --workspace
```

This requires a running database and `DATABASE_URL` set in your `.env`.
