# Task Tracker

A full-stack team task management application built for structured collaboration between team leads and members. Task Tracker combines role-based access control, real-time activity feeds, AI-assisted productivity tools, and a Kanban-style board to give every team member exactly the visibility and control they need.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Roles & Permissions](#roles--permissions)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Projects](#projects)

---

## Overview

Task Tracker is designed for small-to-medium engineering or project teams where a **Lead** manages work distribution and **Members** execute and report on it. The app enforces a clean separation of concerns — leads create and assign tasks, members update progress and request help — while an AI layer accelerates routine work like note writing, subtask breakdown, and daily summaries.

Teams can now own multiple **Projects**. Tasks are optionally assigned to a project, allowing assignees to switch between projects within the same team without any team change. The daily AI summary is project-aware and groups activity by project when relevant.

---

## Features

### Authentication & Sessions
- Email/password sign-up and sign-in via **better-auth**
- Persistent server-side sessions with cookie-based credentials
- Automatic redirect to login on session expiry (401 interceptor)
- Protected routes — unauthenticated guests cannot access any dashboard page
- Already-logged-in users are redirected away from the login page

### Role-Based Access Control
Two roles with strictly enforced permissions on both frontend and backend:

| Feature | Lead | Member |
|---|---|---|
| Create tasks | ✅ | ✅ (self-assign only) |
| Delete tasks | ✅ | ❌ |
| Reassign task assignee | ✅ | ❌ |
| Approve / reject join requests | ✅ | ❌ |
| Approve / reject help requests | ✅ | ❌ |
| Add task updates | Assignee/Helper only | Assignee/Helper only |
| Request help on a task | ❌ | Assigned only |
| View team dashboard | ✅ | ❌ |
| View personal dashboard | ✅ | ✅ |
| Create / edit / delete projects | ✅ | ❌ |
| View projects | ✅ | ✅ |

### Team Management
- Leads can create teams with a name and description
- Members can browse and **request to join** a team
- Leads see pending join requests and can **accept or reject** them
- Leads can directly add or remove members from a team
- Team-scoped task visibility — members only see tasks within their team

### Projects
- Each team can own multiple **Projects**, acting as an intermediary organisational layer between the team and its tasks
- A dedicated **Projects tab** sits immediately after the Team tab in the main navigation
- **Lead**: full CRUD — create, rename, update description, and delete projects
  - Deleting a project **cascade-deletes** all tasks (and their subtasks) that belong to it
- **Member**: read-only access — can browse projects but cannot create, edit, or delete them
- Project names are unique within a team (enforced by a compound MongoDB index)

### Task Management
- Create tasks with title, summary, description, priority (`Low` / `Medium` / `High`), start date, due date, assignee, and an optional **project**
- The project dropdown in the Create Task dialog lists all projects in the current team; selection is available to both Lead and Member (Members can choose a project for their self-assigned task)
- The backend validates that the selected project belongs to the same team as the task before saving
- Task statuses: `TO DO` → `IN PROGRESS` → `DONE` / `BLOCKED`
- Drag-and-drop Kanban board across status columns (with activity feed entry on each move)
- Table view with sortable columns
- Task detail sheet with full metadata, activity feed, subtasks, and action buttons

### Activity Feed
- Every task carries a chronological activity log
- Entries are created for: status changes (drag-and-drop), daily progress updates, help requests, helper additions, and task reassignments

### Progress Updates (Daily Updates)
- Members add structured updates to their assigned tasks or tasks they are helping with
- Each update includes a free-text note and optional blocked reason
- AI-powered **note autocomplete** and **note refinement** to help members write clearer updates

### Helper System
- Assignees can **Request Help** — selecting suggested co-workers and adding a note to the lead
- The lead reviews pending help requests and can **Add a Helper** from the suggested members or pick anyone not already assigned/helping
- Approved helpers are added to the task's `helperIds` list
- Helpers appear in the task detail view and can submit progress updates
- Helper tasks are visible in the **Member Dashboard** alongside primary assignments, with a distinct **Helper** badge

### Lead Direct Reassign
- Leads can directly **reassign** a task to any team member (except the current assignee) from the task detail sheet
- The reassignment is logged in the activity feed
- Backend enforces this permission — non-Lead API calls attempting to change `assigneeId` are rejected with `403 Forbidden`

### AI Features
All AI features are powered by **Groq's Llama 3.1 8B Instant** model via the Groq API (`https://api.groq.com/openai/v1/chat/completions`). The integration is encapsulated in `back-end/services/llm.service.ts` and called from dedicated controllers.

#### 1. AI Subtask Suggestions
Triggered from the task detail sheet by any team member. Given the task title and description, the model generates **3–5 actionable subtasks** as a structured JSON array (each with a `title` and `description`). The Lead or Member can then selectively accept and add individual suggestions to the task.

#### 2. Note Autocomplete
Available while typing a daily progress update. When the member has typed at least 3 characters, the AI completes the sentence as a natural continuation — it returns only the completion text (not the part already typed), keeping it to 1–2 sentences so the flow is uninterrupted.

**Model behaviour:** temperature `0.6`, max 100 tokens, context-aware (uses the task title in the system prompt).

#### 3. Note Refinement
A one-click "Refine" action in the update dialog. The model rewrites the member's rough draft by fixing grammar, adding technical clarity, and increasing professionalism — while preserving the original meaning. Falls back to the original note if the API call fails.

**Model behaviour:** temperature `0.4`, max 300 tokens, strict instruction to return only the refined text with no preamble.

#### 4. End-of-Day Team Summary
Requested by the Lead from the dashboard. The backend fetches all tasks that had activity (updates or status changes) on the target date — scoped to the team — and sends them to the AI with a rigid structured prompt.

The generated Markdown summary always contains five sections:
- **🏁 Completed Today** — tasks that reached DONE
- **🚧 In Progress** — tasks actively worked on, with update notes
- **🚫 Blocked** — blocked tasks with their blocker reasons
- **📁 Projects Active Today** — lists each distinct project that had activity, with its tasks grouped underneath (only present when project-linked tasks exist)
- **📊 Team Snapshot** — 2–3 sentence overall assessment of the team's day

When a task belongs to a project, the project name is included in the task data sent to the LLM (`Project: <name>` label) and the model annotates each such task with `[Project Name]` inline throughout the summary.

**Model behaviour:** temperature `0.5`, max 1000 tokens, names of assignees included.

#### 5. Per-Task Progress Report
Requested from the task detail sheet. The AI receives the main task metadata (title, description, status, priority), all its subtasks with completion status, and up to the **5 most recent** progress updates with contributor names.

The report is structured in five sections:
- **Overall Status Summary**
- **Completed Work** (done subtasks)
- **In Progress** (active subtasks + update notes)
- **Blockers / Risks**
- **Next Steps** (based on TODO subtasks)

**Model behaviour:** temperature `0.3` (most factual/deterministic), max 800 tokens, strict instruction not to invent data not present in the input.

### Dashboards
**Lead Dashboard**
- Overview of all team tasks grouped by status
- Member cards showing each member's active workload
- Pending **join requests** queue with accept/reject actions
- Pending **help requests** queue with inline helper selection and confirm/decline

**Member Dashboard**
- Personal task list including both primary assignments and helper tasks
- Progress bar showing completed vs. total tasks
- Overdue and "Due Soon" badges on task cards
- Quick Update button from the dashboard card

### Kanban Board
- Tasks organised in columns by status
- Drag cards between columns to update status and log the change in the activity feed
- Blocked tasks trigger a reason dialog before the move is finalised

### Subtask Management
- AI suggests subtasks; Lead/Member can selectively accept and add them
- Subtasks are tracked with completion status and reflected in the progress calculation

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | HTTP server and routing |
| **TypeScript** | Type-safe server code |
| **Mongoose + MongoDB** | Data modeling and persistence |
| **better-auth** | Session-based authentication |
| **dotenv** | Environment configuration |
| **cors** | Cross-origin request handling |

### Frontend
| Technology | Purpose |
|---|---|
| **React 18 + Vite** | UI framework and build tooling |
| **TypeScript** | Type-safe component code |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Accessible, unstyled component primitives |
| **react-router-dom v6** | Client-side routing and protected routes |
| **axios** | HTTP client with session interceptor |
| **react-hook-form + Zod** | Form state and schema validation |
| **date-fns** | Date formatting and calculation |
| **lucide-react** | Icon library |

---

## Project Structure

```
task-tracker/
├── back-end/
│   ├── config/
│   │   └── auth.ts              # better-auth initialisation
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── task.controller.ts
│   │   ├── subtask.controller.ts
│   │   ├── team.controller.ts
│   │   ├── user.controller.ts
│   │   ├── joinRequest.controller.ts
│   │   ├── assignRequest.controller.ts
│   │   ├── note.controller.ts
│   │   ├── progress.controller.ts
│   │   └── summary.controller.ts
│   ├── middleware/
│   │   └── auth.middleware.ts   # Session guard + role helpers
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── task.controller.ts
│   │   ├── subtask.controller.ts
│   │   ├── team.controller.ts
│   │   ├── project.controller.ts  # NEW — CRUD for projects (Lead-only writes)
│   │   ├── user.controller.ts
│   │   ├── joinRequest.controller.ts
│   │   ├── assignRequest.controller.ts
│   │   ├── note.controller.ts
│   │   ├── progress.controller.ts
│   │   └── summary.controller.ts
│   ├── models/
│   │   ├── task.model.ts          # projectId field added
│   │   ├── team.model.ts
│   │   ├── project.model.ts       # NEW — Project schema
│   │   ├── user.model.ts
│   │   ├── joinRequest.model.ts
│   │   └── assignRequest.model.ts
│   ├── routes/
│   │   └── routes.ts
│   ├── services/
│   │   └── llm.service.ts       # AI integration layer (DailySummaryTask now carries projectName)
│   ├── scripts/
│   │   └── seed.ts              # Database seeding script
│   ├── server.ts
│   └── tsconfig.json
│
└── front-end/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.tsx
    │   │   ├── ProtectedRoute.tsx
    │   │   ├── TaskDetailSheet.tsx
    │   │   ├── CreateTaskDialog.tsx   # Project dropdown added
    │   │   ├── DailyUpdateDialog.tsx
    │   │   ├── ProjectsTab.tsx        # NEW — Projects tab UI
    │   │   ├── TaskTable.tsx
    │   │   ├── AiSummary.tsx
    │   │   ├── StatusBadge.tsx
    │   │   ├── board/
    │   │   │   ├── TaskBoard.tsx    # Kanban board
    │   │   │   └── TaskCard.tsx
    │   │   └── dashboard/
    │   │       ├── LeadDashboard.tsx
    │   │       └── MemberDashboard.tsx
    │   ├── lib/
    │   │   ├── api.ts          # Axios instance + all API calls (projectApi added)
    │   │   ├── task-store.tsx  # Global React context / store
    │   │   └── types.ts        # Shared TypeScript types (Project type + Task.projectId added)
    │   └── pages/
    │       ├── Index.tsx       # Main dashboard page (Projects tab added)
    │       ├── Login.tsx
    │       ├── Signup.tsx
    │       ├── CreateTeam.tsx
    │       └── TeamMembers.tsx
    └── tsconfig.json
```

---

## Roles & Permissions

### Lead
- Creates tasks and assigns them to any team member
- Approves or rejects join requests from members wanting to join the team
- Reviews and acts on help requests raised by members
- Can directly reassign any task to a different member
- Can add progress updates **only on tasks they are the assignee or helper of**
- Has access to the Lead Dashboard with team-wide visibility
- Only role that can delete tasks
- **Full CRUD over projects** — create, edit name/description, delete (cascade-deletes all tasks in the project)

### Member
- Can create tasks, but the task is automatically assigned to themselves (cannot assign to others)
- Can select a project from the team's project list when creating a task
- Views tasks they are assigned to or helping with
- Submits daily progress updates on their assigned or helper tasks
- Requests help from the lead when needed, suggesting co-workers
- Cannot delete tasks (their own or anyone else's)
- Cannot reassign tasks
- Cannot see other members' task details unless part of the same task
- **Read-only access to projects** — can view all projects in their team but cannot create, edit, or delete them

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB (Atlas or local)
- A Groq API key for AI features (get one at [console.groq.com](https://console.groq.com))

### Backend Setup

```bash
cd back-end
npm install
```

Create a `.env` file (see [Environment Variables](#environment-variables)), then:

```bash
npm run dev
```

The server starts on the port defined in `PORT` (default `3000`).

To seed the database with sample data:

```bash
npx ts-node scripts/seed.ts
```

### Frontend Setup

```bash
cd front-end
npm install
npm run dev
```

The app starts at `http://localhost:5173` by default (Vite).

---

## Environment Variables

### Backend (`back-end/.env`)

```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
BETTER_AUTH_SECRET=<random-secret>
CORS_ORIGIN=http://localhost:5173

# Groq API key for LLM features (https://console.groq.com)
LLM_API_KEY=<your-groq-api-key>
```

### Frontend (`front-end/.env`)

```env
VITE_BACKEND_URL=http://localhost:3000
```

---

## API Reference

All endpoints require a valid session cookie unless marked public.

### Auth
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/auth/session` | Get current session (public) |
| `POST` | `/api/auth/sign-out` | Sign out |
| `GET` | `/api/me` | Get current user profile |

### Users
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/without-team` | List users not in any team |

### Teams
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/teams` | List all teams |
| `POST` | `/api/teams` | Create a team |
| `GET` | `/api/teams/:teamId` | Get team by ID |
| `PUT` | `/api/teams/:teamId` | Update team |
| `DELETE` | `/api/teams/:teamId` | Delete team |
| `POST` | `/api/teams/:teamId/members` | Add member to team |
| `DELETE` | `/api/teams/:teamId/members/:memberId` | Remove member |
| `GET` | `/api/teams/:teamId/members` | List team members |

### Join Requests
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/join-requests` | Request to join a team |
| `GET` | `/api/join-requests/my` | My pending requests |
| `GET` | `/api/join-requests/team/:teamId` | Requests for a team (Lead) |
| `PUT` | `/api/join-requests/:requestId/accept` | Accept request |
| `PUT` | `/api/join-requests/:requestId/reject` | Reject request |

### Tasks
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks` | Get all tasks (scoped to team/user) |
| `GET` | `/api/tasks/:id` | Get task by ID |
| `PUT` | `/api/tasks/:id` | Update task (fields + optional activity entry) |
| `DELETE` | `/api/tasks/:id` | Delete task |

### Subtasks
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/subtasks/suggest` | AI-suggest subtasks for a task |
| `POST` | `/api/subtasks/:parentTaskId` | Add a subtask |
| `GET` | `/api/subtasks/:parentTaskId` | Get subtasks for a task |

### Help (Assign) Requests
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/assign-requests` | Member requests help on a task |
| `GET` | `/api/assign-requests/my` | My submitted requests |
| `GET` | `/api/assign-requests/team/:teamId` | Pending requests for a team (Lead) |
| `PUT` | `/api/assign-requests/:requestId/approve` | Approve and add a helper |
| `PUT` | `/api/assign-requests/:requestId/reject` | Reject request |

### Projects
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/teams/:teamId/projects` | Create a project (Lead only) |
| `GET` | `/api/teams/:teamId/projects` | List all projects for a team |
| `GET` | `/api/projects/:projectId` | Get a single project |
| `PATCH` | `/api/projects/:projectId` | Update project name / description (Lead only) |
| `DELETE` | `/api/projects/:projectId` | Delete project + cascade-delete its tasks (Lead only) |

### AI & Utilities
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/notes/autocomplete` | Autocomplete a partial progress note |
| `POST` | `/api/notes/refine` | Refine/rewrite a progress note |
| `GET` | `/api/summary/daily` | Generate a daily team activity summary (project-aware) |
| `GET` | `/api/tasks/:taskId/progress` | Generate a progress report for a task |
