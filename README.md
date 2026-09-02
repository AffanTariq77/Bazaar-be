# BAZAAR — Backend

REST API for **BAZAAR**, a Daraz-inspired Pakistani marketplace built as a university full-stack project. This repo is the backend; the frontend lives in a companion repo, [`Bazaar-fe`](https://github.com/AffanTariq77/Bazaar-fe).

Every feature here is backed by a real PostgreSQL database through Prisma — there is no mocked or frontend-only state anywhere in the stack.

## Features

- **Auth** — JWT access/refresh tokens, bcrypt password hashing, httpOnly refresh cookie, role-based guards (`CUSTOMER`, `SELLER`, `ADMIN`)
- **Catalog** — categories with parent/child relationships, products with images and inventory, full-text-ish search, filtering (category, brand, price, rating, discount, free shipping, in-stock), sorting, pagination
- **Cart & wishlist** — server-persisted, stock-checked on every mutation, move-to-cart
- **Checkout & orders** — address book, delivery/payment method selection, coupon application; order creation runs inside a single DB transaction that decrements inventory with a guarded conditional update, so stock can never go negative even under concurrent/stale carts
- **Reviews** — gated on an actual purchase, one per user per product, keeps a denormalized average rating + count on the product
- **Seller dashboard** — sales/revenue/order stats, product CRUD (with stock/price updates), order status management scoped to the seller's own products
- **Admin dashboard** — platform-wide stats and lightweight charts (revenue/orders/signups over the last 7 days, top categories/products), read access to users/sellers/products/orders/categories, order status override
- **Coupons** — admin CRUD, validation (min order amount, expiry, usage limit, one-per-user), discount capped at a configured maximum
- **Notifications** — created automatically on order status changes
- **Security** — helmet secure headers, rate limiting (global + a stricter limit on login/register), DTO validation on every mutating endpoint, ownership checks that return 404 rather than 403 to avoid leaking existence of other users' data

## Architecture

NestJS modular monolith — one module per domain (`auth`, `users`, `products`, `categories`, `cart`, `wishlist`, `addresses`, `orders`, `reviews`, `sellers`, `admin`, `coupons`, `notifications`), each with its own controller, service, and DTOs. A single `PrismaService` (in `database/`) is injected everywhere; there is no repository-pattern layer on top of it since Prisma already is that abstraction.

`common/` holds cross-cutting pieces:
- `filters/http-exception.filter.ts` + `interceptors/response.interceptor.ts` — every response is wrapped as `{ success, data, message }` / `{ success: false, message, statusCode }`
- `guards/jwt-auth.guard.ts` + `guards/roles.guard.ts` with `@CurrentUser()` / `@Roles()` decorators
- `not-found.module.ts` — a wildcard 404 handler. **It must stay the last entry in `AppModule`'s imports** — Nest maps routes in import order, and a wildcard registered earlier will shadow every route that comes after it. (This bit twice during development; see commit history on `app.module.ts` if you're debugging a route that mysteriously 404s.)
- `auth-guards.module.ts` — a `@Global()` module registering `PassportModule.register({ defaultStrategy: 'jwt' })` once, so any feature module can use `JwtAuthGuard` without re-registering `PassportModule` itself (another thing that bit twice).

## Tech stack

Node.js, TypeScript, NestJS 12, Prisma 6 + PostgreSQL, JWT (`@nestjs/jwt` + Passport), bcrypt, class-validator/class-transformer, Swagger, Vitest + Supertest for e2e tests, oxlint.

## Folder structure

```
src/
  auth/          users/         products/      categories/
  cart/          wishlist/      addresses/     orders/
  reviews/       sellers/       admin/         coupons/
  notifications/ common/        database/
  app.module.ts  main.ts
prisma/
  schema.prisma  seed.ts        migrations/
test/
  *.e2e-spec.ts  utils/
```

