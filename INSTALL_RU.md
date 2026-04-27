# AlphaTrack — Полная установка на Debian с нуля

Пошаговая инструкция для развёртывания AlphaTrack на чистом сервере Debian 11/12 или Ubuntu 22.04+. После выполнения всех шагов проект будет работать в фоне (systemd), автоматически стартовать при перезагрузке сервера и быть доступен по 80/443 порту.

---

## 1. Требования

- **OS**: Debian 11/12 или Ubuntu 22.04+
- **Доступ**: root по SSH
- **Ресурсы**: минимум 1 ГБ RAM, 5 ГБ диска
- **Сеть**: открытые порты `22`, `80`, `443`
- **(Опционально)**: домен с A-записью на IP сервера — нужен для SSL

---

## 2. Подготовка сервера

Подключись по SSH:

```bash
ssh root@SERVER_IP
```

Обнови систему и поставь базовые пакеты:

```bash
apt update && apt upgrade -y
apt install -y git curl nano nginx python3 python3-venv python3-pip build-essential
```

Установи **Node.js 20 LTS** (NodeSource):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

Проверь версии:

```bash
node -v        # v20.x
npm -v         # 10.x
python3 -V     # 3.11+
nginx -v
```

---

## 3. Клонирование проекта

```bash
git clone https://github.com/trekgame55/AlphaTrack.git /opt/alphatrack
cd /opt/alphatrack
```

---

## 4. Настройка переменных окружения

```bash
cp .env.example .env
nano .env
```

Заполни:

```ini
NEXT_PUBLIC_URL=http://YOUR_SERVER_IP_OR_DOMAIN
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

- `NEXT_PUBLIC_URL` — публичный адрес. Используется в ссылках-приглашениях. Если есть домен, укажи `https://example.com`.
- `NEXT_PUBLIC_API_URL` — внутренний URL API. **Оставляй как есть** — frontend ходит на бэкенд через localhost.

