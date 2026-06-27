# TaskLedger — Backend

Express + MongoDB API for the TaskLedger app: JWT auth (access + refresh tokens
in httpOnly cookies), task CRUD scoped per-user, and Socket.IO for real-time
updates across a user's open tabs/devices.

## Setup

```bash
cd server
npm install
cp .env.example .env     # then fill in real secrets + your Mongo URI
npm run dev               # nodemon, restarts on save
# or: npm start
```

You'll need a MongoDB instance — either local (`mongodb://localhost:27017/task-ledger`)
or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster. Generate strong
random strings for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (e.g. `openssl rand -hex 32`).

## Folder structure

```
server/
├── config/db.js              Mongo connection
├── models/User.js             User schema (password is hashed, never returned)
├── models/Task.js             Task schema, indexed on userId + status
├── middleware/tokens.js        sign/verify JWT helpers, shared cookie options
├── middleware/requireAuth.js   route guard — reads cookie or Bearer header
├── middleware/errorHandler.js  central 404 + error JSON responses
├── controllers/authController.js   signup / login / logout / refresh / me
├── controllers/taskController.js   task CRUD + socket broadcast on change
├── routes/auth.js              /api/auth/*
├── routes/tasks.js             /api/tasks/*  (all routes require auth)
├── sockets/index.js            Socket.IO server, JWT-authenticated, per-user rooms
└── server.js                   wires it all together
```

## API quick reference

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | `{ name, email, password }` | sets cookies, returns user |
| POST | `/api/auth/login` | `{ email, password }` | sets cookies, returns user |
| POST | `/api/auth/logout` | – | clears cookies |
| POST | `/api/auth/refresh` | – | uses refresh cookie to mint a new access token |
| GET | `/api/auth/me` | – | returns the logged-in user |
| GET | `/api/tasks?status=&priority=&search=` | – | list current user's tasks |
| POST | `/api/tasks` | `{ title, description?, status?, priority?, dueDate?, tags? }` | create |
| GET | `/api/tasks/:id` | – | get one |
| PUT | `/api/tasks/:id` | any subset of task fields | update |
| DELETE | `/api/tasks/:id` | – | delete |

All `/api/tasks/*` routes require a valid access token, sent automatically as
a cookie by the browser after login, or as `Authorization: Bearer <token>`
(useful for testing in Postman).

## Real-time

The frontend connects with:

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  withCredentials: true,             // sends the accessToken cookie
});

socket.on("task:created", (task) => { /* prepend to list */ });
socket.on("task:updated", (task) => { /* replace in list */ });
socket.on("task:deleted", ({ id }) => { /* remove from list */ });
```

Each socket connection is authenticated with the same JWT used for REST calls
and placed into a room named after the user's ID, so updates only reach that
user's own sessions.

## Testing it without a frontend yet

```bash
# sign up
curl -i -c cookies.txt -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"supersecret1"}'

# create a task using the cookie jar curl just saved
curl -i -b cookies.txt -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Wire up the API","priority":"high"}'

# list tasks
curl -i -b cookies.txt http://localhost:5000/api/tasks
```

## Next steps

1. Point the React app's API calls at `http://localhost:5000/api/...` with
   `axios.defaults.withCredentials = true` (or `fetch(..., { credentials: "include" })`).
2. Add an axios response interceptor that calls `/api/auth/refresh` on a 401
   and retries the original request once.
3. Swap the access token's cookie-only delivery for a Bearer header if you'd
   rather keep tokens in memory on the client instead of cookies.