Each feature folder follows the same shape: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`.

## Database schema overview

`User` (roles: CUSTOMER/SELLER/ADMIN) → `Seller` (1:1) and `Address[]`. `Category` self-relates for parent/child. `Product` belongs to a `Category` and `Seller`, has `ProductImage[]` and a 1:1 `Inventory`. `Cart`/`Wishlist` are 1:1 with `User`, each with their own item join table. `Order` has `OrderItem[]`, a 1:1 `Payment`, an optional `Coupon`, and belongs to an `Address`. `Review` is unique per `(productId, userId)`. `Coupon` has `CouponUsage[]` (unique per `(couponId, userId)`, enforcing one use per customer). `Notification` belongs to a `User`.

Full definitions: [`prisma/schema.prisma`](prisma/schema.prisma).

## Installation

Requires Node 20+ and a local PostgreSQL instance (or Docker — see below).

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npx prisma migrate dev
npm run db:seed
npm run start:dev
```

The API runs at `http://localhost:3000/api`, with live Swagger docs at `http://localhost:3000/api/docs`.

## Environment variables

See [`.env.example`](.env.example). `JWT_SECRET`/`JWT_REFRESH_SECRET` should be random strings (`openssl rand -hex 32` works well) — never commit real values. `COOKIE_SECURE` should stay `false` unless this API is actually served over HTTPS; it is deliberately not tied to `NODE_ENV`, since `NODE_ENV=production` does not imply TLS is present (the docker-compose setup below is a case in point — it sets `NODE_ENV=production` but serves everything over plain HTTP).

## Database migrations

```bash
npx prisma migrate dev --name <description>   # create + apply a migration in development
npx prisma migrate deploy                      # apply pending migrations only (used in the Docker image's startup command)
```

## Seed data

`npm run db:seed` wipes every table (in FK-safe order) and recreates:

- 14 categories (11 top-level, 3 children of Electronics)
- 5 sellers, 20 customers, 1 admin — 26 users total
- 83 products across all categories, with images and varied stock levels (some low-stock, some out-of-stock)
- 1 coupon (`BAZAAR10` — 10% off, Rs. 5,000 minimum order, Rs. 1,000 max discount)

### Demo accounts

All seeded accounts share the password `Password123!`:

| Role     | Email                  |
|----------|-------------------------|
| Admin    | `admin@bazaar.test`     |
| Seller   | `seller@bazaar.test` (TechBazaar Store) |
| Customer | `customer@bazaar.test`  |

## Running

```bash
npm run start:dev    # watch mode
npm run build        # compile to dist/
npm run start:prod    # run the compiled build
```

## Docker

```bash
cp .env.example .env   # fill in JWT_SECRET / JWT_REFRESH_SECRET — docker-compose reads this file too
docker compose up --build
```

This brings up Postgres, the backend (migrations run automatically on container start via `prisma migrate deploy`), and the frontend — built from the sibling `../Bazaar-fe` directory, so **both repos need to be cloned as sibling folders** for `docker compose up` to work. The frontend is served at `http://localhost:5173`, the API at `http://localhost:3000/api`.

Seeding is not run automatically on container start (it destroys existing data on every run, which is fine for local dev but not something to do unattended on every restart). Run it once manually:

```bash
docker compose exec backend npm run db:seed
```

## API documentation

Full request/response schemas are available live at `/api/docs` (Swagger UI) once the server is running. Endpoint groups:

`/api/auth`, `/api/users`, `/api/categories`, `/api/products` (+ `/api/products/:productId/reviews`, `/api/reviews/mine`), `/api/cart`, `/api/wishlist`, `/api/addresses`, `/api/orders`, `/api/coupons/validate`, `/api/notifications`, `/api/seller/*`, `/api/admin/*` (including `/api/admin/coupons`).

## Testing

```bash
npm run test         # unit tests
npm run test:e2e      # 28 e2e tests against a real database — see below
npm run lint
```

The e2e suite (`test/*.e2e-spec.ts`) boots the real Nest app (same global prefix, validation pipe, filters, and interceptor as `main.ts` — a plain `Test.createTestingModule` + `app.init()` would skip all of that) and runs against whatever `DATABASE_URL` is configured, creating and cleaning up its own fixtures. It covers: authentication, product creation and search, cart behavior and the stock guard, order creation and the inventory-never-goes-negative guarantee, cross-user authorization (verifying a 404, not a 403, so existence of another user's data is never leaked), and coupon validation (minimum order, expiry, usage limits, discount capping).

## Build

```bash
npm run build
```

Compiles to `dist/`; the entry point is `dist/main.js`.
