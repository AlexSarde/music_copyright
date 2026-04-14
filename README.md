# Music Copyright Registry

A REST API + CLI tool to register and manage song copyrights. Built with Express, JWT auth, and an MCP server so Claude can interact with it via natural language.

---

## Setup

**Requirements:** Node.js installed at `C:\Program Files\nodejs\`

```powershell
# Install dependencies
& "C:\Program Files\nodejs\npm.cmd" install

# Start the server
& "C:\Program Files\nodejs\node.exe" src/server.js
```

Server runs at `http://localhost:3000`

---

## REST API

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create a new user account |
| POST | `/auth/login` | No | Login and receive a JWT token |
| GET | `/songs` | No | List all songs |
| GET | `/songs/:id` | No | Get a single song |
| POST | `/songs` | Yes | Register a new song copyright |
| PUT | `/songs/:id` | Yes | Update your song |
| DELETE | `/songs/:id` | Yes | Delete your song |

Protected routes require `Authorization: Bearer <token>` header.

---

## CLI

```powershell
$node = "& 'C:\Program Files\nodejs\node.exe' src/cli.js"

# Auth
node src/cli.js register --name Alice --email alice@test.com --password secret123
node src/cli.js login    --email alice@test.com --password secret123
node src/cli.js whoami
node src/cli.js logout

# Songs
node src/cli.js song:add    --title "My Song" --genre Pop --lyrics "la la la"
node src/cli.js song:list
node src/cli.js song:list   --mine
node src/cli.js song:get    --id 1
node src/cli.js song:update --id 1 --genre Rock
node src/cli.js song:delete --id 1
```

Login is saved automatically — you only need to do it once per session.

---

## MCP (Claude Integration)

The MCP server lets Claude perform operations via natural language.

Registered via `.mcp.json` — Claude Code picks it up automatically when you open this project. Just talk to Claude:

> "Register a song called Neon Lights in the genre Electronic for user Bob"

---

## Project Structure

```
src/
  db.js              — Database + all domain logic (shared by REST API and MCP)
  server.js          — Express REST API
  mcp-server.js      — MCP server (Claude integration via stdio)
  cli.js             — Command line interface
skills/
  music-copyright.md — Claude skill triggers and instructions
.mcp.json            — MCP server registration for Claude Code
.env                 — Environment variables (not committed)
data/
  copyright.json     — Database file (auto-created, not committed)
```

---

## Environment Variables

Create a `.env` file in the project root:

```
PORT=3000
JWT_SECRET=your-long-random-secret
DB_PATH=./data/copyright.json
```

---

## Branch Strategy

```
main        ← stable production code
dev         ← integration branch
feature/*   ← one branch per feature
```

Always branch from `dev`, open a PR back into `dev`, never commit directly to `main`.
