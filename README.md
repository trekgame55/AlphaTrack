# AlphaTrack

**AlphaTrack** is a modern self-hosted team task management system. All data stays on your own server — no third-party clouds.

---

## Features

- **Tasks** — kanban, list, weekly planner, spreadsheet. Drag-and-drop between statuses and dates.
- **Activity Log** — every task has a full history: who changed the status, assignee, tag, priority, or deadline.
- **Comments** — threaded comments inside each task with avatars and timestamps.
- **Projects** — group tasks by color-coded projects.
- **Tags** — create and assign tags directly from the task modal.
- **Contacts** — CRM contact list with phone numbers, linkable to tasks.
- **Teams** — multi-user mode. Invite via one-time link with role selection.
- **Roles** — Viewer / Member / Admin. Access control via settings.
- **Documents** — built-in text editor for team notes.
- **Spreadsheet** — editable data grid for all tasks.
- **REST API** — fully documented via Swagger UI at `/api/docs`.
- **Auto-backup** — SQLite database is automatically backed up on schedule.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS 4 |
| UI | Lucide icons, shadcn/ui, dnd-kit |
| Backend | FastAPI, Python 3.11+, SQLAlchemy, SQLite |
| Server | Nginx + systemd (Debian/Ubuntu) |

---

## Quick Start (local)

```bash
git clone <repo> alphatrack && cd alphatrack
npm install
pip install -r backend/requirements.txt
bash start.sh
```

Open **http://localhost:4040** — register and create your team.  
API docs: **http://localhost:8000/api/docs**

---

## Deploy to Debian Server

```bash
rsync -az --exclude node_modules --exclude .next --exclude backend/.venv \
  ./ root@YOUR_IP:/opt/alphatrack/

ssh root@YOUR_IP
cp /opt/alphatrack/.env.example /opt/alphatrack/.env
nano /opt/alphatrack/.env
bash /opt/alphatrack/deploy/setup.sh
```

Further updates — one command from your local machine:
```bash
bash deploy/deploy.sh root@YOUR_IP
```

Full details: [DOCUMENTATION_EN.md](./DOCUMENTATION_EN.md)

---

## Project Structure

```
alphatrack/
├── src/
│   ├── app/          # Next.js pages (App Router)
│   ├── components/   # UI components
│   ├── actions/      # Server Actions (API calls)
│   └── lib/          # Helpers, types, store
├── backend/
│   ├── routers/      # FastAPI routers (tasks, auth, workspaces…)
│   ├── models.py     # SQLAlchemy models
│   ├── schemas.py    # Pydantic schemas
│   └── main.py       # Entry point
└── deploy/           # Systemd services, nginx, deploy scripts
```

---
---

# AlphaTrack (Русский)

**AlphaTrack** — современная система управления задачами и командной работой. Полностью self-hosted: данные хранятся на вашем сервере, никаких сторонних облаков.

---

## Что внутри

- **Задачи** — канбан, список, недельный планировщик, таблица. Drag-and-drop между статусами и датами.
- **История изменений** — каждая задача имеет журнал: кто и когда изменил статус, исполнителя, тег, приоритет, сроки.
- **Комментарии** — треды внутри задачи с аватарами и временными метками.
- **Проекты** — группировка задач по проектам с цветовой маркировкой.
- **Теги** — создавай и назначай теги задачам прямо из модального окна.
- **Контакты** — CRM-список с телефонами, привязка контакта к задаче.
- **Команды** — многопользовательский режим. Приглашение по одноразовой ссылке с выбором роли.
- **Роли** — Наблюдатель / Участник / Администратор. Управление доступом через настройки.
- **Документы** — встроенный текстовый редактор для командных заметок.
- **Таблица (Spreadsheet)** — редактируемая сетка данных.
- **REST API** — полностью задокументированный через Swagger UI `/api/docs`.
- **Авто-бэкап** — SQLite база автоматически бэкапируется по расписанию.

---

## Стек технологий

| Слой | Технология |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS 4 |
| UI-компоненты | Lucide icons, shadcn/ui, dnd-kit |
| Backend | FastAPI, Python 3.11+, SQLAlchemy, SQLite |
| Сервер | Nginx + systemd (Debian/Ubuntu) |

---

## Быстрый старт (локально)

```bash
git clone <repo> alphatrack && cd alphatrack
npm install
pip install -r backend/requirements.txt
bash start.sh
```

Открой **http://localhost:4040** — зарегистрируйся и создай команду.  
API-документация: **http://localhost:8000/api/docs**

---

## Деплой на Debian-сервер

```bash
rsync -az --exclude node_modules --exclude .next --exclude backend/.venv \
  ./ root@YOUR_IP:/opt/alphatrack/

ssh root@YOUR_IP
cp /opt/alphatrack/.env.example /opt/alphatrack/.env
nano /opt/alphatrack/.env
bash /opt/alphatrack/deploy/setup.sh
```

Дальнейшие обновления — одной командой с локальной машины:
```bash
bash deploy/deploy.sh root@YOUR_IP
```

Подробнее — в [DOCUMENTATION_RU.md](./DOCUMENTATION_RU.md)

---

## Структура проекта

```
alphatrack/
├── src/
│   ├── app/          # Next.js страницы (App Router)
│   ├── components/   # UI-компоненты
│   ├── actions/      # Server Actions (вызовы к API)
│   └── lib/          # Хелперы, типы, store
├── backend/
│   ├── routers/      # FastAPI роутеры (tasks, auth, workspaces…)
│   ├── models.py     # SQLAlchemy модели
│   ├── schemas.py    # Pydantic схемы
│   └── main.py       # Точка входа
└── deploy/           # Systemd-сервисы, nginx, скрипты деплоя
```
