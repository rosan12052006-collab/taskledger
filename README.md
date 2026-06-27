# TaskLedger

Full-stack task management app — React (Vite) frontend, Express + MongoDB
backend, JWT auth, real-time updates via Socket.IO, and email reminders for
tasks due soon.

## Structure

```
task-ledger/
├── client/   React frontend (Vite + Tailwind)
└── server/   Express API + MongoDB + Socket.IO
```

See `client/README.md` and `server/README.md` for setup instructions for
each half.

## Quick start (local dev)

```bash
# Terminal 1
cd server
npm install
cp .env.example .env   # fill in your values
npm run dev

# Terminal 2
cd client
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Deployment

- **Backend** → Render (or similar Node host)
- **Frontend** → Vercel or Netlify
- **Database** → MongoDB Atlas

When deploying, set these environment variables:

**Backend (Render):**
- `MONGO_URI_ATLAS` — your Atlas connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — long random strings
- `CLIENT_ORIGIN` — your deployed frontend's URL (e.g. `https://task-ledger.vercel.app`)
- `GMAIL_USER`, `GMAIL_APP_PASSWORD` — for email reminders
- `NODE_ENV=production`
- (`DB_MODE` and `RENDER` don't need setting manually — Render sets `RENDER=true` automatically, which the app uses to pick Atlas over local Mongo)

**Frontend (Vercel/Netlify):**
- `VITE_API_URL` — your deployed backend's URL + `/api` (e.g. `https://task-ledger-server.onrender.com/api`)
