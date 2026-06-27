require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const initSocket = require("./sockets");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const { startReminderJob } = require("./jobs/dueReminders");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

app.use(notFound);
app.use(errorHandler);

const httpServer = http.createServer(app);
const io = initSocket(httpServer, clientOrigin);
app.set("io", io); // controllers read this via req.app.get("io") to broadcast

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`[server] TaskLedger API running on http://localhost:${PORT}`);
  });
  startReminderJob();
});
