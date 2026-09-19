# Submission — Draftwork

## Live Demo
> **Deployment link:** _[Paste your Vercel deployment URL here]_
> 
> **Google Drive folder:** _[Paste your Google Drive folder link here]_

## Test Accounts

Two seeded accounts for testing sharing and comments:

| Account | Email | Password |
|---------|-------|----------|
| Account 1 | miquejt13@gmail.com | Admin123 |
| Account 2 | miquejt@gmail.com | Admin123 |

### How to test sharing:
1. Sign in as **Account 1** → create a document → click **Share** → enter `miquejt@gmail.com` → set permission to **Can edit**
2. Sign in as **Account 2** → the shared document appears under **Shared with me**
3. Both users can edit, leave comments, and see changes

## How to Run Locally

```bash
# Clone the repo
git clone <repo-url>
cd editor-assignment

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run the Supabase schema
# Go to Supabase Dashboard → SQL Editor → paste supabase/schema.sql → Run

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Included Files

### Source Code
- `app/page.tsx` — Dashboard with document list, search, upload
- `app/editor/[id]/page.tsx` — Full editor with Tiptap, sharing, comments
- `app/layout.tsx` — Root layout with metadata
- `app/globals.css` — All styles
- `app/login/page.tsx` — Login page
- `app/signup/page.tsx` — Signup page
- `app/auth/callback/route.ts` — OAuth callback handler
- `app/auth/signout/route.ts` — Sign out handler
- `components/ui/button.tsx` — shadcn Button component
- `lib/utils.ts` — cn() utility
- `lib/supabase/client.ts` — Browser Supabase client
- `lib/supabase/server.ts` — Server Supabase client
- `lib/supabase/middleware.ts` — Auth middleware helper
- `middleware.ts` — Next.js auth middleware
- `supabase/schema.sql` — Database schema + RLS policies

### Documentation
- `README.md` — Setup and run instructions
- `ARCHITECTURE.md` — Architecture note
- `AI_WORKFLOW.md` — AI workflow note
- `SUBMISSION.md` — This file

### Configuration
- `package.json` — Dependencies and scripts
- `tsconfig.json` — TypeScript configuration
- `next.config.mjs` — Next.js configuration
- `components.json` — shadcn/ui configuration

## What Is Working
- Document creation, editing, renaming, and deletion
- Rich-text formatting: Bold, Italic, Underline, H1, H2, Bulleted list, Numbered list
- Auto-save with visual status indicator
- File upload (.txt and .md) with validation
- Email/password authentication (signup + login)
- Document sharing with real database persistence
- Comments with resolve/unresolve
- Owned vs shared document distinction
- Search and filter functionality
- Row Level Security enforcing access control
- Sticky toolbar

## What Is Incomplete
- DOCX import (shows clear error message explaining this)
- Real-time collaboration indicators
- Document version history
- Dark mode

## What I Would Build Next (2-4 hours)
1. Real-time collaboration using Supabase Realtime
2. DOCX import using mammoth.js
3. Document version history with snapshots
4. Keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
5. PDF export
