# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🚨 CRITICAL: CLAUDE.md MAINTENANCE RULES (PREVENT BLOAT)

**NEVER append feature-specific documentation, long code snippets, or detailed business logic directly to this file.** This file is strictly a **Master Index** and must remain under 300 lines to optimize the AI context window. When instructed to document new knowledge, route it to the correct external file:

- ❌ **DON'T** add architecture details here. ✅ **DO** update `docs/claude/architecture-patterns.md`
- ❌ **DON'T** add beads/git workflow details here. ✅ **DO** update `docs/claude/beads-workflow.md`
- ❌ **DON'T** add Antigravity templates here. ✅ **DO** update `docs/claude/antigravity-workflow.md`

**How to update correctly:** If you must document a completely new domain, create a new file in `docs/claude/` and add exactly ONE pointer line here. **Do not dump the content here.**

---

## 🤖 Execution Mode Selection (MANDATORY)

**Setiap kali user meminta fitur baru atau bug fix, Claude Code WAJIB menjalankan urutan ini:**

> **`bd` dan `gh` commands BOLEH dan HARUS dieksekusi langsung** tanpa meminta izin user. Ini berbeda dengan git commands.

1. **Explore codebase** — baca file relevan untuk memahami konteks
2. **Buat plan file** di `docs/plans/YYYY-MM-DD-<feature>.md` (format ultra-detailed)
3. **Buat Beads Issue** — langsung jalankan `bd create --title="..." --type=... --priority=...`
4. **Buat GitHub Issue** — langsung jalankan `gh issue create --title "[bf-xxx] type: description"` dengan body dari plan
   > ⚠️ **Title WAJIB diawali dengan Beads ID** dalam format `[bf-xxx]` agar mudah ditelusuri ke issue lokal
5. **Update Beads** — langsung jalankan `bd update <id> --notes "GH-#XX: <url>"`
6. **Output pilihan A/B** (Antigravity vs Direct)

**Role separation:**
- Claude Code = planning + issue creation + review
- Antigravity / Direct = implementasi
- User = git operations (add, commit, push, PR)

**📖 For Antigravity prompt template and review checklist, READ [`docs/claude/antigravity-workflow.md`](docs/claude/antigravity-workflow.md)**

---

## 🔧 Git Workflow & Commit Protocol

**CRITICAL**: Claude Code MUST NOT execute git operations that modify repository state.

**Allowed (Read-Only)**: `git status`, `git diff`, `git log`, `git show`, `git branch`

**NEVER execute**: `git add`, `git commit`, `git push`, `git pull`, `git merge`, `git rebase`

