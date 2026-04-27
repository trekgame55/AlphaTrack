# AlphaTrack — Full Installation on Debian from Scratch

Step-by-step guide to deploy AlphaTrack on a clean Debian 11/12 or Ubuntu 22.04+ server. After completing all steps, the project will run in the background (systemd), auto-start on server reboot, and be accessible on port 80/443.

---

## 1. Requirements

- **OS**: Debian 11/12 or Ubuntu 22.04+
- **Access**: root via SSH
- **Resources**: minimum 1 GB RAM, 5 GB disk
- **Network**: open ports `22`, `80`, `443`
- **(Optional)**: a domain with an A record pointing to the server IP — required for SSL

---

## 2. Server preparation

Connect via SSH:

```bash
ssh root@SERVER_IP
```

Update the system and install base packages:

```bash
apt update && apt upgrade -y
apt install -y git curl nano nginx python3 python3-venv python3-pip build-essential
```

Install **Node.js 20 LTS** (NodeSource):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

Verify versions:

```bash
node -v        # v20.x
npm -v         # 10.x
python3 -V     # 3.11+
nginx -v
```

---

## 3. Clone the project

```bash
git clone https://github.com/trekgame55/AlphaTrack.git /opt/alphatrack
cd /opt/alphatrack
```

---

## 4. Configure environment variables

```bash
cp .env.example .env
nano .env
```

Fill in:

```ini
NEXT_PUBLIC_URL=http://YOUR_SERVER_IP_OR_DOMAIN
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

- `NEXT_PUBLIC_URL` — public address. Used in invite links. With a domain set `https://example.com`.
- `NEXT_PUBLIC_API_URL` — internal API URL. **Leave as is** — frontend talks to backend over localhost.

Save (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 5. Backend installation (Python)

Create a virtual environment and install dependencies:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install --upgrade pip
backend/.venv/bin/pip install -r backend/requirements.txt
```

---

## 6. Frontend install & build (Next.js)

```bash
npm install
npm run build
```

Copy static assets into the standalone build (Next.js does not do this automatically):

```bash
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

Verify:

```bash
ls .next/standalone/server.js
```

---

## 7. Run as systemd services (background)

Install unit files:

```bash
cp /opt/alphatrack/deploy/alphatrack-backend.service  /etc/systemd/system/
cp /opt/alphatrack/deploy/alphatrack-frontend.service /etc/systemd/system/
systemctl daemon-reload
```

Enable autostart and launch:

```bash
systemctl enable --now alphatrack-backend alphatrack-frontend
```

Check status:

```bash
systemctl status alphatrack-backend  --no-pager
systemctl status alphatrack-frontend --no-pager
```

Both should be `active (running)`. After this you can close the terminal — the services keep running and auto-start on reboot.

Local check:

```bash
curl http://127.0.0.1:8000/api/health
curl -I http://127.0.0.1:4040
```

---

## 8. Nginx (reverse proxy on port 80)

```bash
cp /opt/alphatrack/deploy/nginx.conf /etc/nginx/sites-available/alphatrack
```

Open and set your domain if needed:

```bash
nano /etc/nginx/sites-available/alphatrack
# server_name _;  →  server_name example.com;
```

Enable the site and remove the default:

```bash
ln -s /etc/nginx/sites-available/alphatrack /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Open `http://SERVER_IP` in a browser — the login page should load.

---

## 9. SSL via Let's Encrypt (optional)

Only if you have a domain:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d example.com
```

Certbot will configure the HTTP→HTTPS redirect and automatic certificate renewal (cron).

After SSL, update `.env`:

```ini
NEXT_PUBLIC_URL=https://example.com
```

And restart the frontend:

```bash
systemctl restart alphatrack-frontend
```

---

## 10. First login

1. Open `http://SERVER_IP` (or `https://example.com`)
2. Register the first user — they automatically become the owner (`admin_plus`)
3. Create a workspace
4. Invite teammates: **Settings → Members → Invite link** (role is selected when creating the link)
5. Configure role permissions: **Settings → Roles** — toggles per capability for `member` and `viewer`

---

## 11. Updating the project

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

## 12. Database backups

- DB: `/opt/alphatrack/backend/app.db` (SQLite)
- Scheduled auto-backups: `/opt/alphatrack/backend/backups/`
- Manual backup via UI: **Settings → Database → Create backup**
- Via API:
  ```bash
  curl -X POST http://127.0.0.1:8000/api/backup/now
  curl -O http://127.0.0.1:8000/api/backup/db/download
  ```
- Recommended: copy `backups/` to external storage via cron + `rsync`/`rclone`.

---

## 13. Management & logs

```bash
# status
systemctl status alphatrack-backend
systemctl status alphatrack-frontend

# restart
systemctl restart alphatrack-backend
systemctl restart alphatrack-frontend

# stop
systemctl stop alphatrack-frontend alphatrack-backend

# disable autostart
systemctl disable alphatrack-frontend alphatrack-backend

# live logs
journalctl -u alphatrack-backend  -f
journalctl -u alphatrack-frontend -f

# last 200 lines
journalctl -u alphatrack-backend -n 200 --no-pager
```

---

## 14. Troubleshooting

| Symptom | Fix |
|---|---|
| **502 Bad Gateway from nginx** | `systemctl status alphatrack-frontend` / `alphatrack-backend` — check whether the service crashed, view logs via `journalctl` |
| **Port already in use on start** | `ss -tlnp \| grep -E ':(8000\|4040)'` → `kill -9 <PID>` → restart the service |
| **Empty pages, no styles** | `public/` and `.next/static/` not copied into `.next/standalone/`. Repeat step 6 |
| **`MODULE_NOT_FOUND: server.js`** | `npm run build` was not run, or `next.config.mjs` is missing `output: 'standalone'` |
| **Cookie not persisted / kicked out** | Check `NEXT_PUBLIC_URL` in `.env` (must match the URL in the browser), restart `alphatrack-frontend` |
| **`Permission denied` on app.db** | `chown -R root:root /opt/alphatrack/backend && chmod 644 /opt/alphatrack/backend/app.db` |
| **Changes in `.env` not applied** | `systemctl restart alphatrack-frontend alphatrack-backend` |
| **Frontend build fails with TypeScript errors** | Remove `node_modules` and `.next`, repeat `npm install && npm run build` |
| **Invite links don't work** | Check `NEXT_PUBLIC_URL` — must be a publicly reachable URL |

---

## 15. Security recommendations

**Firewall**:

```bash
apt install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

**SSH**: use keys and disable password login for root in `/etc/ssh/sshd_config`:

```
PasswordAuthentication no
PermitRootLogin prohibit-password
```

`systemctl restart ssh`

**System updates**: periodically run `apt update && apt upgrade -y`.

**Backups**: set up automatic offsite copying of `backend/backups/`.

---

## Done

After steps 1–8 the site runs in the background on `http://SERVER_IP`. After step 9 — on `https://example.com`. The terminal can be closed; systemd services live on their own and survive reboots.
