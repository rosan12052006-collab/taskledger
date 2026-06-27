function notFound(req, res, next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error("[error]", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join(", ") });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: "That email is already registered." });
  }

  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Something went wrong on our end." });
}

module.exports = { notFound, errorHandler };
