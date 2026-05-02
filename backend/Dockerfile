FROM rust:1.91-slim-bookworm AS builder

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
ENV SQLX_OFFLINE=true
RUN cargo build --release

FROM debian:bookworm-slim
# Note: Switched libssl-dev to libssl3 for the runtime stage (smaller/correct package)
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/viernulvier_archive .
COPY --from=builder /app/seed ./seed
CMD ["./viernulvier_archive"]
