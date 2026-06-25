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

Demo login:

- Email: `admin@gracecity.test`
- Password: `password123`

## Environment

Create `api/.env` when connecting PostgreSQL:

```bash
PORT=4000
JWT_SECRET=replace-this-secret
DATABASE_URL=postgres://user:password@localhost:5432/churchcare
```

If `DATABASE_URL` is omitted, the API uses a local SQLite database in `api/data/demo.sqlite` for development.
