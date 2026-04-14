#!/usr/bin/env node
/**
 * cli.js — Dedicated CLI for the Music Copyright Registry
 *
 * Usage:
 *   node src/cli.js <command> [options]
 *
 * Commands:
 *   register    Register a new user
 *   login       Log in and save token
 *   whoami      Show current logged-in user
 *   logout      Clear saved token
 *
 *   song:add    Register a new song copyright
 *   song:list   List all songs (or filter by your own)
 *   song:get    Get a single song by ID
 *   song:update Update a song you own
 *   song:delete Delete a song you own
 */

import {
  registerUser,
  loginUser,
  createSong,
  getSong,
  listSongs,
  updateSong,
  deleteSong,
} from "./db.js";
import fs from "fs";
import path from "path";
import os from "os";

// ─── Session (stores logged-in user + token) ──────────────────────────────────

const SESSION_PATH = path.join(os.homedir(), ".music-copyright-session.json");

function loadSession() {
  try {
    return JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveSession(data) {
  fs.writeFileSync(SESSION_PATH, JSON.stringify(data, null, 2), "utf8");
}

function clearSession() {
  fs.rmSync(SESSION_PATH, { force: true });
}

function requireAuth() {
  const session = loadSession();
  if (!session) {
    fail("Not logged in. Run: node src/cli.js login");
  }
  return session;
}

// ─── Output helpers ───────────────────────────────────────────────────────────

function ok(label, data) {
  console.log(`\n✔  ${label}`);
  if (data) {
    const lines = Object.entries(data)
      .filter(([k]) => k !== "token" && k !== "password")
      .map(([k, v]) => `   ${k.padEnd(14)} ${v}`);
    console.log(lines.join("\n"));
  }
  console.log();
}

function fail(msg) {
  console.error(`\n✘  ${msg}\n`);
  process.exit(1);
}

function printSong(s) {
  console.log(`\n   [${s.id}] ${s.title}`);
  console.log(`       author     ${s.author_name}`);
  if (s.genre) console.log(`       genre      ${s.genre}`);
  if (s.lyrics) console.log(`       lyrics     ${s.lyrics.slice(0, 60)}${s.lyrics.length > 60 ? "…" : ""}`);
  console.log(`       registered ${s.registered_at}`);
}

// ─── Arg parser (no dependencies) ────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i += 2;
      } else {
        args[key] = true;
        i++;
      }
    } else {
      i++;
    }
  }
  return args;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

const commands = {

  register(args) {
    const { name, email, password } = args;
    if (!name || !email || !password)
      fail("Usage: register --name <name> --email <email> --password <password>");
    try {
      const result = registerUser(name, email, password);
      saveSession(result);
      ok("Registered & logged in", { id: result.id, name: result.name, email: result.email });
    } catch (e) {
      fail(e.message);
    }
  },

  login(args) {
    const { email, password } = args;
    if (!email || !password)
      fail("Usage: login --email <email> --password <password>");
    try {
      const result = loginUser(email, password);
      saveSession(result);
      ok("Logged in", { id: result.id, name: result.name, email: result.email });
    } catch (e) {
      fail(e.message);
    }
  },

  whoami() {
    const session = loadSession();
    if (!session) fail("Not logged in.");
    ok("Current user", { id: session.id, name: session.name, email: session.email });
  },

  logout() {
    clearSession();
    console.log("\n✔  Logged out\n");
  },

  "song:add"(args) {
    const session = requireAuth();
    const { title, genre, lyrics } = args;
    if (!title) fail("Usage: song:add --title <title> [--genre <genre>] [--lyrics <lyrics>]");
    try {
      const song = createSong({ title, author_id: session.id, genre, lyrics });
      ok("Song registered", {
        id: song.id,
        title: song.title,
        genre: song.genre ?? "—",
        registered_at: song.registered_at,
      });
    } catch (e) {
      fail(e.message);
    }
  },

  "song:list"(args) {
    const mine = args.mine;
    const session = mine ? requireAuth() : null;
    try {
      const songs = listSongs({ author_id: mine ? session.id : null });
      if (songs.length === 0) {
        console.log("\n   No songs found.\n");
        return;
      }
      console.log(`\n   ${songs.length} song(s)${mine ? " (yours)" : ""}:`);
      songs.forEach(printSong);
      console.log();
    } catch (e) {
      fail(e.message);
    }
  },

  "song:get"(args) {
    const { id } = args;
    if (!id) fail("Usage: song:get --id <id>");
    try {
      const song = getSong(Number(id));
      printSong(song);
      if (song.lyrics) console.log(`\n       Full lyrics:\n       ${song.lyrics}`);
      console.log();
    } catch (e) {
      fail(e.message);
    }
  },

  "song:update"(args) {
    const session = requireAuth();
    const { id, title, genre, lyrics } = args;
    if (!id) fail("Usage: song:update --id <id> [--title <title>] [--genre <genre>] [--lyrics <lyrics>]");
    try {
      const song = updateSong(Number(id), session.id, { title, genre, lyrics });
      ok("Song updated", {
        id: song.id,
        title: song.title,
        genre: song.genre ?? "—",
      });
    } catch (e) {
      fail(e.message);
    }
  },

  "song:delete"(args) {
    const session = requireAuth();
    const { id } = args;
    if (!id) fail("Usage: song:delete --id <id>");
    try {
      deleteSong(Number(id), session.id);
      console.log(`\n✔  Song ${id} deleted\n`);
    } catch (e) {
      fail(e.message);
    }
  },
};

// ─── Help ─────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
Music Copyright CLI

USAGE
  node src/cli.js <command> [--option value]

AUTH COMMANDS
  register   --name <n> --email <e> --password <p>
  login      --email <e> --password <p>
  whoami
  logout

SONG COMMANDS
  song:add   --title <t> [--genre <g>] [--lyrics <l>]
  song:list  [--mine]
  song:get   --id <id>
  song:update --id <id> [--title <t>] [--genre <g>] [--lyrics <l>]
  song:delete --id <id>

EXAMPLES
  node src/cli.js register --name Alice --email alice@test.com --password secret123
  node src/cli.js song:add --title "Neon Lights" --genre Electronic
  node src/cli.js song:list
  node src/cli.js song:list --mine
  node src/cli.js song:delete --id 2
`);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const [,, command, ...rest] = process.argv;

if (!command || command === "--help" || command === "help") {
  printHelp();
  process.exit(0);
}

if (!commands[command]) {
  fail(`Unknown command: "${command}". Run with --help to see all commands.`);
}

const args = parseArgs(rest);
commands[command](args);
