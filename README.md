<div align="center">

<img src="public/logo.png" alt="AlphaTrack Logo" width="64" height="64" />

# AlphaTrack

**Professional task management platform for teams**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python)](https://python.org/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-2CA5E0?style=flat-square&logo=telegram)](https://core.telegram.org/bots)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 📋 **Task Board** | Kanban-style board with drag-and-drop support |
| 📅 **Week View** | Calendar-based weekly overview of all tasks |
| 👥 **Team Management** | Invite members, assign roles and permissions |
| 📞 **Contacts** | CRM-style contact directory linked to tasks |
| 📄 **Documents** | Rich text documents per workspace |
| 🔔 **Telegram Notifications** | Real-time bot notifications when assigned to tasks |
| 🤖 **Telegram Bot** | Manage tasks directly from Telegram — view, navigate, and complete tasks |
| 🔐 **Authentication** | Secure session-based auth with 30-day sessions |
| 👤 **Profile Management** | Update name, change password, connect/disconnect Telegram |
| 🏷 **Tags & Projects** | Organize tasks with colored tags and projects |

---

## 🤖 Telegram Bot

AlphaTrack includes a fully integrated Telegram bot for task management on the go.

### Bot Commands

| Command | Description |
|---|---|
| `/start` | Connect your Telegram account via the profile page link |
| `/tasks` | Quick list of your active assigned tasks |
| `/active` | View tasks currently in progress |

### Bot Features
- **Persistent bottom keyboard** with `📋 Все задачи` and `⚡ Активные задачи` buttons
- **Paginated task list** — 5 tasks per page with Previous/Next navigation
- **Full task detail view** — status, priority, dates, assignees, tags, and contact with copyable phone numbers
- **Complete tasks** directly from the bot (only if you are an assignee)
- **Instant notifications** when you are assigned to a task

### Setting Up Telegram Integration

1. Go to your profile page on the site
2. Click **"Подключить Telegram"** (Connect Telegram)
3. The bot will open automatically — press **Start**
4. Your account is now linked. Notifications will be sent for new task assignments.

---

## 🏗️ Architecture

```
AlphaTrack/
├── src/                        # Next.js 16 frontend
│   ├── app/(dashboard)/        # Dashboard pages
│   │   ├── tasks/              # Task list & board
│   │   ├── week/               # Week calendar view
│   │   ├── contacts/           # Contact directory
│   │   ├── documents/          # Document editor
│   │   ├── board/              # Kanban board
│   │   ├── profile/            # User profile & Telegram settings
│   │   └── settings/           # Workspace settings
│   ├── components/             # Shared UI components
│   ├── actions/                # Next.js server actions
│   └── lib/                    # Utilities & context
│
└── backend/                    # FastAPI Python backend
    ├── main.py                 # App entrypoint & startup
    ├── models.py               # SQLAlchemy ORM models
    ├── deps.py                 # Auth dependencies
    ├── telegram_bot.py         # Telegram bot (PTB)
    ├── notification_scheduler.py # Async notification queue
    ├── routers/
    │   ├── auth.py             # Authentication endpoints
    │   ├── tasks.py            # Task CRUD + assignee management
    │   ├── contacts.py         # Contact management
    │   ├── documents.py        # Document CRUD
    │   ├── workspaces.py       # Workspace & member management
    │   └── telegram.py         # Telegram link & status endpoints
    └── backups/                # Automated hourly SQLite backups
```

### Tech Stack

**Frontend**
- [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Standalone build)
- [Tailwind CSS](https://tailwindcss.com/) + custom design tokens
- [Zustand](https://github.com/pmndrs/zustand) for state management
- [Lucide React](https://lucide.dev/) for icons

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) with [Uvicorn](https://www.uvicorn.org/)
- [SQLAlchemy](https://www.sqlalchemy.org/) ORM + SQLite
- [python-telegram-bot](https://github.com/python-telegram-bot/python-telegram-bot) v20+
- [Passlib](https://passlib.readthedocs.io/) for bcrypt password hashing

---

## 🚀 Deployment

### Prerequisites
- Ubuntu/Debian server with Nginx
- Python 3.11+ and Node.js 18+
- A Telegram Bot token from [@BotFather](https://t.me/BotFather)

### 1. Clone the repository

```bash
git clone https://github.com/trekgame55/AlphaTrack.git /opt/alphatrack
cd /opt/alphatrack
```

### 2. Configure the backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Create environment file
cat > .env << EOF
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username_here
EOF
```

### 3. Configure the frontend

```bash
cd /opt/alphatrack
npm install
npm run build
```

### 4. Set up Systemd services

Copy the service files to `/etc/systemd/system/` (see `alphatrack-backend.service` and `alphatrack-frontend.service`), then:

```bash
systemctl daemon-reload
systemctl enable --now alphatrack-backend alphatrack-frontend
```

### 5. Configure Nginx

```nginx
server {
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:4040;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
}
```

---

## 🔄 Updating (One Command)

```bash
/opt/alphatrack/update.sh
```

This script automatically:
1. Pulls the latest code from GitHub
2. Installs any new dependencies
3. Rebuilds the frontend (with static assets)
4. Restarts both Systemd services

> **Note:** The `backend/.env` file is gitignored and must be configured manually on the server.

---

## 🔐 Security Notes

- Sessions are HTTP-only cookies with 30-day expiry
- Passwords are hashed with bcrypt (passlib)
- Telegram link tokens are single-use and expire after 15 minutes
- The backend `.env` file is never committed to the repository
- All API routes require session authentication

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built with ❤️ by **Langes**
</div>
