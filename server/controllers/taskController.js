const Task = require("../models/Task");

// io is attached to the app in server.js (app.set("io", io)) so controllers
// can broadcast without importing the socket file directly.
function emitToUser(req, event, payload) {
  const io = req.app.get("io");
  if (io) io.to(req.userId).emit(event, payload);
}

async function listTasks(req, res, next) {
  try {
    const { status, priority, search } = req.query;
    const filter = { userId: req.userId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) filter.title = { $regex: search, $options: "i" };

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

async function getTask(req, res, next) {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: "Task not found." });
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const { title, description, status, priority, dueDate, tags } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: "Title is required." });
    }

    const task = await Task.create({
      userId: req.userId,
      title: title.trim(),
      description: description?.trim() || "",
      status,
      priority,
      dueDate: dueDate || null,
      tags: Array.isArray(tags) ? tags : [],
    });

    emitToUser(req, "task:created", task);
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const allowed = ["title", "description", "status", "priority", "dueDate", "tags"];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: "Task not found." });

    emitToUser(req, "task:updated", task);
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: "Task not found." });

    emitToUser(req, "task:deleted", { id: task._id });
    res.json({ message: "Task deleted.", id: task._id });
  } catch (err) {
    next(err);
  }
}

module.exports = { listTasks, getTask, createTask, updateTask, deleteTask };
