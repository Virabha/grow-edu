# PrimeFX

PrimeFX backend API (NestJS) for the Prime Assets Education & Training Platform.

## Repos / folders on this machine

- **Backend (this repo)**: `PrimeFX/`
- **Frontend (separate repo)**: `prime-fx-frontend/`

## Backend (NestJS) — `PrimeFX/`

### Prerequisites

- Node.js 20+
- pnpm
- Postgres (for full functionality)

### Setup

```bash
cd PrimeFX
pnpm install
```

### Run (dev)

```bash
pnpm start:dev
```

Default port is **4000**.

- **Health**: `http://localhost:4000/health`
- **Swagger**: `http://localhost:4000/api-docs`

### Database

Push schema / run migrations (choose what your workflow uses):

```bash
pnpm db:push
# or
pnpm db:migrate
```

Seed demo data:

```bash
pnpm db:seed
```

See `SEED_README.md` for details and demo credentials.

## Frontend (Next.js) — `prime-fx-frontend/`

```bash
cd ../prime-fx-frontend
pnpm install
pnpm dev
```

If port 3000 is busy, Next will pick another port (e.g. **3001**).

## Notes

- Generated build output like `.next/`, `dist/`, `node_modules/`, `*.tsbuildinfo`, and `next-env.d.ts` are ignored via `.gitignore`.
- Do **not** commit `.env` files. Use `.env.example` as the template.

