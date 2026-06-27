const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    status: {
      type: String,
      enum: ["todo", "in_progress", "done"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueDate: { type: Date, default: null },
    tags: [{ type: String, trim: true, maxlength: 30 }],
  },
  { timestamps: true }
);

// Common query pattern: a user's tasks filtered by status
taskSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("Task", taskSchema);
