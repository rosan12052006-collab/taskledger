import React, { useState, useMemo, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { Plus, Search, LogOut, Circle, CheckCircle2, Clock, Trash2, X, Menu, Stamp, Loader2 } from "lucide-react";
import api from "./api/client";

/**
 * TaskLedger — now wired to the real backend.
 * Auth, task list, create/advance/delete, and live updates via Socket.IO
 * all talk to http://localhost:5001/api instead of mock state.
 */

const PALETTE = {
  paper: "#F6F3EC",
  paperDark: "#EFEAE0",
  ink: "#22271F",
  inkSoft: "#5B5A4E",
  amber: "#C8862E",
  teal: "#2F6F66",
  rose: "#B5482F",
  line: "#DAD3C2",
};

const COLUMNS = [
  { key: "todo", label: "To do", icon: Circle, color: PALETTE.inkSoft },
  { key: "in_progress", label: "In progress", icon: Clock, color: PALETTE.amber },
  { key: "done", label: "Done", icon: CheckCircle2, color: PALETTE.teal },
];

const PRIORITY_DOT = { low: PALETTE.inkSoft, medium: PALETTE.amber, high: PALETTE.rose };

function shortId(id) {
  return id ? id.toString().slice(-6) : "------";
}

function formatDue(dueDate) {
  if (!dueDate) return "—";
  const d = new Date(dueDate);
  if (isNaN(d)) return "—";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function Stamped({ children }) {
  return (
    <span
      style={{
        border: `1.5px solid currentColor`,
        borderRadius: "3px",
        padding: "1px 6px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "10px",
        letterSpacing: "0.06em",
        transform: "rotate(-2deg)",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

function TaskCard({ task, onAdvance, onDelete }) {
  return (
    <div
      style={{
        background: "#FFFDF9",
        border: `1px solid ${PALETTE.line}`,
        borderRadius: "10px",
        padding: "14px 14px 12px",
        marginBottom: "12px",
        position: "relative",
        boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
      }}
      className="group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2" style={{ color: PALETTE.inkSoft }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px" }}>#{shortId(task._id)}</span>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: PRIORITY_DOT[task.priority] || PALETTE.inkSoft,
              display: "inline-block",
            }}
            title={`${task.priority} priority`}
          />
        </div>
        <button
          onClick={() => onDelete(task._id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: PALETTE.rose }}
          aria-label="Delete task"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <h3
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: "16px",
          color: PALETTE.ink,
          marginTop: "6px",
          lineHeight: 1.3,
        }}
      >
        {task.title}
      </h3>
      {task.description ? (
        <p style={{ color: PALETTE.inkSoft, fontSize: "13px", marginTop: "4px", lineHeight: 1.4 }}>{task.description}</p>
      ) : null}

      <div className="flex items-center justify-between mt-3">
        <Stamped>{`DUE ${formatDue(task.dueDate)}`}</Stamped>
        {task.status !== "done" && (
          <button
            onClick={() => onAdvance(task)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              color: PALETTE.teal,
              border: `1px solid ${PALETTE.teal}`,
              borderRadius: "6px",
              padding: "3px 8px",
              background: "transparent",
            }}
          >
            {task.status === "todo" ? "Start →" : "Complete →"}
          </button>
        )}
      </div>
    </div>
  );
}

function NewTaskModal({ open, onClose, onCreate, submitting }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("medium");
  const [due, setDue] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError("");
    try {
      await onCreate({ title, description: desc, priority, dueDate: due || null });
      setTitle(""); setDesc(""); setPriority("medium"); setDue("");
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't create that task. Try again.");
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(34,39,31,0.45)", zIndex: 50 }}
      className="flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        style={{ background: PALETTE.paper, borderRadius: "12px", border: `1px solid ${PALETTE.line}`, width: "100%", maxWidth: 420 }}
        className="p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: PALETTE.ink }}>New entry</h2>
          <button type="button" onClick={onClose} style={{ color: PALETTE.inkSoft }}><X size={18} /></button>
        </div>

        {error && (
          <p style={{ color: PALETTE.rose, fontSize: 12.5, marginBottom: 10 }}>{error}</p>
        )}

        <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: PALETTE.inkSoft }}>TITLE</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          style={{ width: "100%", border: `1px solid ${PALETTE.line}`, borderRadius: 8, padding: "8px 10px", marginTop: 4, marginBottom: 12, background: "#FFFDF9", color: PALETTE.ink }}
        />
        <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: PALETTE.inkSoft }}>NOTES</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="Optional detail"
          style={{ width: "100%", border: `1px solid ${PALETTE.line}`, borderRadius: 8, padding: "8px 10px", marginTop: 4, marginBottom: 12, background: "#FFFDF9", color: PALETTE.ink, resize: "none" }}
        />
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: PALETTE.inkSoft }}>PRIORITY</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: "100%", border: `1px solid ${PALETTE.line}`, borderRadius: 8, padding: "8px 10px", marginTop: 4, background: "#FFFDF9", color: PALETTE.ink }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex-1">
            <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: PALETTE.inkSoft }}>DUE</label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: "100%", border: `1px solid ${PALETTE.line}`, borderRadius: 8, padding: "8px 10px", marginTop: 4, background: "#FFFDF9", color: PALETTE.ink }} />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          style={{ width: "100%", background: PALETTE.ink, color: PALETTE.paper, borderRadius: 8, padding: "10px 0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, letterSpacing: "0.04em", opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? "ADDING…" : "ADD TO LEDGER"}
        </button>
      </form>
    </div>
  );
}

