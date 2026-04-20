[![codecov](https://codecov.io/gh/SELab-2/viernulvier-6/graph/badge.svg?token=Z5Fi36Jin3)](https://codecov.io/gh/SELab-2/viernulvier-6) [![CI/CD Pipeline Production](https://github.com/SELab-2/viernulvier-6/actions/workflows/build-push-deploy.yml/badge.svg)](https://github.com/SELab-2/viernulvier-6/actions/workflows/build-push-deploy.yml)

# viernulvier-6

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) v24+
- [Docker](https://docs.docker.com/get-docker/)
- [Rust](https://rustup.rs/)
- [Bacon](https://dystroy.org/bacon/) (`cargo install bacon`)

### Quick Start

```bash
# 1. Setup environment
cp infra/dev/.env.dev.example infra/dev/.env
cp frontend/.env.local.example frontend/.env.local

# 2. Install dependencies
npm run install:all

# 3. Start everything
npm run dev
```

### Services

| Service     | URL                     |
| ----------- | ----------------------- |
| Frontend    | <http://localhost:3000> |
| Backend API | <http://localhost:3001> |
| Docs        | <http://localhost:3002> |
| PostgreSQL  | localhost:5432          |
| Garage S3   | localhost:3900          |

### Commands

| Command                | Description                           |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Start full dev stack                  |
| `npm run install:all`  | Install all dependencies              |
| `npm run dev:services` | Start only Docker services            |
| `npm run dev:stop`     | Stop all services                     |
| `npm run dev:cleanup`  | Stop and remove all data              |

[Full Documentation](https://sel2-6.ugent.be/docs)
