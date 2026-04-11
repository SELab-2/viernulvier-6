[![codecov](https://codecov.io/gh/SELab-2/viernulvier-6/graph/badge.svg?token=Z5Fi36Jin3)](https://codecov.io/gh/SELab-2/viernulvier-6) [![CI/CD Pipeline Production](https://github.com/SELab-2/viernulvier-6/actions/workflows/build-push-deploy.yml/badge.svg)](https://github.com/SELab-2/viernulvier-6/actions/workflows/build-push-deploy.yml)

# viernulvier-6

| Service  | Status                                                                     | Uptime (30d)                                                                                          | Avg Response                                                                           | Cert Expiry                                                                       |
| -------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Frontend | ![Status](http://46.224.176.244:3001/api/badge/1/status?style=flat-square) | ![Uptime](http://46.224.176.244:3001/api/badge/1/uptime/720?style=flat-square&label=30&labelSuffix=d) | ![Avg Response](http://46.224.176.244:3001/api/badge/1/avg-response?style=flat-square) | ![Cert Expiry](http://46.224.176.244:3001/api/badge/1/cert-exp?style=flat-square) |
| Backend  | ![Status](http://46.224.176.244:3001/api/badge/4/status?style=flat-square) | ![Uptime](http://46.224.176.244:3001/api/badge/4/uptime/720?style=flat-square&label=30&labelSuffix=d) | ![Avg Response](http://46.224.176.244:3001/api/badge/4/avg-response?style=flat-square) | ![Cert Expiry](http://46.224.176.244:3001/api/badge/4/cert-exp?style=flat-square) |

## External Services

- [Uptime Monitor](http://46.224.176.244:3001/status/viernulvier-archief)

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

[Full Documentation](http://localhost:3002)
