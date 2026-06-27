# TaskLedger — Frontend

React (Vite) + Tailwind frontend. Right now `src/App.jsx` is the visual
prototype running on mock `useState` data — no backend calls yet. This gets
it running locally so you can see and click through the design.

## Setup

```bash
cd client
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Structure

```
client/
├── index.html           entry HTML, loads the Google Fonts used in the design
├── src/
│   ├── main.jsx          React root
│   ├── App.jsx           the TaskLedger UI (currently mock data)
│   └── index.css         Tailwind base imports
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

## Next step: connect to the real backend

Right now all task data lives in React state and disappears on refresh.
To wire it to the Express API in `../server`:

1. Make sure the backend is running on `http://localhost:5000` (see `server/README.md`).
2. Create `src/api/client.js`:
   ```js
   import axios from "axios";

   const api = axios.create({
     baseURL: "http://localhost:5000/api",
     withCredentials: true, // sends the httpOnly auth cookies
   });

   export default api;
   ```
3. Replace the mock `seedTasks` / `useState` calls in `App.jsx` with:
   - `api.get("/tasks")` on load
   - `api.post("/tasks", {...})` for create
   - `api.put(`/tasks/${id}`, {...})` for status changes
   - `api.delete(`/tasks/${id}`)` for delete
   - `api.post("/auth/login", { email, password })` / `/auth/signup` for the login screen
4. For real-time updates, connect a socket in a `useEffect`:
   ```js
   import { io } from "socket.io-client";

   useEffect(() => {
     const socket = io("http://localhost:5000", { withCredentials: true });
     socket.on("task:created", (task) => setTasks((prev) => [task, ...prev]));
     socket.on("task:updated", (task) =>
       setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)))
     );
     socket.on("task:deleted", ({ id }) =>
       setTasks((prev) => prev.filter((t) => t._id !== id))
     );
     return () => socket.disconnect();
   }, []);
   ```

I can do this wiring for you directly in `App.jsx` whenever you're ready — just ask.
