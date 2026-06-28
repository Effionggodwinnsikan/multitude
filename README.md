# Church Member Care & Attendance Management System

A modern full-stack church administration app for member registration, attendance tracking, follow-up assignment, home cell management, reports, branding, and role-based access.

## Stack

- React + Vite + Tailwind CSS
- Node.js + Express
- PostgreSQL-ready data layer with SQLite fallback for quick local demos
- JWT authentication

## Quick Start

```bash
npm install
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:4000

The app works locally without extra setup. By default, the API uses SQLite and the client calls `http://localhost:4000/api`.

Demo login:

- Email: `admin@gracecity.test`
- Password: `password123`

## Admin & Roles

Super Admin users can open the **Admin** page to:

- Create sub-admin login accounts
- Assign roles to sub-admins
- Enable or disable user access
- Reset sub-admin passwords
- Create custom roles from available permissions

New users can log in immediately after the Super Admin creates them with an active account, role, and temporary password.

## Code Structure

```text
api/src/
├── routes.js                 # main authenticated API routes
├── routes/adminRoutes.js     # Super Admin-only user and role routes
├── services/userService.js   # user, role, password, and permission logic
├── memberService.js          # member lifecycle and profile logic
├── reports.js                # dashboard, graph, export, and report logic
├── auth.js                   # login, auth middleware, authorization guards
├── db.js                     # SQLite/PostgreSQL data layer and migrations
└── seed.js                   # demo settings, roles, users, and sample data

client/src/
├── main.jsx                  # React screens and layout
├── services/api.js           # authenticated API client
└── styles.css                # Tailwind component classes
```

## Environment

Create `api/.env` for local API development. Leave `DATABASE_URL` empty to use the local SQLite demo database:

```bash
PORT=4000
JWT_SECRET=replace-this-secret
DATABASE_URL=
DATABASE_SSL=
ALLOW_LOCAL_DATABASE=false
RUN_STARTUP_MIGRATIONS=true
CLIENT_ORIGIN=http://localhost:5173,https://your-vercel-app.vercel.app
```

If `DATABASE_URL` is omitted, the API uses a local SQLite database in `api/data/demo.sqlite` for development.

For local PostgreSQL, use a local URL only on your own computer:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/churchcare
DATABASE_SSL=false
ALLOW_LOCAL_DATABASE=true
```

Do not use a `localhost` or `127.0.0.1` database URL on Render or Vercel. In production, use a hosted PostgreSQL connection string:

```bash
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require
```

Render PostgreSQL provides two common URL types:

- Internal/private URL, often with a host like `dpg-xxxx-a`. Use this only when the API is also deployed on Render.
- External URL, usually with a full public hostname. Use this for local development, Vercel-hosted backends, or any backend outside Render.

If your API is deployed on Render, put the Render internal database URL in the Render Web Service `DATABASE_URL` environment variable. If you are running the API on your laptop, leave `DATABASE_URL` empty for SQLite or use Render's external database URL.

Create `client/.env` for local frontend development:

```bash
VITE_API_URL=http://localhost:4000/api
```

This client env file is optional for normal local development because localhost is the fallback. It is useful if your local API runs on a different port.

## Deploying to Render and Vercel

Deploy `api/` as a Render Web Service.

- Build command: `npm install`
- Start command: `npm start`
- Required environment variables: `JWT_SECRET`, `DATABASE_URL`, `CLIENT_ORIGIN=https://your-vercel-app.vercel.app`
- Optional environment variables: `DATABASE_SSL=true`, `RUN_STARTUP_MIGRATIONS=true`

Render provides `PORT` automatically. The API listens on that port without binding to `127.0.0.1`, so it can receive public traffic.

If you see `connect ECONNREFUSED 127.0.0.1:5432`, the deployed app is using a local database URL. Replace it with the hosted PostgreSQL URL from Render Postgres, Neon, Supabase, Railway, or another cloud provider, then redeploy.

If you see an error saying the database URL uses a Render private database host, the API is running somewhere other than Render with an internal Render database URL. Move the API to Render or switch to the database's external URL.

For simple Render deployments, keep `RUN_STARTUP_MIGRATIONS=true`. For serverless-style deployments, set `RUN_STARTUP_MIGRATIONS=false` and run migrations separately:

```bash
npm run migrate --workspace api
```

Deploy `client/` to Vercel.

- Build command: `npm run build`
- Output directory: `dist`
- Required environment variable: `VITE_API_URL=https://your-render-service.onrender.com/api`

After changing `VITE_API_URL` in Vercel, redeploy the frontend so the new value is bundled into the app.

Local production preview also works. Start the API with `npm run start --workspace api`, then preview the built client with `npm run preview --workspace client`; when the browser host is `localhost` or `127.0.0.1`, the built client falls back to `http://localhost:4000/api`.

## Codebase Structure

```text
api/
  src/
    auth.js                 JWT auth, permissions, and audit helper
    db.js                   PostgreSQL/SQLite database adapter and migrations
    memberService.js        Member search, profile, edit, archive, delete, notes
    reports.js              Dashboard metrics, drilldowns, exports, celebrations
    routes.js               Main API routes
    routes/adminRoutes.js   Super Admin user and role management
    services/userService.js User, role, and permission data logic
    seed.js                 Demo settings, roles, users, members, home cells

client/
  src/
    main.jsx                React screens and UI flows
    services/api.js         Authenticated API client
    styles.css              Tailwind component classes and responsive polish
```

## Current Functional Areas

- Dashboard time filters, graph labels, clickable metric cards, and export/share actions.
- Member search/filter, profile history, edit, archive, logged delete, notes, and birthdays.
- Attendance check-in with manual, QR code, mobile, bulk, kiosk, home cell, and special-event capture methods.
- Follow-up reports, WhatsApp links, and feedback submission to Super Admin notifications.
- Editable home cell name, leader, assistant, address, meeting day, and meeting time.
- Celebration center for birthdays and upcoming member occasions.
- Super Admin role/user management with configurable permissions.
