# Architecture Note — Draftwork

## Overview

Draftwork is a document-first collaborative editor built with Next.js 16 (App Router), Supabase (PostgreSQL + Auth), and Tiptap for rich-text editing. The design follows Google Docs' calm, minimal aesthetic — neutral grays, one blue accent, Inter-like typography, small radius.

## Key Decisions

### 1. All-in-one page with Supabase backend
Rather than building separate pages for each feature, the main app lives on a single page with a sidebar, document list, and editor panel. This mirrors Google Docs' layout and keeps navigation simple. All data operations go through Supabase client libraries.

### 2. Supabase for persistence + auth
Supabase provides PostgreSQL, auth, and Row Level Security in one package. This means:
- No custom backend needed
- Auth middleware protects all routes
- RLS policies enforce access control at the database level
- Documents and shares are real database tables, not in-memory arrays

### 3. Tiptap for the editor
Tiptap is a headless rich-text editor built on ProseMirror. It's chosen because:
- Works well with React (hooks-based API)
- StarterKit provides all needed formatting out of the box
- Extension system allows adding Underline, Placeholder, etc.
- Content is stored as HTML strings — easy to persist

### 4. Client-side rendering for the editor page
The main page is a `'use client'` component because Tiptap requires browser APIs. Server components handle layout and metadata, while the editor page manages all interactive state.

### 5. Row Level Security for sharing
The sharing model uses Supabase RLS policies:
- Owners can CRUD their own documents
- Shared users can read (and optionally edit) documents they've been granted access to
- Share management is restricted to document owners
- This means the database enforces access control, not just the application layer

## Data Model

```
profiles (id, email, full_name)
    ↕ auth.users
documents (id, title, content, owner_id, created_at, updated_at)
    ↕ document_shares (id, document_id, user_id, permission)
```

## What I Would Build Next

With 2-4 more hours:
1. **Real-time collaboration** using Supabase Realtime — show cursors, live updates
2. **DOCX import** using mammoth.js or docx library
3. **Document version history** with snapshots
4. **Comments/suggestions** mode
5. **PDF export** via browser print
6. **Keyboard shortcuts** (Ctrl+B, Ctrl+I, etc.)
7. **Dark mode** support
