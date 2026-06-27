const mongoose = require("mongoose");

/**
 * Auto-detects environment — no manual switching needed:
 *   - Running on Render -> Render automatically sets process.env.RENDER=true
 *     -> uses MONGO_URI_ATLAS
 *   - Running anywhere else (your own machine) -> uses MONGO_URI_LOCAL
 *
 * You can still force a choice by setting DB_MODE=local or DB_MODE=atlas
 * in .env, which overrides the auto-detection — but normally you won't need to.
 */
async function connectDB() {
  const onRender = process.env.RENDER === "true";
  const forcedMode = (process.env.DB_MODE || "").toLowerCase();

  const mode = forcedMode === "local" || forcedMode === "atlas"
    ? forcedMode
    : onRender ? "atlas" : "local";

  const uri = mode === "atlas" ? process.env.MONGO_URI_ATLAS : process.env.MONGO_URI_LOCAL;

  if (!uri) {
    console.error(`[db] Resolved mode "${mode}" but its URI is not set in .env`);
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log(`[db] MongoDB connected — mode: ${mode}${onRender ? " (detected Render)" : ""}, db: ${mongoose.connection.name}`);
  } catch (err) {
    console.error(`[db] Connection failed (${mode}):`, err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
