# AI Workflow Note — Draftwork

## AI Tools Used

1. **Claude (opencode/mimo-v2.5-free)** — Primary coding assistant for all implementation
2. **v0** — Initial project scaffolding (Next.js + Tailwind + shadcn setup)

## Where AI Sped Up Work

- **Boilerplate generation**: Auth pages, Supabase client utilities, middleware — all standard patterns that AI generates accurately
- **Database schema**: RLS policies, triggers, and indexes — complex SQL that AI handles well
- **Component structure**: Tiptap editor setup, toolbar configuration, state management patterns
- **CSS styling**: Auth page styles, dropdown menus, share dialog — consistent with the existing design system

## What AI Generated That I Changed

- **Initial page structure**: AI generated a single-page layout that was too complex. I simplified it to match the Google Docs-like sidebar + content + editor pattern
- **Sharing logic**: First version only toggled a boolean flag. Rewrote to use real database lookups and Supabase RLS
- **Underline extension**: AI missed that the Underline extension was imported but not added to the editor's extensions array. Fixed by adding `Underline` to the extensions list

## Verification Approach

- **TypeScript**: Build passes with no type errors
- **Manual testing**: Created two test accounts, verified document CRUD, sharing flow, and search/filter
- **RLS testing**: Verified that users can only see their own documents + documents shared with them
- **Edge cases**: File upload validation, empty state handling, self-sharing prevention

## AI Limitations Encountered

- AI tends to generate placeholder data without real persistence — had to rewrite the entire data layer
- AI sometimes generates complex abstractions when simpler solutions exist — kept everything flat and direct
- AI doesn't always check if imported extensions are actually used — the Underline bug was caught manually
