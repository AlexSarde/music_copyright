/**
 * server.js — Express REST API (Step 1: The Product)
 *
 * Routes:
 *   POST /auth/register
 *   POST /auth/login
 *   POST /songs            (auth required)
 *   GET  /songs            (public)
 *   GET  /songs/:id        (public)
 *   PUT  /songs/:id        (auth required, owner only)
 *   DELETE /songs/:id      (auth required, owner only)
 */

import "dotenv/config";
import express from "express";
import {
  registerUser,
  loginUser,
  verifyToken,
  createSong,
  getSong,
  listSongs,
  updateSong,
  deleteSong,
} from "./db.js";

const app = express();
app.use(express.json());

// ─── Auth middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function handle(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      if (!res.headersSent) res.json(result);
    } catch (err) {
      const status = err.message?.includes("not found")
        ? 404
        : err.message?.includes("own")
        ? 403
        : err.message?.includes("already registered") ||
          err.message?.includes("Invalid email")
        ? 400
        : 500;
      res.status(status).json({ error: err.message });
    }
  };
}

// ─── Auth routes ──────────────────────────────────────────────────────────────

app.post(
  "/auth/register",
  handle((req) => {
    const { name, email, password } = req.body;
    return registerUser(name, email, password);
  })
);

app.post(
  "/auth/login",
  handle((req) => {
    const { email, password } = req.body;
    return loginUser(email, password);
  })
);

// ─── Song routes ──────────────────────────────────────────────────────────────

app.get(
  "/songs",
  handle((req) => {
    const author_id = req.query.author_id
      ? Number(req.query.author_id)
      : undefined;
    return listSongs({ author_id });
  })
);

app.get(
  "/songs/:id",
  handle((req) => getSong(Number(req.params.id)))
);

app.post(
  "/songs",
  requireAuth,
  handle((req) => {
    const { title, lyrics, genre } = req.body;
    return createSong({ title, author_id: req.user.id, lyrics, genre });
  })
);

app.put(
  "/songs/:id",
  requireAuth,
  handle((req) => {
    const { title, lyrics, genre } = req.body;
    return updateSong(Number(req.params.id), req.user.id, {
      title,
      lyrics,
      genre,
    });
  })
);

app.delete(
  "/songs/:id",
  requireAuth,
  handle((req) => deleteSong(Number(req.params.id), req.user.id))
);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Music Copyright API running on http://localhost:${PORT}`);
});
