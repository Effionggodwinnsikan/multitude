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

Create `api/.env` when connecting PostgreSQL:

```bash
PORT=4000
JWT_SECRET=replace-this-secret
DATABASE_URL=postgres://user:password@localhost:5432/churchcare
```

If `DATABASE_URL` is omitted, the API uses a local SQLite database in `api/data/demo.sqlite` for development.

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
