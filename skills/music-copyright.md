---
name: music-copyright
description: >
  Register, retrieve, update, and delete song copyright records.
  Handles user accounts and JWT auth against the local SQLite database.
triggers:
  - register a user
  - sign up
  - log in / login
  - register a song
  - copyright a song
  - upload a track
  - list my songs
  - show all songs
  - update song
  - delete song
---

# Music Copyright Skill

## Overview

This skill gives you access to a local music copyright registry via MCP tools.
All persistent state lives in an SQLite file (`data/copyright.db`).

## Tool Flow

### New user registration
1. Call `register_user` with `name`, `email`, `password`.
2. Save the returned `id` and `token` — you will need `id` as `author_id` for song tools.
3. Confirm registration to the user. Never repeat the token back verbatim in chat.

### Login
1. Call `login_user` with `email` and `password`.
2. Save the returned `id` and `token`.
3. If login fails with "Invalid email or password", ask the user to check their credentials. Do NOT retry automatically.

### Register a song copyright
1. Confirm you have an `author_id` (from register or login). If not, run the login flow first.
2. Call `create_song` with at least `title` and `author_id`. `lyrics` and `genre` are optional but recommended for a complete record.
3. Return the `id` and `registered_at` timestamp to the user as their copyright receipt.

### List songs
- To list all songs: call `list_songs` with no arguments.
- To list one user's songs: call `list_songs` with `author_id`.

### Update a song
1. Confirm you have the `id` of the song and the user's `author_id`.
2. Only send the fields the user wants to change (`title`, `lyrics`, `genre`).
3. If the tool returns "You do not own this song", inform the user and stop.

### Delete a song
1. Always confirm with the user before calling `delete_song` — this is irreversible.
2. Call `delete_song` with `id` and `author_id`.

## Rules

- Never pass a raw `password` into any tool other than `register_user` or `login_user`.
- Never display JWT tokens to the user — store them in conversation context only.
- If a tool returns `isError: true`, surface the error message to the user clearly.
- Do not retry a failed write operation automatically — ask the user what to do.
