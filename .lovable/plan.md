
# Ludo Game — Build Plan

A classic 4-player Ludo game with offline play (pass-and-play + AI bots), online multiplayer via room codes, Google sign-in for online, and a player profile (name, country, avatar).

## Scope

### 1. Game core (shared engine)
- Standard Ludo rules: 4 tokens per player, 52-square main track + 5 home-column squares per color, safe star squares, must roll a 6 to leave base, capture opponent on landing (sent back to base), extra turn on rolling a 6 (3 sixes in a row = turn forfeited), exact roll to enter home, first to bring all 4 tokens home wins.
- Pure-function reducer (`applyMove`, `rollDice`, `legalMoves`) so the same engine drives offline, AI, and online — keeps online deterministic and bug-free.
- AI: prioritizes (1) capture, (2) leave base on 6, (3) enter home, (4) advance furthest token.

### 2. UI
- Main menu: Play Offline / Play Online / Settings.
- Offline setup: choose 2–4 players, mark each seat as Human or Computer, pick colors.
- Online setup (requires sign-in): Create Room (generates 6-char code) or Join Room (enter code). Lobby shows joined players with avatars/names/countries; host starts when 2–4 are in.
- Board: square board styled after the reference image — 4 colored bases (red/green/yellow/blue), cross-shaped track, star safe squares, colored home columns, center triangle. Tokens are rounded pin markers. Dice + current-turn indicator on the side.
- Settings: change display name, country (searchable list), pick from ~12 provided avatars (generated SVG/illustrated set).

### 3. Online multiplayer
- Lovable Cloud (Supabase) — Google OAuth via the Lovable broker.
- Tables: `profiles` (id, display_name, country, avatar_id), `rooms` (code, host_id, status, current_turn, dice, seats jsonb, board_state jsonb, updated_at), `room_players` (room_id, user_id, seat, color).
- Realtime via Supabase Postgres changes on `rooms` — each move is a server function that validates with the engine, writes new state. Smooth because state diff is small and authoritative on server.
- RLS: only seated players can read/write their room.

### 4. Settings & persistence
- `profiles` row auto-created on first sign-in (DB trigger). Offline players also get a local profile (localStorage) for name/avatar/country.

## Tech
- Lovable Cloud (Supabase) for auth + realtime DB.
- TanStack Start routes: `/`, `/play/offline`, `/play/online`, `/play/online/$code`, `/settings`, `/auth`.
- Engine in `src/game/engine.ts` (pure TS). Board rendered with SVG for crisp scaling.
- Avatars: 12 generated illustrated SVG/PNG avatars in `src/assets/avatars/`.

## Build order
1. Enable Lovable Cloud + Google auth.
2. DB migrations: profiles, rooms, room_players, RLS, triggers, grants.
3. Game engine + unit-style sanity (test in console).
4. Board SVG component + dice + token rendering.
5. Offline mode (humans + AI) end-to-end.
6. Settings page + avatar picker + country select.
7. Online mode: create/join room, lobby, realtime gameplay, server-fn move validation.
8. Polish: animations for token movement and dice roll, sounds optional, win screen.

## Notes / assumptions
- Visual style follows the reference: bold primary colors, white track, star safe squares, rounded "pin" tokens — but rebuilt cleanly (no copied assets).
- "Country" = flag + name from a bundled ISO list.
- Online room codes are 6 uppercase alphanumerics; rooms expire after 24h of inactivity.
- I will NOT add background music unless you ask.

## Quick questions before I start
1. Board orientation — square desktop board (like ref 1) is the default. OK to also work well on mobile portrait?
2. Should spectators be allowed to watch a room, or seated players only? (Default: seated only.)
3. Any preference on avatar style — illustrated characters, animals, or abstract geometric? (Default: illustrated characters, friendly cartoon style.)

If you're happy with the defaults, just reply "go" and I'll build it.
