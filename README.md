# Shopping Link-Sis

Sistema de operaciones para Shopping Link (compras en USA para clientes en Guatemala).

## Setup local

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy env file and fill in values:
   ```bash
   cp .env.example .env
   ```
   Fill in `DATABASE_URL` (from Railway) and `NEXTAUTH_SECRET` (run `openssl rand -base64 32`).

3. Push the database schema:
   ```bash
   npm run db:push
   ```

4. Seed with initial data (creates admin user):
   ```bash
   npm run db:seed
   ```

5. Run the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## Default login (after seed)

- Email: `admin@shoppinglink.com.gt`
- Password: `shoppinglink2026`

Change the password immediately in production.

## Deploy (Railway)

1. Push to GitHub main branch — Railway auto-deploys.
2. Set environment variables in Railway dashboard:
   - `DATABASE_URL` (Railway provides this automatically if you add a PostgreSQL service)
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `NEXTAUTH_URL` = `https://shoppinglink.com.gt`
3. Point the `shoppinglink.com.gt` domain at Railway (custom domain, in the Railway service's Settings → Networking).

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- NextAuth.js v4

Mismo stack que salvamed-sis (salvamedsis.net), por decisión del plan de proyecto.

## Estado

Sprint 0: esqueleto con login funcionando. Sprint 1 agrega los módulos de
Clientes, Ciclos y Pedidos. Ver el plan completo en el doc del proyecto
("Shopping Link — Plan de Proyecto y Sprints").