function LoginScreen({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data } = await api.post("/auth/signup", { name, email, password });
        onAuthed(data.user);
      } else {
        const { data } = await api.post("/auth/login", { email, password });
        onAuthed(data.user);
      }
    } catch (err) {
      setError(err?.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: PALETTE.paper, minHeight: "100%" }} className="flex items-center justify-center px-4 py-16">
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Stamp size={20} style={{ color: PALETTE.amber }} />
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, color: PALETTE.ink }}>TaskLedger</span>
        </div>
        <div
          style={{ background: "#FFFDF9", border: `1px solid ${PALETTE.line}`, borderRadius: 12 }}
          className="p-6"
        >
          <div className="flex mb-5" style={{ borderBottom: `1px solid ${PALETTE.line}` }}>
            {["login", "signup"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  letterSpacing: "0.05em",
                  color: mode === m ? PALETTE.ink : PALETTE.inkSoft,
                  borderBottom: mode === m ? `2px solid ${PALETTE.amber}` : "2px solid transparent",
                  background: "none",
                }}
              >
                {m === "login" ? "LOG IN" : "SIGN UP"}
              </button>
            ))}
          </div>

          {error && <p style={{ color: PALETTE.rose, fontSize: 12.5, marginBottom: 10 }}>{error}</p>}

          <form onSubmit={submit}>
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                required
                style={{ width: "100%", border: `1px solid ${PALETTE.line}`, borderRadius: 8, padding: "9px 10px", marginBottom: 10, background: PALETTE.paper, color: PALETTE.ink }}
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              required
              style={{ width: "100%", border: `1px solid ${PALETTE.line}`, borderRadius: 8, padding: "9px 10px", marginBottom: 10, background: PALETTE.paper, color: PALETTE.ink }}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 8 characters)"
              type="password"
              required
              minLength={8}
              style={{ width: "100%", border: `1px solid ${PALETTE.line}`, borderRadius: 8, padding: "9px 10px", marginBottom: 16, background: PALETTE.paper, color: PALETTE.ink }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", background: PALETTE.ink, color: PALETTE.paper, borderRadius: 8, padding: "10px 0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, letterSpacing: "0.04em", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "PLEASE WAIT…" : mode === "login" ? "ENTER LEDGER" : "CREATE ACCOUNT"}
            </button>
          </form>
        </div>
        <p style={{ textAlign: "center", marginTop: 16, color: PALETTE.inkSoft, fontSize: 12 }}>
          Connected to your local API at localhost:5001.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  // On first load, check if there's already a valid session (cookie still good)
  useEffect(() => {
    api.get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  // Fetch tasks once authenticated
  const fetchTasks = useCallback(() => {
    setLoadingTasks(true);
    setLoadError("");
    api.get("/tasks")
      .then(({ data }) => setTasks(data.tasks))
      .catch((err) => setLoadError(err?.response?.data?.error || "Couldn't load tasks."))
      .finally(() => setLoadingTasks(false));
  }, []);

  useEffect(() => {
    if (user) fetchTasks();
  }, [user, fetchTasks]);

  // Live updates via Socket.IO once authenticated
  useEffect(() => {
    if (!user) return;
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
      : "http://localhost:5001";
    const socket = io(socketUrl, { withCredentials: true });

    socket.on("task:created", (task) => {
      setTasks((prev) => (prev.some((t) => t._id === task._id) ? prev : [task, ...prev]));
    });
    socket.on("task:updated", (task) => {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
    });
    socket.on("task:deleted", ({ id }) => {
      setTasks((prev) => prev.filter((t) => t._id !== id));
    });

    return () => socket.disconnect();
  }, [user]);

  const filtered = useMemo(
    () => tasks.filter((t) => t.title.toLowerCase().includes(query.toLowerCase())),
    [tasks, query]
  );

  async function advance(task) {
    const nextStatus = task.status === "todo" ? "in_progress" : "done";
    try {
      // Rely on the "task:updated" socket event to update state, same reasoning
      // as createTask above — avoids a double-update race.
      await api.put(`/tasks/${task._id}`, { status: nextStatus });
    } catch (err) {
      alert(err?.response?.data?.error || "Couldn't update that task.");
    }
  }

  async function deleteTask(id) {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      alert(err?.response?.data?.error || "Couldn't delete that task.");
    }
  }

  async function createTask(payload) {
    setCreating(true);
    try {
      // Don't add to state here — the server's "task:created" socket event
      // (which we're already subscribed to) is the single source of truth
      // for adding new tasks. Adding it both here and via the socket event
      // is what caused tasks to briefly appear twice.
      await api.post("/tasks", payload);
      setModalOpen(false);
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
      setTasks([]);
    }
  }

  if (checkingSession) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", background: PALETTE.paper, minHeight: "640px" }} className="flex items-center justify-center">
        <Loader2 className="animate-spin" style={{ color: PALETTE.inkSoft }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", minHeight: "640px" }}>
        <LoginScreen onAuthed={setUser} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: PALETTE.paper, minHeight: "640px", color: PALETTE.ink }}>
      {/* Header */}
      <header
        style={{ borderBottom: `1px solid ${PALETTE.line}`, background: PALETTE.paperDark }}
        className="px-4 sm:px-6 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <button className="sm:hidden" onClick={() => setNavOpen((v) => !v)} style={{ color: PALETTE.ink }}>
            <Menu size={20} />
          </button>
          <Stamp size={18} style={{ color: PALETTE.amber }} />
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 19 }}>TaskLedger</span>
        </div>
        <div className="hidden sm:flex items-center gap-2" style={{ background: "#FFFDF9", border: `1px solid ${PALETTE.line}`, borderRadius: 8, padding: "5px 10px" }}>
          <Search size={14} style={{ color: PALETTE.inkSoft }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries…"
            style={{ border: "none", outline: "none", background: "none", fontSize: 13, width: 160 }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 12, color: PALETTE.inkSoft, display: "none" }} className="sm:inline">{user.name}</span>
          <button
            onClick={() => setModalOpen(true)}
            style={{ background: PALETTE.ink, color: PALETTE.paper, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={14} /> NEW
          </button>
          <button onClick={logout} style={{ color: PALETTE.inkSoft }} aria-label="Log out">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* Mobile search */}
      <div className="sm:hidden px-4 pt-3">
        <div className="flex items-center gap-2" style={{ background: "#FFFDF9", border: `1px solid ${PALETTE.line}`, borderRadius: 8, padding: "7px 10px" }}>
          <Search size={14} style={{ color: PALETTE.inkSoft }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries…"
            style={{ border: "none", outline: "none", background: "none", fontSize: 13, width: "100%" }}
          />
        </div>
      </div>

      {/* Board */}
      <main className="px-4 sm:px-6 py-5">
        <div className="flex items-baseline justify-between mb-4">
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22 }}>This week's ledger</h1>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: PALETTE.inkSoft }}>
            {tasks.filter((t) => t.status === "done").length}/{tasks.length} CLOSED
          </span>
        </div>

        {loadError && (
          <p style={{ color: PALETTE.rose, fontSize: 13, marginBottom: 12 }}>{loadError}</p>
        )}

        {loadingTasks ? (
          <div className="flex items-center gap-2" style={{ color: PALETTE.inkSoft, fontSize: 13 }}>
            <Loader2 size={14} className="animate-spin" /> Loading your ledger…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {COLUMNS.map((col, idx) => {
              const colTasks = filtered.filter((t) => t.status === col.key);
              const Icon = col.icon;
              return (
                <div
                  key={col.key}
                  style={{
                    borderLeft: idx > 0 ? `1px dashed ${PALETTE.line}` : "none",
                    paddingLeft: idx > 0 ? 18 : 0,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={14} style={{ color: col.color }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: "0.05em", color: PALETTE.inkSoft }}>
                      {col.label.toUpperCase()} · {colTasks.length}
                    </span>
                  </div>
                  {colTasks.length === 0 ? (
                    <p style={{ color: PALETTE.inkSoft, fontSize: 12.5, fontStyle: "italic" }}>Nothing here.</p>
                  ) : (
                    colTasks.map((t) => (
                      <TaskCard key={t._id} task={t} onAdvance={advance} onDelete={deleteTask} />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <NewTaskModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={createTask} submitting={creating} />
    </div>
  );
}
