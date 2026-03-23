# VIERNULVIER Archief

A frontend web application for the VIERNULVIER archive, built with Next.js 16, React 19, and Tailwind CSS v4.

---

## 🛠 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Library:** React 19 (with React Compiler)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui, `next-themes` (Dark/Light mode)
- **Data Fetching:** TanStack React Query v5
- **Internationalization:** `next-intl` (English & Dutch)
- **Environment Variables:** `@t3-oss/env-nextjs` & Zod
- **Code Quality:** ESLint, Prettier, Knip (unused dependency/export detection)

---

## 🚀 Getting Started

### 1. Prerequisites

Make sure you have Node.js (v20+ recommended) and `npm` installed.

### 2. Installation

Clone the repository and install the dependencies:

```bash
npm install

```

### 3. Environment Variables

Create a `.env` or `.env.local` file in the root directory. This project uses `@t3-oss/env-nextjs` for type-safe environment variables. Refer to `src/env.ts` for the required keys.

### 4. Running the Development Server

Start the development server using Turbopack for faster builds:

```bash
npm run dev

```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) to view the application.

---

## 📜 Available Scripts

| Command            | Description                                                  |
| ------------------ | ------------------------------------------------------------ |
| `npm run dev`      | Starts the development server with Turbopack.                |
| `npm run build`    | Builds the application for production.                       |
| `npm run start`    | Starts the production server.                                |
| `npm run lint`     | Runs ESLint to check for code issues.                        |
| `npm run lint:fix` | Runs ESLint with the `--fix` flag and formats with Prettier. |
| `npm run knip`     | Runs Knip to find unused files, exports, and dependencies.   |

---

## 📁 Project Structure

The codebase strictly follows the Next.js App Router paradigm, housed entirely within the `src` directory:

- **`src/app/[locale]/`**: The main application routes, wrapped in the `next-intl` locale segment for routing (`en`, `nl`).
- **`src/components/`**: React components categorized by purpose:
- `/layout`: High-level layout components (Header, Footer).
- `/shared`: Reusable composite components (Theme Switcher, Locale Switcher).
- `/ui`: Primitive, highly reusable UI components (auto built with shadcn/ui & Radix UI).

- **`src/config/`**: Static configuration files for SEO and site metadata.
- **`src/i18n/` & `src/messages/**`: Internationalization setup and the JSON dictionaries (`en.json`, `nl.json`) containing translations.
- **`src/lib/`**: Utility functions, helpers, and the React Query client setup.
- **`src/providers/`**: Global context providers (Theme, Query, Intl) wrapped for server/client boundary management.
- **`src/env.ts`**: Zod schema for runtime environment variable validation.

---

## API Layer Convention

Server-state code follows a strict separation to keep UI components decoupled from backend contracts:

- **`src/types/api/generated.ts`**: Auto-generated OpenAPI types from the local backend (`openapi-typescript`).
- **`src/types/api/`**: Aliases around generated schema types (no manual schema duplication).
- **`src/mappers/`**: Pure mapper functions that translate API DTOs to frontend domain models and map mutation inputs to API payloads.
- **`src/types/models/`**: Frontend domain models consumed by components and feature logic.
- **`src/hooks/api/`**: TanStack Query hooks (`useQuery`/`useMutation`) that call the API client, apply mappers, and expose only domain models.

Use `@/hooks/api` barrel imports when consuming query hooks and query keys.

### OpenAPI Type Generation

- Generate latest API types with:

```bash
npm run generate:api-types
```

- Types are generated from `NEXT_PUBLIC_API_URL/openapi.json` (defaults to `http://localhost:3001/api/openapi.json`).
- The pre-push hook automatically regenerates types before typecheck/lint to catch backend/frontend contract drift.

### Testing Note (MSW)

- For upcoming tests, prefer MSW handlers that are typed against generated OpenAPI response/request aliases from `src/types/api/`.
- Keep tests asserting domain model behavior by mocking DTOs and validating mapper output.

---

## 🧩 Key Architecture Decisions

- **React Compiler:** This project leverages the `babel-plugin-react-compiler`, reducing the need for manual `useMemo` and `useCallback` hooks.
- **Type-Safe Environment:** Environment variables are strictly typed. The build will fail if required variables in `src/env.ts` are missing or invalid.
- **Maintenance:** Use `npm run knip` regularly before committing to ensure no dead code or unused dependencies accumulate in the repository.
