# Paged — Notes, tagged and searchable

A full-stack notes app: email/password auth with JWT sessions, private notes owned
per-user, many-to-many tagging, filtering/sorting/search, and an AI-assisted layer
(tag suggestions + semantic "search by meaning") with a graceful offline fallback.

Built with Next.js (App Router) + TypeScript + PostgreSQL (Prisma) + Tailwind CSS.

## Live demo

- **Live URL:** _fill in after deploying — see [Deployment](#deployment)_
- **Test account:** _fill in after deploying (email / password)_
- **Repo:** this repository

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [Setting up Google sign-in](#setting-up-google-sign-in)
- [Database schema](#database-schema)
- [AI-assisted tagging & semantic search](#ai-assisted-tagging--semantic-search)
- [Testing approach](#testing-approach)
- [Code quality](#code-quality)
- [Deployment](#deployment)
- [Tradeoffs and shortcuts](#tradeoffs-and-shortcuts)
- [What I'd improve with more time](#what-id-improve-with-more-time)
- [How AI coding tools were used](#how-ai-coding-tools-were-used)

## Features

- **Auth** — sign up / sign in / sign out, bcrypt-hashed passwords, JWT session in
  an `httpOnly` cookie (not `localStorage`), protected routes via `proxy.ts`
  (Next's middleware equivalent). Optional "Continue with Google" — hidden
  automatically unless `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set.
- **Notes** — create, edit, delete; private to their owner, enforced server-side on
  every request, not just hidden in the UI. The body is a rich text editor
  (TipTap): headings, bold/italic/strikethrough, bullet/numbered lists,
  blockquotes, and links, with undo/redo. Pasting from another app or site
  goes through the editor's schema-constrained HTML parsing, which strips
  foreign styling (fonts, inline styles, tracking spans) down to the same
  formatting the toolbar supports; the server independently re-sanitizes
  the HTML before it's stored, so the allowed-tags list is enforced even
  for a request that bypasses the browser editor entirely.
- **Tags** — many-to-many via a join table; each tag has a name and a
  user-chosen color (from a fixed 7-color preset), created either inline
  while editing a note or from the sidebar's "+ New Tag" button; persists
  across refresh, filterable from the sidebar.
- **Filtering & sorting** — filter by one or more tags (OR semantics), search by
  title, sort by creation date (newest/oldest first).
- **AI tag suggestions** — suggests 2–3 tags per note that you accept or reject.
- **Semantic search** — a "Meaning" search mode that ranks notes by embedding
  similarity instead of literal substring match, with an automatic fallback to
  substring search when no AI provider is configured or the call fails.
- **AI chat** — a simple Notion-AI-style chat panel pinned near the bottom of
  the sidebar (Gemini-backed, key stays server-side). Not connected to your
  notes — it's a general-purpose scratch chat, not a notes assistant.
  In-memory only (no history persisted); hidden entirely when no AI
  provider is configured, same pattern as Google sign-in.
- **Accessible UI** — semantic landmarks, labelled form controls, `aria-pressed`/
  `aria-selected` on toggles, visible focus rings, keyboard-operable throughout.

## Tech stack

| Concern          | Choice                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router, TypeScript strict)                                              |
| Database         | PostgreSQL                                                                              |
| ORM / migrations | Prisma                                                                                  |
| Auth             | Hand-rolled: bcryptjs + `jose` (JWT) + `httpOnly` cookies                               |
| Validation       | Zod                                                                                     |
| Styling          | Tailwind CSS v4 (+ `@tailwindcss/typography` for the note editor)                       |
| Rich text        | TipTap (ProseMirror), sanitized server-side with `sanitize-html`                        |
| AI provider      | Google Gemini (free tier) via direct `fetch`, with a zero-dependency heuristic fallback |
| Tests            | Vitest (unit + real HTTP integration tests)                                             |
| Lint / format    | ESLint (flat config) + Prettier                                                         |

## Running locally

### Prerequisites

- Node.js 20+
- A PostgreSQL server (local install, Docker, or a free hosted instance like [Neon](https://neon.tech) or [Supabase](https://supabase.com))

### Setup

```bash
git clone <this-repo>
cd Paged
npm install
cp .env.example .env
```

Edit `.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/paged_dev?schema=public"
AUTH_SECRET="$(openssl rand -base64 32)"   # any long random string
GEMINI_API_KEY=""                          # optional — see AI section below
```

Create the database and apply migrations:

```bash
createdb paged_dev          # or create it in your hosted Postgres dashboard
npm run db:migrate          # applies prisma/migrations, generates the client
```

Run the app:

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/signup`. Create an
account and start taking notes.

### Running tests

Integration tests boot a second Next.js server against a **separate** test
database, so they never touch your dev data:

```bash
createdb paged_test
cp .env.example .env.test    # then point DATABASE_URL at paged_test
npm run test
```

## Environment variables

| Variable                 | Required | Purpose                                                                                                                             |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Yes      | PostgreSQL connection string                                                                                                        |
| `AUTH_SECRET`            | Yes      | HMAC secret Session JWTs are signed with. Rotating it logs everyone out.                                                            |
| `GEMINI_API_KEY`         | No       | Enables real AI tag suggestions + embeddings. Omit to use the built-in heuristic fallback — the app is fully functional either way. |
| `GEMINI_MODEL`           | No       | Overrides the default `gemini-2.5-flash` generation model.                                                                          |
| `GEMINI_EMBEDDING_MODEL` | No       | Overrides the default `text-embedding-004` embedding model.                                                                         |
| `GOOGLE_CLIENT_ID`       | No       | Enables the "Continue with Google" button. Omit (with `GOOGLE_CLIENT_SECRET`) to hide it — email/password still works.              |
| `GOOGLE_CLIENT_SECRET`   | No       | Paired with `GOOGLE_CLIENT_ID`, see [Setting up Google sign-in](#setting-up-google-sign-in).                                        |

No secret is ever hardcoded — everything above is read from `process.env`, and
`.env*` files are git-ignored (`.env.example` is the only one committed, with
placeholder values).

## Setting up Google sign-in

Fully optional — the app works with email/password alone, and the button
only appears once both variables below are set. To enable it:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** of type **Web application**.
3. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/google/callback` (local dev)
   - `https://<your-deployed-domain>/api/auth/google/callback` (production —
     add this once you know the deployed URL; you can always edit it later)
4. Copy the generated **Client ID** and **Client secret** into `.env` (or
   your hosting provider's environment variables) as `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`.
5. Restart `npm run dev` (env vars are only read at startup).

How it works: `GET /api/auth/google` redirects to Google's consent screen
with a random `state` value stashed in a short-lived cookie (CSRF
protection); `GET /api/auth/google/callback` verifies that `state`,
exchanges the authorization code for an access token, and fetches the
account's verified email from Google's userinfo endpoint — both are plain
server-to-server `fetch` calls (see
[`src/app/api/auth/google/callback/route.ts`](src/app/api/auth/google/callback/route.ts)),
no OAuth SDK involved. Signing in with an email that already has a
password account links `googleId` onto it rather than creating a
duplicate; a brand-new email creates one, with `passwordHash` left `null`
since that account never sets a password.

## Database schema

```
User ──1───* Note ──*───* Tag        (Note ↔ Tag via the NoteTag join table)
```

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String?  // null for a Google-only account
  googleId     String?  @unique
  notes        Note[]
  tags         Tag[]
}

model Note {
  id        String    @id @default(cuid())
  title     String
  body      String    @default("")
  favorite  Boolean   @default(false)
  embedding String?   // JSON-encoded float array, for semantic search
  ownerId   String
  owner     User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  tags      NoteTag[]
}

model Tag {
  id      String    @id @default(cuid())
  name    String
  color   String    @default("blue") // one of a fixed 7-key preset, user-chosen
  ownerId String
  owner   User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  notes   NoteTag[]

  @@unique([ownerId, name])
}

model NoteTag {
  noteId String
  tagId  String
  note   Note @relation(fields: [noteId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([noteId, tagId])
}
```

Design decisions, and why:

- **Explicit `NoteTag` join model** rather than an implicit Prisma
  many-to-many. It's one extra model, but it lets the schema carry a
  composite primary key, its own indexes, and (if a "tagged by AI" flag
  or a timestamp were ever needed) somewhere to put them — implicit join
  tables can't hold extra columns at all.
- **Tags are scoped per-user** (`@@unique([ownerId, name])`, not a global
  `name` unique constraint) so two users can each have their own "Work" tag
  without collision or cross-user coupling.
- **`onDelete: Cascade` everywhere** — deleting a user deletes their notes and
  tags; deleting a note or tag deletes the join rows. There's no orphaned-row
  cleanup job to remember to run.
- **`embedding` is a nullable `String`** (JSON-encoded `number[]`), not a
  native vector column. A real vector type (e.g. `pgvector`) would be faster
  at scale, but it's a Postgres extension that not every free hosting tier
  enables by default, and at "one person's notes" scale, computing cosine
  similarity in application code over a few hundred rows is instant. It also
  means the exact same schema works against a plain Postgres instance
  anywhere, with nothing extra to install.
- **`cuid()` ids**, not auto-increment integers — they're unguessable, so a
  user can't enumerate other users' note/tag ids by incrementing a number,
  which matters given note/tag ids appear directly in API URLs.
- **`passwordHash` is nullable, `googleId` links by verified email** — a
  Google-only account never sets a password, and a user who signs up with a
  password then later uses "Continue with Google" on the same address gets
  `googleId` attached to their existing account instead of a second one.
  Sign-in's dummy-hash comparison (see below) already treats a `null` hash
  as "no password set", so this needed no change to the sign-in code path.

## AI-assisted tagging & semantic search

Both features go through one small abstraction, [`AiProvider`](src/lib/ai/types.ts):

```ts
interface AiProvider {
  suggestTags(input: { title: string; body: string }): Promise<string[]>;
  embed(text: string): Promise<number[] | null>;
}
```

- [`GeminiProvider`](src/lib/ai/gemini-provider.ts) calls Google's Gemini API
  directly over `fetch` (no SDK — the request/response shape is fully visible
  in that one file) when `GEMINI_API_KEY` is set.
- [`HeuristicProvider`](src/lib/ai/heuristic-provider.ts) is a zero-network
  fallback: it ranks the most frequent non-stopword terms in the note as
  suggested tags, and can't produce embeddings.

[`src/lib/ai/index.ts`](src/lib/ai/index.ts) is the only place that decides
which one to use, and it's resilient by construction, not by accident:

- No `GEMINI_API_KEY` configured → heuristic provider, always.
- Key configured but the call **times out** (8s), **rate-limits**, or the API
  is **down** → the error is caught, logged server-side, and the heuristic
  result is returned instead. The user sees a plainer suggestion, not an error.
- Same logic for embeddings: a failed/missing embedding means that note's
  `embedding` column just stays `null`, and semantic search treats that as
  "fall back to substring match for this note" rather than throwing.

**How tag suggestion is wired up:** the note editor has a "Suggest tags"
button that calls `POST /api/ai/suggest-tags`; suggestions appear as chips
the user explicitly accepts (adds the tag) or dismisses — nothing is applied
automatically.

**How semantic search is wired up:** creating or editing a note's title/body
schedules embedding computation via Next's `after()` API
([`src/lib/notes/embed.ts`](src/lib/notes/embed.ts)), so it runs _after_ the
response is sent and never slows down saving a note. The "Meaning" tab in the
notes list calls `GET /api/notes/search?q=...`
([`src/app/api/notes/search/route.ts`](src/app/api/notes/search/route.ts)),
which embeds the query, ranks notes by cosine similarity, and unions in any
plain substring matches the ranking would otherwise miss (e.g. a note
created moments ago whose embedding hasn't finished computing yet) — so a
note never silently disappears from search just because the AI step hasn't
caught up. When no provider is configured at all, the endpoint returns
substring results directly and says so via a `mode: "substring"` field,
which the UI surfaces as a small inline notice instead of pretending
semantic search ran.

Swapping providers (OpenAI, Anthropic, a local embedding model, ...) means
writing one more class that implements `AiProvider` — nothing else changes.

## Testing approach

```bash
npm run test          # everything below, once
npm run test:watch    # watch mode
```

**Unit tests** (`src/**/*.test.ts`, colocated with the code they test) cover
pure logic with no I/O: Zod validation schemas, the notes filter/sort query
builder, the AI tag-suggestion heuristic, cosine similarity, relative-time
formatting, and the tag-color hash. These are fast, deterministic, and were
genuinely written test-first for anything with real edge cases — e.g.
`cosineSimilarity` was written to its test cases (identical vectors → 1,
orthogonal → 0, mismatched lengths → 0 instead of throwing) rather than the
other way around, and the notes query-builder tests pinned down "tag filters
use OR, not AND" as a deliberate, documented choice before the API route was
wired up to use it.

**Integration tests** (`tests/api/**/*.test.ts`) exercise the real HTTP API
against a real (test) Postgres database — not mocks. This was a deliberate
tradeoff: Next.js Route Handlers call `next/headers`, which only works
inside Next's own request-handling runtime, so importing a handler and
invoking it directly outside of a real request throws. Rather than
restructure the auth code around that limitation, `tests/global-setup.ts`
boots an actual `next dev` server once (against `paged_test`, never your dev
database) and tests hit it with `fetch`, the same way a browser would. Each
test creates its own randomly-emailed user, so tests don't need database
resets between them and are safe to read as independent scenarios. This is
where the ownership-enforcement and auth-flow requirements are actually
proven, not just asserted:

- `tests/api/auth.test.ts` — signup validation, duplicate email, sign-in
  success/failure (and that "wrong password" and "unknown email" return the
  identical message and status), protected-route 401/200, sign-out.
- `tests/api/notes-ownership.test.ts` — a second user gets `404` (not `403`)
  reading, editing, or deleting the first user's note, and a delete attempt
  that 404s is confirmed to be a true no-op; also that a note create is
  rejected if it references another user's tag id.
- `tests/api/notes-filtering.test.ts` — title search, multi-tag OR filtering,
  favorites-only, and both sort directions.
- `tests/api/tags.test.ts` — tag creation is idempotent, add/remove-tag
  endpoints don't disturb other tags on the same note, deleting a tag
  detaches it without deleting the note, and cross-user tag deletion 404s.

One real bug was caught this way during development: adding two AI-suggested
tags back-to-back raced under a naive "PATCH the whole tag list" design — the
second request's stale read of the note's tags overwrote the first tag before
its response came back. That's why tag attach/detach are their own endpoints
(`POST/DELETE /api/notes/:id/tags[/:tagId]`) built on an idempotent DB
`upsert`/`deleteMany`, instead of one PATCH that replaces the whole tag set.

## Code quality

```bash
npm run lint          # ESLint, flat config — zero warnings, zero errors
npm run format        # Prettier — write
npm run format:check  # Prettier — check only (used in CI)
npm run typecheck     # tsc --noEmit, strict mode, no `any` in application code
npm run build         # production build (also runs `prisma generate`)
```

## Deployment

This deploys for free on Vercel + Neon + Gemini's free tier.

1. **Database — [Neon](https://neon.tech)** (or Supabase): create a free
   Postgres project, copy its connection string.
2. **AI (optional) — [Google AI Studio](https://aistudio.google.com/apikey)**:
   create a free Gemini API key. Skip this to ship with the heuristic
   fallback — the app is fully functional without it.
3. **Vercel**: import this repo, set the environment variables below in the
   Vercel project settings, then deploy.

   | Variable         | Value                       |
   | ---------------- | --------------------------- |
   | `DATABASE_URL`   | your Neon connection string |
   | `AUTH_SECRET`    | `openssl rand -base64 32`   |
   | `GEMINI_API_KEY` | your key, or leave unset    |

4. **Run migrations against production** once, from your machine, pointed at
   the production `DATABASE_URL`:

   ```bash
   DATABASE_URL="<production-url>" npx prisma migrate deploy
   ```

5. Visit the deployed URL, sign up, and you're in.

## Tradeoffs and shortcuts

Called out here explicitly rather than left for someone to discover:

- **No password reset / email verification.** Out of scope for the
  assignment's auth requirements (hashing, sessions, protected routes); a
  real product needs both.
- **Tag filtering is OR, not AND**, and isn't configurable. Documented as a
  deliberate choice (`src/lib/notes/query-builder.ts`) matching how the tag
  chips read as a UI, but a real product might want both modes.
- **Semantic search re-embeds the query on every request** rather than
  caching recent query embeddings — fine at personal-notes scale, wasteful
  at higher volume.
- **The substring-search fallback matches against stored HTML**, not
  extracted plain text (unlike AI tag suggestion / embeddings, which do use
  `htmlToText` first). A search term that happens to span a tag boundary
  (rare in practice) could miss a match. Fixing it means running the same
  `htmlToText` pass at query time, deferred since it's a narrow edge case.
- **The rich text editor's link button uses `window.prompt()`** for the URL
  rather than an inline popover — accessible and functional, but not
  visually consistent with the rest of the UI.
- **AI chat has no persistence** — it's an in-memory scratch conversation
  per browser tab, intentionally (see Features); a real assistant feature
  would need a `ChatMessage` table and its own ownership checks.
- **`window.confirm()` for delete confirmation** instead of a custom modal —
  fully accessible (it's a native, keyboard-operable browser dialog) but not
  visually consistent with the rest of the UI. A custom dialog was cut for
  time.
- **Sidebar counts cost two extra list fetches** on every note
  create/delete/favorite-toggle (`refreshCounts()` in `notes-app.tsx`),
  rather than deriving them from a single unfiltered fetch kept in sync
  locally. Simpler and correct; not the most efficient possible approach at
  large note counts.
- **No pagination.** Notes/tags lists load in full. Reasonable for a personal
  notes app's scale; a real multi-thousand-note account would need it.
- **No optimistic-locking on concurrent edits** to the same note from two
  tabs — last write wins. Tag attach/detach were specifically fixed to avoid
  this class of bug (see Testing above); title/body editing wasn't, since
  two tabs editing the same note simultaneously is a much narrower scenario.

## What I'd improve with more time

- Real-time collaboration/sync (or at least a "this note changed elsewhere"
  conflict warning) instead of last-write-wins.
- Pagination/infinite scroll for large note collections, and a `pgvector`
  index for semantic search once it's no longer scanning every note in
  application code.
- Rich text (or at least Markdown) instead of a plain textarea.
- Rate limiting on the auth endpoints and the AI endpoints specifically —
  right now a malicious client could hammer `/api/ai/suggest-tags` and burn
  through a Gemini quota.
- Component-level tests (React Testing Library) for the client components,
  complementing the current unit/integration split rather than relying on
  manual + Playwright smoke testing for UI behavior.
- Password reset via email, and email verification on signup.

## How AI coding tools were used

This project was built with **Claude Code** end-to-end, in one guided
session — worth being specific about, since the assignment asks for it.

What that looked like in practice:

- I described the assignment requirements and shared the target UI
  screenshot as the design reference. Claude Code then scaffolded the
  Next.js project, designed the Prisma schema, and implemented auth, notes,
  tags, filtering, the AI features, and the frontend, largely autonomously,
  narrating each nontrivial decision as it went (e.g., why sign-in compares
  against a dummy bcrypt hash for unknown emails, why tag attach/detach are
  separate endpoints rather than a single PATCH).
- It made several judgment calls I'd have made differently in isolation and
  reviewed rather than blindly accepted — notably reverting an initial
  `prisma@7`/`prisma-client` generator choice back to the stable
  `prisma@6`/`prisma-client-js` combination after hitting a breaking,
  release-candidate-only config change, because a job-assignment reviewer
  shouldn't have to debug an unstable dependency choice.
- It found and fixed a real concurrency bug itself during testing: adding
  two AI-suggested tags in quick succession silently dropped the first one.
  It reproduced this with a Playwright smoke test against the running dev
  server, diagnosed the race (a stale-read-then-full-replace PATCH), and
  fixed it by making tag attach/detach their own idempotent endpoints — then
  re-ran the smoke test to confirm.
- It wrote the test suite (unit tests colocated with pure logic, HTTP
  integration tests against a real test database) and iterated until
  `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build`
  all passed clean, rather than stopping at "the happy path works."
- It wrote this README.

Where a human review matters most before treating this as "done": the
architecture decisions above (JWT-in-cookie auth, the ownership-check
pattern used on every note/tag route, the AI provider abstraction and its
fallback behavior, the schema's cascade rules) are the ones worth being able
to explain unprompted in a follow-up conversation — they're documented with
_why_, not just _what_, in code comments specifically so that's possible.