Сохрани (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 5. Установка backend (Python)

Создай виртуальное окружение и установи зависимости:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install --upgrade pip
backend/.venv/bin/pip install -r backend/requirements.txt
```

---

## 6. Установка и сборка frontend (Next.js)

```bash
npm install
npm run build
```

Скопируй статику в standalone-сборку (Next.js этого не делает автоматически):

```bash
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

Проверь что собралось:

```bash
ls .next/standalone/server.js
```

---

## 7. Запуск через systemd (фоновые сервисы)

Установи юниты:

```bash
cp /opt/alphatrack/deploy/alphatrack-backend.service  /etc/systemd/system/
cp /opt/alphatrack/deploy/alphatrack-frontend.service /etc/systemd/system/
systemctl daemon-reload
```

Включи автостарт и запусти:

```bash
systemctl enable --now alphatrack-backend alphatrack-frontend
```

Проверь статус:

```bash
systemctl status alphatrack-backend  --no-pager
systemctl status alphatrack-frontend --no-pager
```

Оба должны быть `active (running)`. После этого терминал можно закрывать — сервисы продолжат работать и автоматически стартанут при перезагрузке сервера.

Локальная проверка:

```bash
curl http://127.0.0.1:8000/api/health
curl -I http://127.0.0.1:4040
```

---

## 8. Nginx (reverse proxy на порт 80)

```bash
cp /opt/alphatrack/deploy/nginx.conf /etc/nginx/sites-available/alphatrack
```

Открой и при необходимости укажи домен:

```bash
nano /etc/nginx/sites-available/alphatrack
# server_name _;  →  server_name example.com;
```

Включи сайт и удали дефолтный:

```bash
ln -s /etc/nginx/sites-available/alphatrack /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Открой в браузере `http://SERVER_IP` — должна загрузиться страница входа.

---

## 9. SSL через Let's Encrypt (опционально)

Только если у тебя есть домен:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d example.com
```

Certbot сам пропишет редирект с `http` на `https` и настроит автообновление сертификата (cron).

После SSL обнови `.env`:

```ini
NEXT_PUBLIC_URL=https://example.com
```

И перезапусти фронт:

```bash
systemctl restart alphatrack-frontend
```

---

## 10. Первый вход

1. Открой `http://SERVER_IP` (или `https://example.com`)
2. Зарегистрируй первого пользователя — он автоматически становится владельцем (`admin_plus`)
3. Создай рабочее пространство (workspace)
4. Пригласи коллег: **Settings → Members → Invite link** (роль выбирается при создании ссылки)
5. Настрой права ролей: **Settings → Roles** — toggles по каждой возможности отдельно для `member` и `viewer`

---

## 11. Обновление проекта

```bash
cd /opt/alphatrack
git pull
backend/.venv/bin/pip install -r backend/requirements.txt
npm install
npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
systemctl restart alphatrack-backend alphatrack-frontend
```

---

## 12. Бэкапы базы данных

- БД: `/opt/alphatrack/backend/app.db` (SQLite)
- Автобэкапы по расписанию: `/opt/alphatrack/backend/backups/`
- Ручной бэкап через UI: **Settings → Database → Create backup**
- Через API:
  ```bash
  curl -X POST http://127.0.0.1:8000/api/backup/now
  curl -O http://127.0.0.1:8000/api/backup/db/download
  ```
- Рекомендую дополнительно копировать папку `backups/` на внешнее хранилище через cron + `rsync`/`rclone`.

---

## 13. Управление и логи

```bash
# статус
systemctl status alphatrack-backend
systemctl status alphatrack-frontend

# перезапуск
systemctl restart alphatrack-backend
systemctl restart alphatrack-frontend

# остановка
systemctl stop alphatrack-frontend alphatrack-backend

# отключить автозапуск
systemctl disable alphatrack-frontend alphatrack-backend

# живые логи
journalctl -u alphatrack-backend  -f
journalctl -u alphatrack-frontend -f

# последние 200 строк
journalctl -u alphatrack-backend -n 200 --no-pager
```

---

## 14. Troubleshooting

| Симптом | Решение |
|---|---|
| **502 Bad Gateway от nginx** | `systemctl status alphatrack-frontend` / `alphatrack-backend` — посмотреть, упал ли сервис, и логи через `journalctl` |
| **Порт занят при старте** | `ss -tlnp \| grep -E ':(8000\|4040)'` → `kill -9 <PID>` → перезапустить сервис |
| **Пустые страницы, нет стилей** | Не скопированы `public/` и `.next/static/` внутрь `.next/standalone/`. Повтори шаг 6 |
| **`MODULE_NOT_FOUND: server.js`** | `npm run build` не выполнен или отсутствует `output: 'standalone'` в `next.config.mjs` |
| **Cookie не сохраняется / разлогинивает** | Проверь `NEXT_PUBLIC_URL` в `.env` (должен совпадать с адресом в браузере), перезапусти `alphatrack-frontend` |
| **`Permission denied` на app.db** | `chown -R root:root /opt/alphatrack/backend && chmod 644 /opt/alphatrack/backend/app.db` |
| **Изменения в `.env` не применились** | `systemctl restart alphatrack-frontend alphatrack-backend` |
| **Frontend собирается с ошибками TypeScript** | Удали `node_modules` и `.next`, повтори `npm install && npm run build` |
| **Не работают приглашения** | Проверь `NEXT_PUBLIC_URL` — он должен быть публично доступным URL |

---

## 15. Безопасность (рекомендации)

**Файрвол**:

```bash
apt install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

**SSH**: используй ключи и отключи парольный логин для root в `/etc/ssh/sshd_config`:

```
PasswordAuthentication no
PermitRootLogin prohibit-password
```

`systemctl restart ssh`

**Системные обновления**: периодически `apt update && apt upgrade -y`.

**Бэкапы**: настрой автоматическую выгрузку `backend/backups/` на внешний сервер.

---

## Готово

После шагов 1–8 сайт работает в фоне на `http://SERVER_IP`. После шага 9 — на `https://example.com`. Терминал можно закрывать, сервисы systemd живут самостоятельно и переживают перезагрузку сервера.