**After code changes**: Show `git status`/`git diff`, provide suggested commit message (with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`), and inform user to run git commands manually.

**Exception — boleh dieksekusi langsung**: `bd sync`, semua `bd` commands, dan semua `gh` commands.

**Commit Message Format (Conventional Commits):**
```
feat: add wishlist page with priority tracking
feat(wishlist): add affordability calculator (bf-xxx)
fix: resolve budget week calculation
docs: update architecture patterns
```

**📖 For complete Beads & Git workflow, READ [`docs/claude/beads-workflow.md`](docs/claude/beads-workflow.md)**

---

## 📋 Beads Issue Management

**Issue Prefix:** `bf-xxx`

**Key Commands:**
- `bd ready` - Find ready tasks (no blockers)
- `bd close <id>` - Close issue (never use `bd delete`)
- `bd list --status=open` - All open issues

**Critical Rules:**
- Never manually edit `.beads/*.jsonl` files
- Do NOT use `bd edit` — it opens vim and blocks agents

**📖 For complete Beads workflow, READ [`docs/claude/beads-workflow.md`](docs/claude/beads-workflow.md)**

---

## 📚 Project Overview

**Better Finance** is a personal finance tracking Progressive Web App built with Next.js. The app uses **Google Sheets as the backend database** — all financial data is stored in Google Sheets and the app is **read-only** (no writes from the app).

**Tech Stack:**
- Next.js (App Router) + React
- Tailwind CSS for styling
- Google Sheets API (via service account)
- SWR for data fetching with cache busting
- PapaParse for CSV parsing
- Progressive Web App (PWA) with next-pwa

**Core Features:**
- Account balances (savings accounts, wallet fractions)
- Asset portfolio tracking
- Monthly & weekly budget management
- Financial goals tracking
- Transaction history with advanced filtering
- Wishlist with affordability analysis (planned)

**Google Sheets Structure** (sheet names used as API params):
- `Summary` — account balances (read by `/api/accounts`)
- `Jan`–`Dec` — monthly transaction sheets (read by `/api/transactions?sheet=<month>`)
- Budget, Goals, Assets sheets (read by their respective API routes)

**📖 For complete architecture details and component patterns, READ [`docs/claude/architecture-patterns.md`](docs/claude/architecture-patterns.md)**

---

## 🔧 Development Commands

```bash
npm run dev              # Dev server at localhost:3000
npm run build            # Production build (includes PWA optimization)
npm run build:pwa        # Explicit PWA build with optimization script
npm run start            # Start production server
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting without modifying
```

---

## 🏗️ Architecture Quick Reference

**Data Flow**: Google Sheets → API Routes (`app/api/*`) → SWR Hooks (`utils/hooks.js`) → Components

**Key Hooks** (all return `{ data, error, isLoading, mutate, isError }`):
- `useTransactions(sheetName)` - Monthly transaction data
- `useAccounts(delay)` - Account balances with staggered loading
- `useBudgets(month)` - Budget data for specific month
- `useGoals()` - Financial goals
- `useAssets(delay)` - Asset portfolio

**Critical**: API routes use `force-dynamic` + `revalidate = 0`. Financial data must always be fresh.

**Staggered Loading**: Use `delay` param to prevent simultaneous API calls on page load:
```javascript
useAccounts(0)    // load immediately
useAssets(500)    // load after 500ms
```

**`googleSheetsService`** (`utils/google.js`): Has both read methods (via public GViz CSV URL, usable anytime) and write methods (`update`, `append`, `clear`, etc. via googleapis SDK, server-side only). Write methods exist for future features — current app pages are read-only.

**📖 For detailed patterns, data fetching strategies, and component guidelines, READ [`docs/claude/architecture-patterns.md`](docs/claude/architecture-patterns.md)**

---

## 🌍 Environment & Configuration

**Required** `.env.local`:
```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API=https://docs.google.com/spreadsheets/d
NEXT_PUBLIC_GOOGLE_SHEET_ID=your-google-sheet-id

GOOGLE_SERVICE_ACCOUNT_EMAIL=better-finance-service@your-project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-google-sheet-id
```

**Notes:**
- `GOOGLE_SHEET_ID` is used server-side (API routes via `googleapis`); `NEXT_PUBLIC_GOOGLE_SHEET_ID` is used client-side (public GViz CSV URL)
- `GOOGLE_PRIVATE_KEY` must use literal `\n` in the env file — `utils/google.js` calls `.replace(/\\n/g, "\n")` at runtime
- Share the target Google Sheet with the service account email

---

## 🎨 Coding Standards

**Naming Conventions:**
- Components: PascalCase (`BudgetCard`, `TransactionList`)
- Files: kebab-case for pages, PascalCase for components
- Variables: camelCase (`totalBudget`, `isLoading`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)

**Import Pattern:**
- Use absolute imports with `@/` prefix
- Example: `import { useTransactions } from "@/utils/hooks"`

**Component Guidelines:**
- Functional components with React hooks only
- Arrow functions for components and handlers
- Error States: Show emoji icon (⚠️), message, and helpful text
- Loading States: Animated skeleton loaders (not spinners)
- Exports: Named exports from index.js files

**Mobile-First Design:**
- Max width: `max-w-md` (448px) centered on desktop
- Bottom navigation for primary nav
- Gradient header with wave design (common pattern)
- Touch-friendly card components

---

## ⚠️ Important Business Rules

1. **Real-time Data**: Financial data must always be fresh — no API caching, aggressive cache busting
2. **Google Sheets as Database**: All writes happen manually in Google Sheets; current app pages are read-only (write infrastructure exists in `utils/google.js` for future use)
3. **Privacy Controls**: Components support hide/show for sensitive data (balances, totals)
4. **Weekly Budget System**: Special budget allocation logic for week-by-week spending control
5. **Transaction Filtering**: Advanced multi-criteria filtering (type, account, category, date range)
6. **Currency**: Indonesian Rupiah (IDR). Use `formatCurrency(amount, format)` from `utils/helper.js`
7. **Dates**: DD/MM/YYYY format. Use `formatDate()` from `utils/helper.js`

---

## 🛠️ Utility Functions

**Currency Formatting** (`utils/helper.js`):
```javascript
formatCurrency(amount, format)
// formats: "rupiah" | "brackets" | "signs" | "short" | "superscript"
// "short": 1500000 → "Rp1.5jt", 2000000000 → "Rp2M"
```

**Date Formatting** (`utils/helper.js`):
```javascript
formatDate("15/02/2026")  // Returns: "Today", "Yesterday", or "15 Feb 2026"
```

**Financial Categories** (`utils/constants.js`):
- Eating: Food, Coffee, Fruits, Desserts
- Living: Housing, utilities, transportation
- Saving: Emergency funds, general savings
- Investing: Stocks, crypto, mutual funds
- Giving: Donations, gifts

---

## 📖 Additional Documentation

All detailed documentation is in `docs/claude/`:

- **Architecture Patterns**: [`docs/claude/architecture-patterns.md`](docs/claude/architecture-patterns.md)
- **Beads Workflow**: [`docs/claude/beads-workflow.md`](docs/claude/beads-workflow.md)
- **Antigravity Workflow**: [`docs/claude/antigravity-workflow.md`](docs/claude/antigravity-workflow.md)

---

## 🚨 SESSION CLOSE PROTOCOL 🚨

**CRITICAL**: Before saying "done" or "complete", show `git status` + `git diff`, provide commit message, inform user to commit manually. Claude Code MUST NOT run git write operations.

**📖 For complete session close checklist, READ [`docs/claude/beads-workflow.md`](docs/claude/beads-workflow.md)**
