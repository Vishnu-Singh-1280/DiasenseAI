# DiaSense AI — Deployment Guide

This guide covers options for deploying **DiaSense AI** to production.

---

## 1. Environment Variables Required

Make sure the following variables are configured in your production environment:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/diasense_ai` |
| `JWT_SECRET` | Secret key for JWT session tokens | `random-secure-string-at-least-32-chars` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Listening port (default 3000) | `3000` |
| `OWNER_OPEN_ID` | Admin identifier | `local-admin` |
| `OPENAI_API_KEY` | *(Optional)* For AI chat assistant | `sk-...` |

---

## 2. Option A: Deployment via Docker Compose (VPS / Server)

If deploying to a VPS (Ubuntu/Debian on DigitalOcean, AWS EC2, Hetzner, Linode):

1. Clone or copy your project folder to your server:
   ```bash
   git clone <your-repo-url> diasense
   cd diasense
   ```

2. Start the database and web app:
   ```bash
   docker compose up -d --build
   ```

3. Run migrations inside the container:
   ```bash
   docker compose exec app pnpm db:push
   ```

Your app will be live on `http://<your-server-ip>:3000`.

---

## 3. Option B: Cloud Hosting (Render / Railway / Fly.io)

### Railway
1. Create a new project on [Railway.app](https://railway.app).
2. Add a **MySQL** database from Railway templates.
3. Deploy DiaSense from GitHub.
4. Set Environment Variables:
   - `DATABASE_URL`: `${{MySQL.MYSQL_URL}}`
   - `JWT_SECRET`: `<any-secret-token>`
   - `NODE_ENV`: `production`
5. Set Build Command: `pnpm install && pnpm build`
6. Set Start Command: `pnpm start`

### Render
1. Create a MySQL database (or connect an external MySQL database like PlanetScale / Aiven).
2. Create a **Web Service** pointing to your repository.
3. Runtime: **Node**.
4. Build Command: `pnpm install && pnpm build`
5. Start Command: `pnpm start`
6. Add your environment variables (`DATABASE_URL`, `JWT_SECRET`, etc.).

---

## 4. Option C: Local / Self-Hosted Production Run

To run in production mode on your current machine:

```powershell
# 1. Build client and server bundles
pnpm build

# 2. Start the production server
pnpm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
