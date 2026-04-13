# MineOps — Mining Operations Management System

A full-stack SaaS application for managing mining operations — sites, assets, incidents, safety, compliance, and production — built with React, TypeScript, and Supabase.

---

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (white/purple premium theme)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **State**: Zustand
- **Routing**: React Router v6
- **Deployment**: Vercel

---

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** in the Supabase dashboard
3. Copy and paste the entire contents of `supabase-schema.sql` and run it
4. Go to **Storage** and confirm the `incident-images` bucket was created

### 2. Get Your API Keys

1. In Supabase: **Settings → API**
2. Copy **Project URL** and **anon/public key**

### 3. Configure Environment Variables

**For local development:**

```
cp .env.example .env
```

Edit `.env` and fill in your keys:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**For Vercel deployment:**

1. Go to your Vercel project → **Settings → Environment Variables**
2. Add:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key

### 4. Install and Run Locally

```
npm install
npm run dev
```

### 5. Deploy to Vercel

Push to GitHub → Vercel auto-deploys. Make sure env vars are set in Vercel dashboard.

---

## Features

| Module | Features |
|---|---|
| Auth | Login, Register, Role-based access (Admin / Manager / Operator) |
| Dashboard | Live metrics, recent incidents, quick actions, real-time updates |
| Sites | Full CRUD, manager assignment, status management |
| Assets | Full CRUD, site assignment, status tracking |
| Incidents | Full CRUD, severity/status filters, cause & corrective actions |
| Hazard Register | Full CRUD, risk levels, control measures, category filters |
| Near Misses | Full CRUD, severity tracking, investigation status |
| Toolbox Talks | Full CRUD, attendee count, duration tracking |
| Permits to Work | Full CRUD, work type categories, approval workflow |
| Compliance | Full CRUD, overdue detection, one-click resolve |
| Maintenance | Schedule, complete, link to assets |
| Production Logs | Shift-based logging, tonnage, ore grade, cost tracking |
| Reports | Incidents per site, asset downtime, CSV export |
| Activity Log | Full audit trail with pagination and filters |
| Alerts Panel | Real-time critical incidents, overdue compliance, faulty assets |

---

## Role Permissions

| Action | Operator | Manager | Admin |
|---|---|---|---|
| View all data | ✅ | ✅ | ✅ |
| Log incidents / near misses | ✅ | ✅ | ✅ |
| Create/Edit sites & assets | ❌ | ✅ | ✅ |
| Delete records | ❌ | ❌ | ✅ |

---

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx          # Sidebar + topbar + alerts toggle
│   └── AlertsPanel.tsx     # Slide-in alerts panel
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── SitesPage.tsx
│   ├── AssetsPage.tsx
│   ├── IncidentsPage.tsx
│   ├── HazardsPage.tsx
│   ├── NearMissesPage.tsx
│   ├── ToolboxPage.tsx
│   ├── PermitsPage.tsx
│   ├── CompliancePage.tsx
│   ├── MaintenancePage.tsx
│   ├── ProductionPage.tsx
│   ├── ReportsPage.tsx
│   └── ActivityPage.tsx
├── stores/
│   └── authStore.ts        # Zustand auth store
├── lib/
│   ├── supabase.ts         # Supabase client
│   └── types.ts            # TypeScript types for all tables
├── App.tsx                 # Routes + auth listener
├── main.tsx
└── index.css               # Global styles + design system
```
