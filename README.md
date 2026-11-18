# DiaSense AI 🩺

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Groq AI](https://img.shields.io/badge/Groq_AI-F05A28?style=flat&logo=fastapi&logoColor=white)](https://groq.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

> **DiaSense AI** is an intelligent diabetes risk estimation, wellness tracking, and AI health assistant platform powered by the Pima Indians Diabetes ML model and Groq LLM inference.

---

## 🌟 Key Features

- **Pima Indian ML Assessment**: Offline Random Forest ML model evaluates diabetes risk, BMI, and vital health scores instantly.
- **AI Health Chatbot**: Intelligent bilingual (Hinglish/English) assistant powered by Groq (`openai/gpt-oss-120b`).
- **Interactive OpenStreetMap Healthcare**: Automatically searches nearby hospitals, clinics, and doctors within 12km using browser Geolocation and Overpass API with direct navigation links.
- **Daily Health Logs & Analytics**: Track glucose levels, blood pressure, steps, sleep, and water intake with Chart.js trend visualizations.
- **PDF Medical Reports**: Generate downloadable medical summary reports with health metrics and physician disclaimers.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+ (Node 22 LTS recommended)
- pnpm 10+
- MySQL 8.x

### 1. Setup Environment
Copy `.env.example` or create `.env`:
```env
DATABASE_URL=mysql://root:password@127.0.0.1:3306/diasense_ai
JWT_SECRET=your-random-jwt-secret-key-32-chars
NODE_ENV=development
PORT=3000
OWNER_OPEN_ID=local-admin
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

### 2. Install & Push Database
```bash
pnpm install
pnpm db:push
```

### 3. Run Application
```bash
# Development (with Vite HMR)
pnpm dev

# Or 1-click Windows batch:
# Double click start-dev.bat
```
Open [http://localhost:3000](http://localhost:3000).

---

## 🐳 Docker Deployment

Run both the MySQL database and DiaSense app with a single command:

```bash
docker compose up -d --build
```
Your app will be live at `http://localhost:3000`.

---

## ☁️ Cloud Deployment (Render / Railway / VPS)

### Deploy to Railway:
1. Fork or push this repository to your GitHub.
2. Link repository in [Railway.app](https://railway.app).
3. Add a MySQL service and configure environment variables:
   - `DATABASE_URL`: Your MySQL connection URL
   - `JWT_SECRET`: Any random 32-character secret
   - `GROQ_API_KEY`: Your Groq API key
   - `GROQ_MODEL`: `openai/gpt-oss-120b`
   - `NODE_ENV`: `production`
4. Set Build Command: `pnpm install && pnpm build`
5. Set Start Command: `pnpm start`

### Deploy to Render:
1. Create a **Web Service** from this GitHub repository.
2. Build Command: `pnpm install && pnpm build`
3. Start Command: `pnpm start`
4. Add environment variables in Render Dashboard.

---

## 📄 License
MIT License.
