# ContaNova ERP

ERP empresarial moderno para gestión contable, facturación, inventarios, cartera y CRM de empresas latinoamericanas.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/contanova run dev` — run the frontend (port 25277)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS + Shadcn UI + Framer Motion + Recharts + Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all contracts)
- `lib/db/src/schema/` — Drizzle table schemas (clientes, proveedores, productos, facturas, compras, contabilidad, crm)
- `artifacts/api-server/src/routes/` — Express route handlers (dashboard, clientes, proveedores, productos, facturas, compras, cartera, contabilidad, crm)
- `artifacts/contanova/src/` — React frontend ERP
- `attached_assets/image_1780897460881.png` — ContaNova logo

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → React Query hooks (frontend) + Zod schemas (backend validation)
- Numeric DB values stored as `numeric(14,2)` strings in Drizzle, cast to `Number()` in routes before sending JSON
- IVA (tax) hardcoded at 19% (Colombia standard) — invoices auto-calculate subtotal + impuesto + total
- Cartera routes derive CxC/CxP from factura/compra `saldo_pendiente` field; abonos reduce `saldo_pendiente` in-place
- Dark-mode-first design with navy (#0a1628) + electric blue gradient (#1a56e8 → #00d4ff) brand identity

## Product

ContaNova ofrece: Dashboard ejecutivo con KPIs en tiempo real, gestión de clientes y proveedores, catálogo de productos con control de inventario, facturación electrónica con items dinámicos, órdenes de compra, cartera (CxC/CxP) con abonos, plan de cuentas contables con comprobantes, y pipeline CRM tipo Kanban.

## User preferences

- Nombre del software: ContaNova
- Logo: `attached_assets/image_1780897460881.png`
- Idioma de la UI: Español

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before touching frontend
- `pnpm --filter @workspace/db run push` after any schema change in `lib/db/src/schema/`
- Numeric Drizzle columns return strings — always wrap with `Number()` before JSON responses
- Express 5 wildcard routes must use `/{*splat}` syntax, NOT bare `*`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
