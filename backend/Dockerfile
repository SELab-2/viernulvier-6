FROM rust:1.91-slim AS builder
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
ENV SQLX_OFFLINE=true
RUN cargo build --release


FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/viernulvier_api .
CMD ["./viernulvier_api"]