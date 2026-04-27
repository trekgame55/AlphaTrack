# AlphaTrack — Documentation

> **English version:** [DOCUMENTATION_EN.md](./DOCUMENTATION_EN.md)  
> **Русская версия:** [DOCUMENTATION_RU.md](./DOCUMENTATION_RU.md)

---

# AlphaTrack — Документация (RU)

## Содержание

1. [Архитектура](#архитектура)
2. [Backend API](#backend-api)
3. [Frontend](#frontend)
4. [База данных](#база-данных)
5. [Аутентификация](#аутентификация)
6. [Команды и роли](#команды-и-роли)
7. [Задачи](#задачи)
8. [История изменений](#история-изменений)
9. [Деплой](#деплой)
10. [Переменные окружения](#переменные-окружения)

---

## Архитектура

```
Browser
  │
  ▼
Nginx :80
  ├─ /api/*  → FastAPI :8000 (Python)
  └─ /*      → Next.js :4040 (Node.js)
```

- **Next.js** работает в standalone-режиме (`output: 'standalone'`), не требует `node_modules` в production.
- **FastAPI** использует `uvicorn` с 2 воркерами.
- **SQLite** хранится в `backend/app.db`, автоматически бэкапируется в `backend/backups/`.
- Оба процесса управляются **systemd** и перезапускаются при падении.

---

## Backend API

Базовый URL: `/api`  
Swagger UI: `/api/docs`

### Аутентификация

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/register` | Регистрация пользователя |
| POST | `/api/login` | Вход, получение токена сессии |
| POST | `/api/logout` | Выход |
| GET | `/api/me` | Текущий пользователь |

Токен передаётся через `Cookie: session=<token>`.

### Команды (Workspaces)

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/workspaces` | Список команд пользователя |
| POST | `/api/workspaces` | Создать команду |
| GET | `/api/workspaces/current` | Активная команда с участниками |
| PATCH | `/api/workspaces/{id}` | Переименовать |
| DELETE | `/api/workspaces/{id}` | Удалить |
| GET | `/api/workspaces/{id}/members` | Участники |
| PATCH | `/api/workspaces/{id}/members/{uid}` | Изменить роль |
| DELETE | `/api/workspaces/{id}/members/{uid}` | Исключить |
| POST | `/api/workspaces/{id}/invite` | Создать ссылку-приглашение |
| GET | `/api/workspaces/{id}/invites` | Список приглашений |
| DELETE | `/api/workspaces/{id}/invites/{iid}` | Отозвать приглашение |
| POST | `/api/workspaces/accept-invite` | Принять приглашение |
| POST | `/api/workspaces/{id}/leave` | Покинуть команду |

### Задачи

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/tasks?workspace_id=` | Список задач команды |
| POST | `/api/tasks` | Создать задачу |
| PUT | `/api/tasks/{id}` | Обновить задачу |
| DELETE | `/api/tasks/{id}` | Удалить задачу |
| POST | `/api/tasks/{id}/comments` | Добавить комментарий |
| GET | `/api/tasks/{id}/activity` | История изменений |

### Контакты

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/contacts?workspace_id=` | Список контактов |
| POST | `/api/contacts` | Создать контакт |
| PUT | `/api/contacts/{id}` | Обновить |
| DELETE | `/api/contacts/{id}` | Удалить |

### Теги

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/tags?workspace_id=` | Список тегов |
| POST | `/api/tags` | Создать тег |
| DELETE | `/api/tags/{id}` | Удалить тег |

### Документы

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/documents?workspace_id=` | Список документов |
| POST | `/api/documents` | Создать |
| PUT | `/api/documents/{id}` | Обновить |
| DELETE | `/api/documents/{id}` | Удалить |

### Служебные

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/health` | Проверка доступности |
| GET | `/api/backup/list` | Список бэкапов |
| POST | `/api/backup/now` | Создать бэкап вручную |

---

## Frontend

### Страницы

| Путь | Описание |
|---|---|
| `/login` | Вход / регистрация |
| `/tasks` | Список задач (drag-and-drop, фильтры) |
| `/board` | Канбан-доска |
| `/week` | Недельный планировщик |
| `/contacts` | CRM-контакты |
| `/documents` | Документы |
| `/settings` | Настройки команды, участники, приглашения |
| `/invite/[token]` | Принятие приглашения |

### Server Actions (`src/actions/`)

| Файл | Назначение |
|---|---|
| `tasks.ts` | CRUD задач, комментарии, история |
| `workspace.ts` | Управление командами, приглашения |
| `contacts.ts` | CRUD контактов |
| `tags.ts` | CRUD тегов |
| `documents.ts` | CRUD документов |
| `auth.ts` | Регистрация, вход, выход |

### Ключевые компоненты (`src/components/`)

| Компонент | Назначение |
|---|---|
| `task-modal.tsx` | Детальное окно задачи (мета, комментарии, история) |
| `share-modal.tsx` | Настройка доступа к задаче |
| `spreadsheet.tsx` | Табличный вид задач |
| `layout/sidebar.tsx` | Боковая навигация |
| `layout/user-profile-widget.tsx` | Переключатель команд, приглашения |

---

## База данных

SQLite, файл `backend/app.db`. Схема управляется через SQLAlchemy (code-first).

### Таблицы

| Таблица | Назначение |
|---|---|
| `users` | Пользователи |
| `sessions` | Сессии авторизации |
| `workspaces` | Команды |
| `workspace_members` | Участники команд с ролями |
| `workspace_invites` | Ссылки-приглашения |
| `projects` | Проекты |
| `tasks` | Задачи |
| `task_assignees` | Исполнители задач (many-to-many) |
| `task_tags` | Теги задач (many-to-many) |
| `comments` | Комментарии к задачам |
| `activities` | История изменений задач |
| `contacts` | CRM-контакты |
| `contact_phones` | Телефоны контактов |
| `tags` | Теги команды |
| `documents` | Документы |

Таблицы создаются автоматически при старте (`Base.metadata.create_all`).

---

## Аутентификация

- Пароли хешируются через **bcrypt**.
- После входа создаётся запись в `sessions` со случайным токеном и сроком жизни 30 дней.
- Токен хранится в `HttpOnly` cookie `alphatrack_session`.
- Все защищённые эндпоинты принимают токен через `deps.get_current_user`.

---

## Команды и роли

### Роли

| Роль | Права |
|---|---|
| `admin` | Полный доступ: управление участниками, настройки, удаление |
| `member` | Создание и редактирование задач, контактов, документов |
| `viewer` | Только чтение |

### Приглашения

- Генерируется JWT-подобный токен с ролью и workspace_id.
- Срок жизни — **7 дней**, ссылка **одноразовая**.
- Путь: `/invite/{token}` — при переходе аутентифицированный пользователь сразу добавляется в команду.
- Незалогиненный пользователь перенаправляется на `/login?invite={token}` и присоединяется после входа/регистрации.

---

## Задачи

### Поля задачи

| Поле | Тип | Описание |
|---|---|---|
| `title` | string | Название |
| `description` | text | Описание |
| `status` | string | Статус (из набора команды) |
| `priority` | enum | none / low / medium / high |
| `startDate` | date | Дата начала |
| `dueDate` | date | Дедлайн |
| `group` | enum | Today / Tomorrow / Later / No date |
| `assignees` | User[] | Исполнители |
| `tags` | Tag[] | Теги |
| `contactId` | string? | Привязанный контакт |
| `projectId` | string? | Проект |

### Виды отображения

- **Список** — группировка по дате (Today / Tomorrow / Later / No date) с drag-and-drop.
- **Канбан** — колонки по статусам, drag-and-drop между колонками.
- **Неделя** — сетка по дням, задачи перетаскиваются между днями.
- **Таблица** — редактируемая сетка всех задач.

---

## История изменений

При каждом изменении задачи бэкенд записывает строку в таблицу `activities`.

### Отслеживаемые события

| Событие | Описание |
|---|---|
| `created` | Задача создана |
| `title` | Переименование |
| `status` | Смена статуса |
| `priority` | Смена приоритета |
| `description` | Изменение описания |
| `dueDate` | Изменение дедлайна |
| `startDate` | Изменение даты начала |
| `contact` | Привязка / смена контакта |
| `assignee_added` | Добавлен исполнитель |
| `assignee_removed` | Удалён исполнитель |
| `tag_added` | Добавлен тег |
| `tag_removed` | Удалён тег |
| `comment_added` | Добавлен комментарий |

Каждая запись содержит: автор, timestamp, тип события, payload (до/после для scalar-полей, имя пользователя/тега для отношений).

---

## Деплой

### Требования к серверу

- Debian 11+ / Ubuntu 22+
- 1 GB RAM минимум
- Python 3.11+
- Node.js 20 LTS
- nginx

### Первичная установка

```bash
# Залить код на сервер
rsync -az \
  --exclude node_modules --exclude .next \
  --exclude backend/.venv --exclude backend/app.db \
  ./ root@SERVER:/opt/alphatrack/

# Подключиться и настроить
ssh root@SERVER
cp /opt/alphatrack/.env.example /opt/alphatrack/.env
# Отредактировать .env
bash /opt/alphatrack/deploy/setup.sh
```

Скрипт `setup.sh`:
1. Устанавливает Node.js 20, Python, nginx
2. Создаёт системного пользователя `alphatrack`
3. Создаёт Python venv и устанавливает зависимости
4. Собирает Next.js (`npm run build`)
5. Устанавливает systemd-сервисы `alphatrack-backend` и `alphatrack-frontend`
6. Настраивает nginx как reverse proxy на порт 80

### Обновление

```bash
bash deploy/deploy.sh root@SERVER
```

Синхронизирует файлы, обновляет зависимости, пересобирает фронт, перезапускает сервисы.

### Управление сервисами

```bash
systemctl status alphatrack-backend
systemctl status alphatrack-frontend
journalctl -u alphatrack-backend -f
journalctl -u alphatrack-frontend -f
```

---

## Переменные окружения

Файл `.env` в корне проекта:

| Переменная | Описание | Пример |
|---|---|---|
| `NEXT_PUBLIC_URL` | Публичный URL приложения (для ссылок-инвайтов) | `http://194.3.0.126` |
| `NEXT_PUBLIC_API_URL` | Внутренний URL API (фронт → бэкенд) | `http://127.0.0.1:8000` |
