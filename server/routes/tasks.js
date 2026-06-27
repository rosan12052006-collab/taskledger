const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");
const { checkDueSoonTasks } = require("../jobs/dueReminders");

const router = express.Router();

router.use(requireAuth);

router.get("/", listTasks);
router.post("/", createTask);
router.get("/:id", getTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);

// Manual trigger for testing the reminder email without waiting for the cron schedule.
// Not meant for production use as-is — fine for an intern project / dev testing.
router.post("/_test/send-reminders", async (req, res, next) => {
  try {
    await checkDueSoonTasks();
    res.json({ message: "Reminder check ran — see server console / your inbox." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
