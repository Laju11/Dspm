# DSPM - Department & Initiative Project Manager

A role-based project and initiative tracking system with backend authentication, Supabase PostgreSQL, and per-department dashboards.

## Features

- **Role-Based Access**: Admin, Department Head, Project Manager roles
- **Session-Based Auth**: Express server with secure session management
- **Departments**: Organize initiatives by department
- **Initiatives**: Track projects with status and progress
- **Cloud Database**: PostgreSQL via Supabase
- **Responsive UI**: Modern web interface

## Architecture

- **Backend**: Express.js + EJS templates + Supabase client
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Render (free tier available)
- **Auth**: Password hashing with bcryptjs

## Local Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your Supabase credentials
3. Run `npm install`
4. Start: `npm start` (visits `http://localhost:5000`)

## Supabase Setup

1. Create a free Supabase project
2. Go to SQL Editor → run the SQL from `schema.sql`
3. Get your credentials:
     - Project Settings → API
     - Copy **Project URL** and **Service Role Key** (not anon key)
4. Set environment variables in `.env`

## Environment Variables

```
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-session-secret-key
USE_PG_SESSION=true

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.your-project-ref:password@aws-0-your-region.pooler.supabase.com:6543/postgres?sslmode=require
```

Note: if `db.<project-ref>.supabase.co` fails on your network (IPv6 DNS issue), use the **Pooler** connection string from Supabase Settings → Database.

## Deployment on Render

1. Push code to GitHub
2. Go to render.com → **New +** → **Web Service**
3. Connect your GitHub repo
4. Set environment variables in Render dashboard
5. Deploy

Live URL: `https://dspm-backend.onrender.com` (or your custom domain)

## Routes

- GET `/` → Redirects to login/dashboard
- GET `/login` → Login page
- POST `/login` → Authenticate user
- GET `/register` → Registration page
- POST `/register` → Create user account
- GET `/logout` → Logout and clear session
- GET `/dashboard` → Route to role-based dashboard
- GET `/admin` → Admin dashboard (manage users, departments)
- GET `/department-head` → Department head dashboard (manage initiatives)
- GET `/project-manager` → Project manager dashboard (view all initiatives)

## User Roles

- **Admin**: Full access (users, departments, initiatives)
- **Department Head**: Create/edit initiatives within their department
- **Project Manager**: View all initiatives across all departments
- **User**: Pending approval (no access until admin approves)

## File Structure

```
project-manager/
├── src/
│   └── server.js          # Express app
├── views/
│   ├── login.ejs
│   ├── register.ejs
│   ├── admin-dashboard.ejs
│   ├── department-head-dashboard.ejs
│   └── project-manager-dashboard.ejs
├── public/
│   ├── styles.css
│   └── ...
├── schema.sql             # Supabase schema
├── .env.example           # Environment template
├── render.yaml            # Render config
└── package.json
```

## Next Steps

1. Set up Supabase project
2. Run `schema.sql` in Supabase SQL Editor
3. Configure `.env` with your credentials
4. Deploy on Render OR run locally with `npm start`
5. Create first admin account via registration (then approve in Supabase)
6. Add departments and invite users
