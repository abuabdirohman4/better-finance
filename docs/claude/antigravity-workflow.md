# Antigravity Workflow

## Execution Mode Selection

Setelah plan selesai, output pilihan A atau B:

```
📋 Plan siap: docs/plans/YYYY-MM-DD-<feature>.md

━━━ PILIH MODE EKSEKUSI ━━━

✅ A) Google Antigravity — RECOMMENDED
   ([N] files, ~[X] lines)

   Prompt untuk Antigravity (copy-paste):
   ─────────────────────────────────────
   CONTEXT:
   Saya mengerjakan Better Finance - Next.js personal finance app
   dengan Google Sheets sebagai backend database.

   CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

   TASK:
   Eksekusi implementation plan di @docs/plans/YYYY-MM-DD-<feature>.md

   REQUIREMENTS:
   1. Ikuti plan task-by-task secara berurutan
   2. Jangan lanjut sebelum tiap task selesai
   3. Output per task: "✅ Task N complete: [ringkasan]"
   4. JANGAN deviate dari plan tanpa approval user

   REFERENCE FILES:
   - Plan: @docs/plans/YYYY-MM-DD-<feature>.md
   - Rules: @CLAUDE.md
   - Architecture: @docs/claude/architecture-patterns.md

   Mulai dari Task 1.
   ─────────────────────────────────────

⚡ B) Direct — Claude Code eksekusi sekarang
   Pilih ini jika ≤ 2 files DAN < 100 lines
```

**Auto-recommend threshold:**
- ≥ 3 files ATAU ≥ 100 lines → recommend **A**
- ≤ 2 files DAN < 100 lines → recommend **B**

## GitHub Issue Title Format

**WAJIB**: Semua GH Issue title harus diawali dengan Beads ID:

```bash
gh issue create \
  --title "[bf-xxx] feat: short description" \
  --body "..."
```

Format: `[bf-xxx] type: short description`

Tujuan: setiap GH Issue mudah ditelusuri ke issue lokal (Beads) dan konsisten dengan nama sesi chat.

## Plan File Format

Save ke `docs/plans/YYYY-MM-DD-<feature>.md`:

```markdown
# Plan: [Feature Name]

## Context
[Why this feature exists, what problem it solves]

## Tasks

### Task 1: [Description]
**File**: `path/to/file.js`
**Action**: Create/Edit
**Code**:
\`\`\`javascript
// exact code to write
\`\`\`

### Task 2: [Description]
...

## Commit Message
\`feat(scope): description (fixes #GH-XX)\`
```
