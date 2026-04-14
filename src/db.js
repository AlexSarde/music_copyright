/**
 * db.js — JSON file database + all domain logic.
 *
 * Replaces better-sqlite3 with a hand-rolled JSON store so there
 * are zero native compilation requirements.
 *
 * The exported function signatures are identical to the SQLite version —
 * server.js and mcp-server.js don't need to change.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.DB_PATH ?? "./data/copyright.json";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

// ─── JSON persistence ─────────────────────────────────────────────────────────

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const EMPTY_DB = { users: [], songs: [], _nextUserId: 1, _nextSongId: 1 };

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

function now() {
  return new Date().toISOString();
}

// ─── User functions ───────────────────────────────────────────────────────────

/**
 * Register a new user.
 * @returns {{ id, name, email, token }}
 */
export function registerUser(name, email, password) {
  if (!name || !email || !password) {
    throw new Error("name, email, and password are required");
  }

  const data = loadDB();

  if (data.users.find((u) => u.email === email)) {
    throw new Error(`Email already registered: ${email}`);
  }

  const user = {
    id: data._nextUserId++,
    name,
    email,
    password: bcrypt.hashSync(password, 10),
    created_at: now(),
  };
  data.users.push(user);
  saveDB(data);

  const payload = { id: user.id, name, email };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  return { ...payload, token };
}

/**
 * Log in an existing user.
 * @returns {{ id, name, email, token }}
 */
export function loginUser(email, password) {
  if (!email || !password) {
    throw new Error("email and password are required");
  }

  const { users } = loadDB();
  const user = users.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    throw new Error("Invalid email or password");
  }

  const payload = { id: user.id, name: user.name, email: user.email };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  return { ...payload, token };
}

/**
 * Verify a JWT and return the decoded payload.
 * @returns {{ id, name, email }}
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ─── Song / copyright functions ───────────────────────────────────────────────

/**
 * Register a new song copyright.
 * @returns {song}
 */
export function createSong({ title, author_id, lyrics = null, genre = null }) {
  if (!title || !author_id) {
    throw new Error("title and author_id are required");
  }

  const data = loadDB();
  const author = data.users.find((u) => u.id === author_id);
  if (!author) throw new Error(`User not found: ${author_id}`);

  const song = {
    id: data._nextSongId++,
    title,
    author_id,
    lyrics,
    genre,
    registered_at: now(),
  };
  data.songs.push(song);
  saveDB(data);

  return { ...song, author_name: author.name };
}

/**
 * Retrieve a single song by ID.
 * @returns {{ id, title, author_id, author_name, lyrics, genre, registered_at }}
 */
export function getSong(id) {
  const { songs, users } = loadDB();
  const song = songs.find((s) => s.id === id);
  if (!song) throw new Error(`Song not found: ${id}`);
  const author = users.find((u) => u.id === song.author_id);
  return { ...song, author_name: author?.name ?? "Unknown" };
}

/**
 * List all songs, optionally filtered by author_id.
 * @returns {Array}
 */
export function listSongs({ author_id = null } = {}) {
  const { songs, users } = loadDB();
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  return songs
    .filter((s) => (author_id ? s.author_id === author_id : true))
    .sort((a, b) => b.registered_at.localeCompare(a.registered_at))
    .map((s) => ({ ...s, author_name: userMap[s.author_id] ?? "Unknown" }));
}

/**
 * Update a song's title, lyrics, or genre. Only the owner can update.
 * @returns {updated song}
 */
export function updateSong(id, author_id, fields) {
  const data = loadDB();
  const idx = data.songs.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error(`Song not found: ${id}`);
  if (data.songs[idx].author_id !== author_id) {
    throw new Error("You do not own this song");
  }

  const allowed = ["title", "lyrics", "genre"];
  for (const key of allowed) {
    if (fields[key] !== undefined) data.songs[idx][key] = fields[key];
  }
  saveDB(data);
  return getSong(id);
}

/**
 * Delete a song. Only the owner can delete.
 */
export function deleteSong(id, author_id) {
  const data = loadDB();
  const idx = data.songs.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error(`Song not found: ${id}`);
  if (data.songs[idx].author_id !== author_id) {
    throw new Error("You do not own this song");
  }
  data.songs.splice(idx, 1);
  saveDB(data);
  return { deleted: true, id };
}
