FROM rust:1.91-slim-bookworm AS builder

# 1. Install system dependencies for AWS SDK and SQLx
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Copy the manifest files first
COPY Cargo.toml Cargo.lock ./
COPY database/Cargo.toml database/Cargo.toml
COPY api/Cargo.toml api/Cargo.toml

# 3. Create dummy source files for the workspace members AND the root
# We use lib.rs for members and main.rs for the root binary
RUN mkdir -p database/src api/src src && \
    echo "pub fn dummy() {}" > database/src/lib.rs && \
    echo "pub fn dummy() {}" > api/src/lib.rs && \
    echo "fn main() { println!(\"dummy\"); }" > src/main.rs

# 4. Build dependencies (this layer will be cached)
RUN cargo build --release
RUN rm -f target/release/deps/viernulvier_api*

# 5. Copy actual source code and build for real
COPY . .
ENV SQLX_OFFLINE=true
RUN cargo build --release

# --- Runtime Stage ---
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/viernulvier_api .

# Ensure the binary is executable
RUN chmod +x ./viernulvier_api

CMD ["./viernulvier_api"]