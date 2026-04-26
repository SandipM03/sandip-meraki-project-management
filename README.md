# Meraki — Workspace Clarity for Small Teams

A lightweight project management tool that brings teams instant clarity on work, clients, and ownership without endless messages and spreadsheets.

## Product Judgment

### Why I Built This

Small teams don't struggle with lack of tools—they struggle with **fragmentation**.

In my own experience, work gets split across:

- WhatsApp (updates)
- Spreadsheets (tracking)
- Memory (ownership)

This leads to constant questions like:

> "What's the status?"
> "Who's handling this?"

I built Meraki to solve one core problem:

👉 **Give small teams instant clarity on work without needing to ask anyone.**

Instead of adding features, I focused on:

- **Shared visibility** (everyone sees everything)
- **Task ownership** (clear responsibility)
- **Contextual updates** (no separate chat system)

The goal was to create something I would actually open every morning.

## MVP Scope

### In Scope ✅

- **Dashboard**: Today's tasks, overdue alerts, quick status changes (TODO → DOING → DONE)
- **Tasks**: Create, assign, filter by status/assignee
- **Projects**: Link tasks to projects, track project status
- **Clients**: Manage client status (Active / At Risk / Completed)
- **Team Visibility**: See what everyone is working on + workload indicators
- **Auth**: Simple email/password signup + protected routes

### Out of Scope (Intentional)

- Real-time updates (polling works for MVP)
- Comments/discussion (use Slack or email for now)
- Time tracking (focus on status, not hours)
- File attachments
- Custom workflows/statuses
- Mobile app

## Key Decisions

### Why JWT + HTTP-only Cookies
HTTP-only cookies eliminate the XSS attack surface for token theft (vs. localStorage), while JWT keeps the auth stateless—no session store needed in MVP. This gave me security without infrastructure overhead.

### Why Prisma Over Raw Queries
Early-stage projects benefit more from type safety and readable schema-to-code mapping than raw SQL optimization. Prisma's generated client caught bugs at compile time and made migrations frictionless.

### Why dnd-kit for Kanban
Lightweight, headless, and accessible—perfect for a simple Kanban board without bloated dependencies. Most drag-and-drop libraries come with pre-built UI; I needed just the logic.

### Why Polling Over WebSockets (MVP)
WebSockets add deployment complexity (sticky sessions, memory overhead). For an MVP where refresh every 30 seconds is acceptable, polling kept the stack simple and deployable anywhere. Real-time can be added when the product validates.

### Why shadcn/ui
I needed a component library that was *extractable*—source code in my repo, not node_modules—so I could customize without forking or hacking around opinionated design systems. shadcn gave me that freedom with solid Tailwind defaults.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase)
- npm

### Local Setup

```bash
# Clone and install
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in DATABASE_URL, JWT_SECRET, etc.

# Run database migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, create a client → project → tasks. Assign tasks to teammates and watch the Team page update.

### Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
AUTH_COOKIE_NAME=auth_token
DATABASE_SSL=true

```

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + HTTP-only cookies
- **UI**: shadcn/ui + Tailwind CSS
- **Drag-n-Drop**: dnd-kit (for Kanban)
- **Icons**: lucide-react

## Project Structure

```
app/
├── (auth)/              # Sign in / sign up pages
├── (app)/               # Protected routes
│   ├── dashboard/       # Overview + quick actions
│   ├── tasks/           # Task list + create
│   ├── projects/        # Project management
│   ├── clients/         # Client Kanban board
│   └── team/            # Team workload visibility
├── api/                 # API routes (auth, tasks, projects, clients)
└── page.tsx             # Landing page

lib/
├── auth.ts              # JWT signing/verification
├── auth-client.ts       # Client-side auth hooks
├── prisma.ts            # Prisma client singleton
├── dashboard-actions.ts # Server actions for dashboard
└── clients-actions.ts   # Server actions for client management

components/
├── app-sidebar.tsx      # Main navigation
├── navbar.tsx           # Top bar with user menu
└── dashboard/           # Dashboard-specific components
    ├── task-card.tsx
    ├── kanban-board.tsx
    └── activity-feed.tsx
```

## API Routes

All routes require authentication (JWT cookie) except `/api/auth/*`.

### Tasks
- `GET /api/tasks` — List tasks (filters: status, assignee)
- `POST /api/tasks` — Create task
- `PATCH /api/tasks/[id]` — Update task status/assignee

### Projects
- `GET /api/projects` — List projects
- `POST /api/projects` — Create project
- `DELETE /api/projects/[id]` — Delete project

### Clients
- `GET /api/clients` — List clients
- `POST /api/clients` — Create client

### Team
- `GET /api/team/visibility` — Get team member workload + tasks

### Auth
- `POST /api/auth/sign-up/email` — Register
- `POST /api/auth/sign-in/email` — Login
- `POST /api/auth/sign-out` — Logout
- `GET /api/auth/session` — Check session

## What I'd Build Next

If I had a chance to continue working on this project, I would focus on:

1. **Real-time updates using Supabase subscriptions**
   → So the team view feels live without refresh

2. **Client workspace refinement**
   → Stronger connection between client health and tasks

3. **Smart task input (AI-assisted quick add)**
   → Convert natural language into structured tasks

4. **Drag-and-drop task reassignment**
   → Improve team workload balancing

5. **Lightweight notifications**
   → Only for important events (due, overdue, reassigned)

6. **Add Role-Based Access**
   → Owner, Manager, Member roles with different permissions

7. **Invite-Only Access (Signup Restriction)**
   → Only allow team members to sign up with workspace invite links

8. **Multi-Domain / Multi-Workspace**
   → Support multiple independent teams on one instance

I intentionally did not build these in the MVP to keep the product focused and fast.

## Deployment

### Vercel (Recommended)

```bash
# Connect your repo and deploy
vercel
```

Ensure environment variables are set in Vercel dashboard.

### Other Platforms

```bash
npm run build
npm start
```

## Code Quality

- TypeScript for type safety
- Server actions for data mutations (no unnecessary API layers)
- Database indices on common filters (status, dueDate, assignedToId)
- Optimized Prisma queries (no N+1 problems)
- Semantic HTML + accessible components


