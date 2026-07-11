# Beads Workflow

## Beads Issue Management

**Beads Issue Prefix:** `prj-better-finance-xxx`

**Key Commands:**
- `bd ready` - Find ready tasks (no blockers)
- `bd create --title="type: short desc" --type=feature|bug|task --priority=2`
- `bd update <id> --claim` - Claim/start working on issue
- `bd close <id>` - Close issue (never use `bd delete`)
- `bd list --status=open` - All open issues
- `bd list --status=in_progress` - Active work

**Priority Scale:** 0=critical, 1=high, 2=medium, 3=low, 4=backlog

**WARNING:** Do NOT use `bd edit` — it opens vim and blocks agents.

## Git Workflow

**CRITICAL**: Claude Code MUST NOT execute git operations that modify state.

**Allowed**: `git status`, `git diff`, `git log`, `git show`, `git branch`

**NEVER execute**: `git add`, `git commit`, `git push`, `git pull`, `git merge`, `git rebase`

**After code changes**: Show `git status`/`git diff`, provide commit message, inform user to commit manually.

**Exception — boleh dieksekusi langsung**: Semua `bd` commands dan `gh` commands.

## Commit Message Format (Conventional Commits)

```
feat: add wishlist page with priority and target date
feat(wishlist): add affordability calculator (bf-xxx)
fix: resolve date parsing in budget comparison
docs: update CLAUDE.md architecture section
refactor: extract currency formatting to helper
```

## SESSION CLOSE PROTOCOL

Before saying "done" or "complete":
1. `git status` — check what changed
2. Show suggested commit message
3. Inform user to run `git add <files>` + `git commit` + `git push`

Claude Code MUST NOT run git write operations.

## GitHub Issues

Create GH issues to complement Beads:

```bash
gh issue create \
  --title "feat: add wishlist page" \
  --body "## Summary\n...\n\n## Tasks\n- [ ] Step 1"
```

Update Beads with GH reference:
```bash
bd update <id> --notes "GitHub Issue: <url> (GH-#XX)"
```
