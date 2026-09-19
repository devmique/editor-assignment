# Draftwork — Collaborative Document Editor

A lightweight collaborative document editor built for the Ajaia AI-Native Full Stack Developer Assignment. Google Docs-inspired, document-first design with real-time editing, file upload, and sharing.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + custom CSS |
| Editor | Tiptap 3 (StarterKit + Underline) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| UI Components | shadcn/ui (base-nova style) |
| Icons | Lucide React |
| Package Manager | npm |

## Local Setup

### Prerequisites
- Node.js 18+
- npm (comes with Node.js)
- A Supabase project ([supabase.com](https://supabase.com))

### 1. Clone and install

```bash
git clone <repo-url>
cd editor-assignment
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Settings → API** and copy your Project URL and anon key
4. Go to **Authentication → Providers** and ensure **Email** is enabled

### 3. Configure environment

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 5. Create test accounts

Two test accounts are pre-seeded for reviewing sharing flows:

| Account | Email | Password |
|---------|-------|----------|
| Account 1 | miquejt13@gmail.com | Admin123 |
| Account 2 | miquejt@gmail.com | Admin123 |

Or create your own at `/signup`.

## Features

### Core (Implemented)
- **Document Creation & Editing** — Create, rename, and edit documents with rich-text formatting (Bold, Italic, Underline, H1/H2, bulleted/numbered lists)
- **Auto-save** — Documents save automatically with visual status indicator
- **File Upload** — Import `.txt` and `.md` files as new documents (5 MB max)
- **Sharing** — Share documents with other users via email. Owners can manage access and remove shares
- **Authentication** — Email/password sign-up and sign-in via Supabase Auth
- **Persistence** — All documents and shares stored in PostgreSQL via Supabase
- **Owned vs Shared distinction** — Clear visual indicators for document ownership
- **Search & Filter** — Search documents by title, filter by All/Owned/Shared
- **Delete** — Owners can delete their own documents

### Intentionally Deprioritized
- Real-time collaboration (cursors, live updates)
- DOCX import (shows clear error message)
- Document version history
- Comments or suggestion mode
- Role-based permissions beyond basic edit/view
- Dark mode (kept light-only for scope)

## Architecture

See `ARCHITECTURE.md` for a detailed architecture note.

## Automated Tests

Run tests with:

```bash
npm test
```

Tests cover:
- Document creation API integration
- Auth flow validation
- Sharing permission checks

## Deployment

This project deploys automatically to Vercel on push to `main`. Set the following environment variables in your Vercel dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main editor page (client component)
│   ├── globals.css         # All styles including auth
│   ├── login/page.tsx      # Login page
│   ├── signup/page.tsx     # Signup page
│   └── auth/
│       ├── callback/route.ts   # OAuth callback handler
│       └── signout/route.ts    # Sign out handler
├── components/ui/
│   └── button.tsx          # shadcn Button component
├── lib/
│   ├── utils.ts            # cn() utility
│   └── supabase/
│       ├── client.ts       # Browser Supabase client
│       ├── server.ts       # Server Supabase client
│       └── middleware.ts   # Auth middleware helper
├── middleware.ts            # Next.js auth middleware
├── supabase/
│   └── schema.sql          # Database schema + RLS policies
└── package.json
```
