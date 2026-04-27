# AlphaTrack — Documentation

## Table of Contents

1. [Architecture](#architecture)
2. [Backend API](#backend-api)
3. [Frontend](#frontend)
4. [Database](#database)
5. [Authentication](#authentication)
6. [Teams & Roles](#teams--roles)
7. [Tasks](#tasks)
8. [Activity Log](#activity-log)
9. [Deployment](#deployment)
10. [Environment Variables](#environment-variables)

---

## Architecture

```
Browser
  │
  ▼
Nginx :80
  ├─ /api/*  → FastAPI :8000 (Python)
  └─ /*      → Next.js :4040 (Node.js)
```

- **Next.js** runs in standalone mode (`output: 'standalone'`), no `node_modules` needed in production.
- **FastAPI** uses `uvicorn` with 2 workers.
- **SQLite** stored in `backend/app.db`, automatically backed up to `backend/backups/`.
- Both processes are managed by **systemd** and restart on failure.

---

## Backend API

Base URL: `/api`  
Swagger UI: `/api/docs`

### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/api/register` | Register a new user |
| POST | `/api/login` | Login, receive session token |
| POST | `/api/logout` | Logout |
| GET | `/api/me` | Current user info |

Token is passed via `Cookie: session=<token>`.

### Teams (Workspaces)

| Method | Path | Description |
|---|---|---|
| GET | `/api/workspaces` | List user's teams |
| POST | `/api/workspaces` | Create a team |
| GET | `/api/workspaces/current` | Active team with members |
| PATCH | `/api/workspaces/{id}` | Rename team |
| DELETE | `/api/workspaces/{id}` | Delete team |
| GET | `/api/workspaces/{id}/members` | List members |
| PATCH | `/api/workspaces/{id}/members/{uid}` | Update member role |
| DELETE | `/api/workspaces/{id}/members/{uid}` | Remove member |
| POST | `/api/workspaces/{id}/invite` | Generate invite link |
| GET | `/api/workspaces/{id}/invites` | List invites |
| DELETE | `/api/workspaces/{id}/invites/{iid}` | Revoke invite |
| POST | `/api/workspaces/accept-invite` | Accept invite |
| POST | `/api/workspaces/{id}/leave` | Leave team |

### Tasks

| Method | Path | Description |
|---|---|---|
| GET | `/api/tasks?workspace_id=` | List tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/{id}` | Update task |
| DELETE | `/api/tasks/{id}` | Delete task |
| POST | `/api/tasks/{id}/comments` | Add comment |
| GET | `/api/tasks/{id}/activity` | Activity history |

### Contacts

| Method | Path | Description |
|---|---|---|
| GET | `/api/contacts?workspace_id=` | List contacts |
| POST | `/api/contacts` | Create contact |
| PUT | `/api/contacts/{id}` | Update contact |
| DELETE | `/api/contacts/{id}` | Delete contact |

### Tags

| Method | Path | Description |
|---|---|---|
| GET | `/api/tags?workspace_id=` | List tags |
| POST | `/api/tags` | Create tag |
| DELETE | `/api/tags/{id}` | Delete tag |

### Documents

| Method | Path | Description |
|---|---|---|
| GET | `/api/documents?workspace_id=` | List documents |
| POST | `/api/documents` | Create document |
| PUT | `/api/documents/{id}` | Update document |
| DELETE | `/api/documents/{id}` | Delete document |

### Utility

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/backup/list` | List backups |
| POST | `/api/backup/now` | Create backup manually |
| DELETE | `/api/backup/{filename}` | Delete backup |
| GET | `/api/backup/{filename}/download` | Download backup |
| GET | `/api/backup/db/download` | Download current DB |
| GET | `/api/stats` | Database statistics |

---

## Frontend

### Pages

| Path | Description |
|---|---|
| `/login` | Login / registration |
| `/tasks` | Task list (drag-and-drop, filters) |
| `/board` | Kanban board |
| `/week` | Weekly planner |
| `/contacts` | CRM contacts |
| `/documents` | Documents |
| `/settings` | Team settings, members, invites |
| `/invite/[token]` | Accept invite |

### Server Actions (`src/actions/`)

| File | Purpose |
|---|---|
| `tasks.ts` | Task CRUD, comments, activity |
| `workspace.ts` | Team management, invites |
| `contacts.ts` | Contact CRUD |
| `tags.ts` | Tag CRUD |
| `documents.ts` | Document CRUD |
| `auth.ts` | Register, login, logout |

### Key Components (`src/components/`)

| Component | Purpose |
|---|---|
| `task-modal.tsx` | Task detail modal (meta, comments, history) |
| `spreadsheet.tsx` | Spreadsheet view |
| `layout/sidebar.tsx` | Navigation sidebar |
| `layout/user-profile-widget.tsx` | Team switcher, invite modal |

---

## Database

SQLite file at `backend/app.db`. Schema managed by SQLAlchemy (code-first).

### Tables

| Table | Purpose |
|---|---|
| `users` | Users |
| `sessions` | Auth sessions |
| `workspaces` | Teams |
| `workspace_members` | Team members with roles |
| `workspace_invites` | Invite links |
| `projects` | Projects |
| `tasks` | Tasks |
| `task_assignees` | Task assignees (many-to-many) |
| `task_tags` | Task tags (many-to-many) |
| `comments` | Task comments |
| `activities` | Task change history |
| `contacts` | CRM contacts |
| `contact_phones` | Contact phone numbers |
| `tags` | Team tags |
| `documents` | Documents |

Tables are created automatically on startup via `Base.metadata.create_all`.

---

## Authentication

- Passwords are hashed with **bcrypt**.
- On login a `sessions` record is created with a random token, valid for 30 days.
- Token is stored in an `HttpOnly` cookie named `alphatrack_session`.
- All protected endpoints use `deps.get_current_user` dependency.

---

## Teams & Roles

### Roles

| Role | Permissions |
|---|---|
| `admin` | Full access: manage members, settings, delete team |
| `member` | Create and edit tasks, contacts, documents |
| `viewer` | Read-only |

### Invites

- A unique token is generated with a role and workspace ID embedded.
- Validity: **7 days**, link is **single-use**.
- Path: `/invite/{token}` — authenticated users are added to the team immediately.
- Unauthenticated users are redirected to `/login?invite={token}` and join after login/registration.

---

## Tasks

### Task Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Title |
| `description` | text | Description |
| `status` | string | Status (from team's set) |
| `priority` | enum | none / low / medium / high |
| `startDate` | date | Start date |
| `dueDate` | date | Deadline |
| `group` | enum | Today / Tomorrow / Later / No date |
| `assignees` | User[] | Assignees |
| `tags` | Tag[] | Tags |
| `contactId` | string? | Linked contact |
| `projectId` | string? | Project |

### Views

- **List** — grouped by date (Today / Tomorrow / Later / No date) with drag-and-drop.
- **Kanban** — columns by status, drag-and-drop between columns.
- **Week** — day grid, tasks draggable between days.
- **Spreadsheet** — editable grid of all tasks.

---

## Activity Log

Every task change is recorded in the `activities` table.

### Tracked Events

| Event | Description |
|---|---|
| `created` | Task created |
| `title` | Title renamed |
| `status` | Status changed |
| `priority` | Priority changed |
| `description` | Description edited |
| `dueDate` | Deadline changed |
| `startDate` | Start date changed |
| `contact` | Contact linked / changed |
| `assignee_added` | Assignee added |
| `assignee_removed` | Assignee removed |
| `tag_added` | Tag added |
| `tag_removed` | Tag removed |
| `comment_added` | Comment added |

Each record contains: author, timestamp, event type, payload (before/after for scalar fields, user/tag name for relations).

---

## Deployment

### Server Requirements

- Debian 11+ / Ubuntu 22+
- 1 GB RAM minimum
- Python 3.11+
- Node.js 20 LTS
- nginx

### Initial Setup

```bash
# Sync files to server
rsync -az \
  --exclude node_modules --exclude .next \
  --exclude backend/.venv --exclude backend/app.db \
  ./ root@SERVER:/opt/alphatrack/

# Connect and configure
ssh root@SERVER
cp /opt/alphatrack/.env.example /opt/alphatrack/.env
nano /opt/alphatrack/.env
bash /opt/alphatrack/deploy/setup.sh
```

`setup.sh` will:
1. Install Node.js 20, Python, nginx
2. Create system user `alphatrack`
3. Create Python venv and install dependencies
4. Build Next.js (`npm run build`)
5. Install systemd services `alphatrack-backend` and `alphatrack-frontend`
6. Configure nginx as reverse proxy on port 80

### Updates

```bash
bash deploy/deploy.sh root@SERVER
```

Syncs files, updates dependencies, rebuilds frontend, restarts services.

### Service Management

```bash
systemctl status alphatrack-backend
systemctl status alphatrack-frontend
journalctl -u alphatrack-backend -f
journalctl -u alphatrack-frontend -f
```

---

## Environment Variables

File `.env` in the project root:

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_URL` | Public URL of the app (used for invite links) | `http://194.3.0.126` |
| `NEXT_PUBLIC_API_URL` | Internal API URL (frontend → backend) | `http://127.0.0.1:8000` |
