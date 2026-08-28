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
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [How authentication works](#how-authentication-works)
- [Setting up Google sign-in](#setting-up-google-sign-in)
- [Setting up the Gemini API key](#setting-up-the-gemini-api-key)
- [Database schema](#database-schema)
- [API architecture & endpoints](#api-architecture--endpoints)
- [AI-assisted tagging, semantic search & AI chat](#ai-assisted-tagging-semantic-search--ai-chat)
- [Tags](#tags)
- [Rich text editing & copy/paste](#rich-text-editing--copypaste)
- [Testing with Postman](#testing-with-postman)
- [Testing approach](#testing-approach)
- [Code quality](#code-quality)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
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

## Project structure

```
prisma/
  schema.prisma              # Data model (User, Note, Tag, NoteTag)
  migrations/                # One folder per applied migration (hand-reviewed SQL)

src/
  app/
    login/, signup/          # Auth pages (Server Components)
    notes/page.tsx           # The main notes screen — fetches initial data server-side,
                              # decides whether Google sign-in / AI chat should render at all
    api/
      auth/                  # signup, signin, signout, me, google, google/callback
      notes/                 # CRUD, search, per-note tag attach/detach
      tags/                  # CRUD
      ai/                    # suggest-tags, chat
  components/
    auth/                    # Login/signup forms, Google button
    notes/                   # Sidebar, note list, note editor, rich text editor,
                              # AI chat panel, create-tag modal, tag pill
  lib/
    auth/                    # Session (JWT) issue/verify, password hashing, Google OAuth
    ai/                      # Provider abstraction (Gemini + heuristic fallback), chat
    notes/                   # Query builder, HTML sanitizer, HTML→text, tag colors, embeddings
    validation/               # Zod schemas (single source of truth for input rules)
    api/errors.ts            # Shared error → HTTP response mapping
    db.ts                    # Prisma client singleton
  proxy.ts                   # Next 16's middleware — redirects signed-out users to /login
  types/note.ts              # DTOs returned by the API (never the raw Prisma types)

tests/
  api/                       # Real-HTTP integration tests (auth, notes, tags, AI)
  global-setup.ts            # Boots a real `next dev` server against a test database
```

**The rule this follows everywhere:** a Server Component (`page.tsx`) does the
env-var/permission checks and data fetching, then passes plain booleans/data
down as props to Client Components — a Client Component itself never reads
`process.env` directly (it can't; those variables aren't sent to the
browser). This is exactly the mechanism behind both the Google button and
the AI chat button being hidden until configured (see
[Troubleshooting](#troubleshooting) if either isn't showing up for you).

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
| `GEMINI_MODEL`           | No       | Overrides the default `gemini-3.6-flash` generation model.                                                                          |
| `GEMINI_EMBEDDING_MODEL` | No       | Overrides the default `gemini-embedding-001` embedding model.                                                                       |
| `GOOGLE_CLIENT_ID`       | No       | Enables the "Continue with Google" button. Omit (with `GOOGLE_CLIENT_SECRET`) to hide it — email/password still works.              |
| `GOOGLE_CLIENT_SECRET`   | No       | Paired with `GOOGLE_CLIENT_ID`, see [Setting up Google sign-in](#setting-up-google-sign-in).                                        |

No secret is ever hardcoded — everything above is read from `process.env`, and
`.env*` files are git-ignored (`.env.example` is the only one committed, with
placeholder values).

## How authentication works

Two independent ways to sign in, landing on the exact same session mechanism:

1. **Email/password** — `POST /api/auth/signup` hashes the password with
   `bcryptjs` (`passwordHash` column) and creates the user. `POST
/api/auth/signin` re-hashes the supplied password and compares it. To
   avoid leaking _which_ part was wrong (and to avoid a timing difference
   between "unknown email" and "wrong password" that could be used to
   enumerate accounts), signing in with an unknown email still runs a bcrypt
   comparison against a dummy hash before returning the same generic "Invalid
   email or password" error either way.
2. **Google OAuth** — see [Setting up Google sign-in](#setting-up-google-sign-in)
   below for the full flow. It creates or links a `User` row exactly like
   email/password does, just via a different code path into the same
   session issuance.

Both paths end at the same place: [`src/lib/auth/session.ts`](src/lib/auth/session.ts)
signs a JWT (via `jose`) containing the user's id and email, using
`AUTH_SECRET`, and sets it as an **`httpOnly`, `Secure` (in production),
`SameSite=Lax`** cookie named `paged_session` — never `localStorage`, so
client-side JavaScript (and therefore an XSS payload) can't read the token
at all.

Every page under `/notes` is protected by [`src/proxy.ts`](src/proxy.ts) —
Next 16's renamed `middleware.ts`. It runs on the Edge runtime, so it can't
use `bcryptjs` or hit the database; it does a pure, dependency-free
signature-and-expiry check on the JWT and redirects to `/login?from=...` if
that check fails. The API routes re-verify the session server-side on every
request too (`requireUser()` in [`src/lib/auth/require-user.ts`](src/lib/auth/require-user.ts)) —
the proxy redirect is a UX nicety, not the actual security boundary.

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

## Setting up the Gemini API key

Also fully optional — the app works with the built-in heuristic fallback if
you skip this, and the AI tag-suggestion button, the "Meaning" search mode,
and the **"Ask AI" chat button in the sidebar all stay hidden** until a real
key is set (see [Troubleshooting](#troubleshooting) if you've set one and
still don't see them).

1. Go to **[Google AI Studio → API keys](https://aistudio.google.com/apikey)**
   and sign in with any Google account.
2. Click **"Create API key"**. Gemini's free tier is generous enough for a
   demo/interview project — no billing setup required.
3. Copy the key. A real Gemini key **always starts with `AIza`** — if what
   you have doesn't look like that, it isn't a Gemini API key (it's likely a
   different kind of Google token, e.g. an OAuth access/refresh token) and
   won't authenticate against `generativelanguage.googleapis.com`.
4. Paste it into `.env`:
   ```bash
   GEMINI_API_KEY="AIza...your-real-key..."
   ```
5. **Restart `npm run dev`.** This is the step people miss: Next.js reads
   `.env` once, when the server process starts — editing the file while
   `next dev` is already running does nothing until you stop and re-run it.

**The key never reaches the browser.** It's read from `process.env` only
inside server-only modules ([`src/lib/ai/index.ts`](src/lib/ai/index.ts),
[`src/lib/ai/gemini-provider.ts`](src/lib/ai/gemini-provider.ts),
[`src/lib/ai/chat.ts`](src/lib/ai/chat.ts) — each imports the `server-only`
package, which makes it a _build error_ to accidentally import one of them
from a Client Component). The browser only ever talks to our own routes
(`/api/ai/suggest-tags`, `/api/ai/chat`, `/api/notes/search`), which attach
the key server-side when calling Gemini. There is no `NEXT_PUBLIC_*`
variable for this key, deliberately — that prefix is what Next.js uses to
decide a variable is safe to ship to the browser, and an AI provider key
never is.

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

## API architecture & endpoints

Every route lives under `src/app/api/**/route.ts` (Next.js Route Handlers)
and follows the same shape:

```
requireUser()          → 401 if not signed in (re-checked here, not just in proxy.ts)
zodSchema.parse(body)  → 400 with a specific message if invalid
ownership check         → 404 (never 403 — see below) if the resource isn't yours
db call (Prisma)
return NextResponse.json(...)
```

wrapped in `try { ... } catch (error) { return handleApiError(error) }`
([`src/lib/api/errors.ts`](src/lib/api/errors.ts)), so every route returns
the same JSON error shape (`{ "error": "..." }`) and never leaks a stack
trace or a raw Prisma error to the client.

**A deliberate choice:** looking up someone else's note/tag returns `404`,
not `403`. A `403` confirms the resource exists but isn't yours; a `404`
reveals nothing about whether it exists at all — a slightly stronger
privacy default for a notes app.

A full request/response example for every route below is in
[`postman/Paged.postman_collection.json`](postman/Paged.postman_collection.json) —
see [Testing with Postman](#testing-with-postman).

| Method   | Endpoint                     | Auth | Purpose                                                                      |
| -------- | ---------------------------- | ---- | ---------------------------------------------------------------------------- |
| `POST`   | `/api/auth/signup`           | No   | Create an account (`email`, `password`), signs in immediately                |
| `POST`   | `/api/auth/signin`           | No   | Sign in with email/password                                                  |
| `POST`   | `/api/auth/signout`          | Yes  | Clear the session cookie                                                     |
| `GET`    | `/api/auth/me`               | No   | Current session's `{ user }`, or `{ user: null }`                            |
| `GET`    | `/api/auth/google`           | No   | Redirects to Google's OAuth consent screen                                   |
| `GET`    | `/api/auth/google/callback`  | No   | OAuth callback — exchanges the code, creates/links the user, signs in        |
| `GET`    | `/api/notes`                 | Yes  | List your notes — `?q=`, `?tagId=` (repeatable), `?sort=`, `?favoritesOnly=` |
| `POST`   | `/api/notes`                 | Yes  | Create a note (`title`, `body`, `tagIds?`)                                   |
| `GET`    | `/api/notes/:id`             | Yes  | Get one note (404 if not yours)                                              |
| `PATCH`  | `/api/notes/:id`             | Yes  | Update `title`/`body`/`favorite`/`tagIds` (partial)                          |
| `DELETE` | `/api/notes/:id`             | Yes  | Delete a note                                                                |
| `GET`    | `/api/notes/search?q=`       | Yes  | Semantic search (falls back to substring — see below)                        |
| `POST`   | `/api/notes/:id/tags`        | Yes  | Attach an existing tag (`tagId`) to a note                                   |
| `DELETE` | `/api/notes/:id/tags/:tagId` | Yes  | Detach a tag from a note                                                     |
| `GET`    | `/api/tags`                  | Yes  | List your tags                                                               |
| `POST`   | `/api/tags`                  | Yes  | Create a tag (`name`, `color?`) — idempotent by name (upsert)                |
| `DELETE` | `/api/tags/:id`              | Yes  | Delete a tag (detaches it from all notes first)                              |
| `POST`   | `/api/ai/suggest-tags`       | Yes  | Suggest 2–3 tags for `{ title, body }`                                       |
| `POST`   | `/api/ai/chat`               | Yes  | One turn of the Ask AI chat — `{ messages: [{ role, text }] }`               |

"Yes" auth routes require the `paged_session` cookie set by sign-in/sign-up
(sent automatically by the browser; in Postman, sign in once and the
collection's cookie jar carries it for the rest of the requests).

## AI-assisted tagging, semantic search & AI chat

Three features, sharing the same "hidden until configured, degrades
gracefully" philosophy — `GEMINI_API_KEY` unset never breaks the app, it
just turns off the AI-specific extras:

Both of the first two go through one small abstraction, [`AiProvider`](src/lib/ai/types.ts):

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

**Ask AI (chat).** A general-purpose chat panel pinned near the bottom of
the sidebar ([`src/components/notes/ai-chat-panel.tsx`](src/components/notes/ai-chat-panel.tsx)),
Notion-AI-style — it isn't wired to your notes, it's a scratch conversation.
It doesn't fit the `AiProvider` interface (`suggestTags`/`embed` don't cover
multi-turn chat, and there's no sensible offline fallback for open-ended
conversation), so it's a standalone function,
[`chatWithGemini()`](src/lib/ai/chat.ts), called from `POST /api/ai/chat`.
Same rules as everything else AI: server-only, key never sent to the
browser, and the button itself only renders when `isAiConfigured()` is
true — see [Setting up the Gemini API key](#setting-up-the-gemini-api-key).
Conversation history is kept in React state only (nothing persisted to the
database); "New chat" or a page refresh both just reset that state.

## Tags

Tags are many-to-many (`Note ↔ NoteTag ↔ Tag`, see [schema](#database-schema)),
scoped per-user, and each one carries a name plus a color chosen from a
fixed 7-color preset ([`src/lib/notes/tag-colors.ts`](src/lib/notes/tag-colors.ts)):
blue, orange, teal, green, pink, purple, brown.

- **Create a tag two ways**: inline while typing into a note's tag field
  (defaults to blue), or explicitly via the sidebar's **"+ New Tag"** button
  ([`CreateTagModal`](src/components/notes/create-tag-modal.tsx)), which
  lets you pick the color up front.
- **Creating a tag with a name that already exists for you** doesn't create
  a duplicate — `POST /api/tags` upserts by `(ownerId, name)` and keeps the
  tag's existing color rather than overwriting it, so re-typing an existing
  tag name is always safe.
- **Filter notes by tag** from the sidebar — clicking multiple tags filters
  by **OR** (a note matching any selected tag shows up), not AND; this was
  a deliberate call documented in [`query-builder.ts`](src/lib/notes/query-builder.ts)
  matching how the tag chips read visually.
- **Attach/detach on a note** are their own endpoints
  (`POST/DELETE /api/notes/:id/tags[/:tagId]`), not a single "replace the
  whole tag list" PATCH — this specifically avoids a race where accepting
  two AI tag suggestions back-to-back could silently drop one (see
  [Testing approach](#testing-approach) for how that bug was originally caught).
- **Deleting a tag** detaches it from every note it was on; it does not
  delete those notes.

## Rich text editing & copy/paste

The note body is a real rich-text editor
([`src/components/notes/rich-text-editor.tsx`](src/components/notes/rich-text-editor.tsx),
built on [TipTap](https://tiptap.dev)/ProseMirror), not a plain `<textarea>`:
headings, bold/italic/strikethrough, bullet/numbered lists, blockquotes,
links, and undo/redo, stored as HTML.

**Copy/paste, specifically:**

- **Copying** out of the editor (`Ctrl+C`/`Cmd+C`) is native browser
  behavior — nothing intercepts it.
- **Pasting** into the editor (from Word, Google Docs, a webpage, another
  note) goes through ProseMirror's own schema-constrained HTML parser. This
  is what actually does the cleanup: any tag or inline style outside the
  editor's schema (fonts, colors, tracked-changes markup, arbitrary `<div>`s)
  is discarded automatically, and only the formatting the toolbar itself
  supports survives — so a paste from Word doesn't inject stray inline
  styles into your notes.
- **The server independently re-sanitizes** every note body with
  [`sanitizeNoteHtml()`](src/lib/notes/sanitize-html.ts) (built on
  `sanitize-html`) before it's ever written to the database — using the
  same allowed-tags list as the editor's own schema. This matters because
  the client-side cleanup above only happens if someone goes through the
  browser editor; a request sent straight to `POST /api/notes` (Postman,
  curl, a malicious script) bypasses TipTap entirely, so the allowlist is
  enforced again, independently, on the server. Disallowed tags (`<script>`,
  `<style>`, event-handler attributes) and unsafe link schemes
  (`javascript:`) are stripped either way — this is defense-in-depth, not
  redundant code.
- Previews (the note list snippet) and anything sent to the AI (tag
  suggestion prompts, embeddings) run through
  [`htmlToText()`](src/lib/notes/html-to-text.ts) instead, so markup never
  leaks into a preview string or an AI prompt.

## Testing with Postman

A ready-to-import collection is at
[`postman/Paged.postman_collection.json`](postman/Paged.postman_collection.json),
covering every endpoint in [API architecture & endpoints](#api-architecture--endpoints)
with example request bodies and documented expected responses.

1. Open Postman → **Import** → select `postman/Paged.postman_collection.json`.
2. The collection uses a `{{baseUrl}}` variable (defaults to
   `http://localhost:3000`) — change it in the collection's **Variables**
   tab if you're testing a deployed URL instead.
3. Run **Auth → Sign up** (or **Sign in**) first. Postman's cookie jar
   automatically stores the `paged_session` cookie that response sets, and
   every subsequent request in the collection reuses it — no manual header
   copying needed.
4. From there, requests can be run individually or top-to-bottom via
   **Run collection**.

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

## Troubleshooting

**"I don't see the Google sign-in button" / "I don't see Ask AI":**

Both are rendered conditionally — this is by design (see
[Project structure](#project-structure)), not a bug, so the fix is almost
always a `.env` check rather than a code change:

1. Confirm the variable is actually in `.env`, at the project root (not
   `.env.example`, not `.env.local` unless that's the file you're editing),
   with **no surrounding quotes issue and no missing `=`**:
   ```bash
   # Google button needs BOTH of these set (not empty strings):
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   # Ask AI + AI tag suggestions + "Meaning" search need this one:
   GEMINI_API_KEY="AIza..."
   ```
2. **Restart `npm run dev`.** Next.js reads `.env` once at process start —
   saving the file while the dev server is already running has no effect
   until you stop (`Ctrl+C`) and run `npm run dev` again. This is the most
   common cause.
3. Check the terminal running `npm run dev` for a startup error — a
   malformed `.env` line (e.g. a value with no `=`, like
   `GOOGLE_CLIENT_SECRET` on its own line) can silently leave a variable
   unset rather than erroring loudly.
4. Verify what Node actually sees (run from the project root, same shell
   you run `npm run dev` from):
   ```bash
   node -e "require('dotenv').config(); console.log(!!process.env.GEMINI_API_KEY, !!process.env.GOOGLE_CLIENT_ID)"
   ```
   Both should print `true`. If either prints `false`, the `.env` file
   itself is the problem, not the app code.
5. A Gemini key that doesn't start with `AIza` isn't a Gemini API key and
   will fail Gemini's own auth check even though the button appears fine —
   see [Setting up the Gemini API key](#setting-up-the-gemini-api-key).

**"CSS/Tailwind styling looks broken (no list bullets, plain headings)":**
run `npm install` — `@tailwindcss/typography` is a devDependency the rich
text editor's `prose` classes depend on to generate any CSS at all; it
needs to be present after pulling a branch that added it.

**Prisma errors mentioning an unknown column/field** (e.g. `tags.color`):
run `npm run db:migrate` to apply any migrations you haven't run yet, then
restart `npm run dev` so the generated Prisma Client picks up the schema
change.

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
