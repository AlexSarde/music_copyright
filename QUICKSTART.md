# Quick Start

## 1. Install dependencies
```
"C:\Program Files\nodejs\npm.cmd" install
```

## 2. Run the REST API
```
"C:\Program Files\nodejs\node.exe" src/server.js
```
Server starts at http://localhost:3000

## 3. Test the REST API (use PowerShell or a REST client like Postman)

```powershell
# Register a user
Invoke-WebRequest -Uri http://localhost:3000/auth/register `
  -Method POST -ContentType "application/json" `
  -Body '{"name":"Alice","email":"alice@example.com","password":"secret123"}' `
  -UseBasicParsing

# Login
Invoke-WebRequest -Uri http://localhost:3000/auth/login `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"alice@example.com","password":"secret123"}' `
  -UseBasicParsing

# Register a song (paste your token from login response)
Invoke-WebRequest -Uri http://localhost:3000/songs `
  -Method POST -ContentType "application/json" `
  -Headers @{Authorization="Bearer YOUR_TOKEN_HERE"} `
  -Body '{"title":"My Song","genre":"Pop"}' `
  -UseBasicParsing

# List all songs (no auth needed)
Invoke-WebRequest -Uri http://localhost:3000/songs -UseBasicParsing
```

## 4. MCP server
Already registered via .mcp.json in this folder.
Claude Code will prompt you to approve it when you open this project.

## File structure
```
src/
  db.js              — JSON file database + all domain logic (shared by REST & MCP)
  server.js          — Express REST API
  mcp-server.js      — MCP server (stdio transport)
skills/
  music-copyright.md — Skill triggers + agent instructions
data/
  copyright.json     — Database file (auto-created on first run)
  mcp.log            — MCP debug log
.mcp.json            — MCP server registration for Claude Code
```
