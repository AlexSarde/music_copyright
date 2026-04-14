/**
 * mcp-server.js — MCP Server (Step 2: The Bridge)
 *
 * Exposes the same db.js functions as MCP "Tools" so Claude can call them.
 *
 * CRITICAL: This server communicates over stdio (JSON-RPC).
 *   - NEVER use console.log() here — it corrupts the transport.
 *   - Use logToFile() or console.error() for all debugging output.
 *
 * To register this server in Claude Code:
 *   claude mcp add music-copyright -- node /absolute/path/to/src/mcp-server.js
 */

import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import {
  registerUser,
  loginUser,
  createSong,
  getSong,
  listSongs,
  updateSong,
  deleteSong,
} from "./db.js";

// ─── File logger (never use console.log in an stdio MCP server) ───────────────

const LOG_PATH = "./data/mcp.log";
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_PATH, line);
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "register_user",
    description:
      "Register a new user account and return a JWT token. Use this when a user wants to sign up.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name" },
        email: { type: "string", description: "Email address (must be unique)" },
        password: { type: "string", description: "Password (min 6 chars recommended)" },
      },
      required: ["name", "email", "password"],
    },
  },
  {
    name: "login_user",
    description:
      "Log in with email and password. Returns a JWT token for subsequent tool calls.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string" },
        password: { type: "string" },
      },
      required: ["email", "password"],
    },
  },
  {
    name: "create_song",
    description:
      "Register a new song copyright. Requires the author's user ID (from login/register). " +
      "Call check_auth / login_user first if you do not have an author_id.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Song title" },
        author_id: { type: "number", description: "User ID of the copyright owner" },
        lyrics: { type: "string", description: "Optional — song lyrics for the record" },
        genre: { type: "string", description: "Optional — e.g. Pop, Rock, Jazz" },
      },
      required: ["title", "author_id"],
    },
  },
  {
    name: "get_song",
    description: "Retrieve a single song copyright record by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Song ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_songs",
    description: "List all registered songs. Optionally filter by author_id.",
    inputSchema: {
      type: "object",
      properties: {
        author_id: {
          type: "number",
          description: "Optional — filter to only this user's songs",
        },
      },
    },
  },
  {
    name: "update_song",
    description:
      "Update a song's title, lyrics, or genre. Only the original author can update.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Song ID to update" },
        author_id: { type: "number", description: "Must match the song's owner" },
        title: { type: "string" },
        lyrics: { type: "string" },
        genre: { type: "string" },
      },
      required: ["id", "author_id"],
    },
  },
  {
    name: "delete_song",
    description: "Delete a song copyright record. Only the original author can delete.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Song ID to delete" },
        author_id: { type: "number", description: "Must match the song's owner" },
      },
      required: ["id", "author_id"],
    },
  },
];

// ─── Tool dispatcher ──────────────────────────────────────────────────────────

function dispatchTool(name, args) {
  switch (name) {
    case "register_user":
      return registerUser(args.name, args.email, args.password);
    case "login_user":
      return loginUser(args.email, args.password);
    case "create_song":
      return createSong(args);
    case "get_song":
      return getSong(args.id);
    case "list_songs":
      return listSongs(args);
    case "update_song": {
      const { id, author_id, ...fields } = args;
      return updateSong(id, author_id, fields);
    }
    case "delete_song":
      return deleteSong(args.id, args.author_id);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── MCP Server setup ─────────────────────────────────────────────────────────

const server = new Server(
  { name: "music-copyright", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  log("tools/list called");
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  log(`tools/call: ${name}(${JSON.stringify(args)})`);

  try {
    const result = dispatchTool(name, args ?? {});
    // Passwords must never leak back through tool results.
    if (result?.password) delete result.password;
    log(`tools/call: ${name} -> OK`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    log(`tools/call: ${name} -> ERROR: ${err.message}`);
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
log("MCP server started — listening on stdio");
