# PepTalk — Git Worktrees Guide

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## What are Git Worktrees?

Git worktrees allow you to have multiple working directories (checkouts) from the same repository simultaneously. This enables true parallel development without the overhead of cloning the repo multiple times or constantly switching branches.

**Benefits for PepTalk:**
- 4 agents work in parallel without conflicts
- No branch switching (each worktree is its own directory)
- Shared Git history (.git directory)
- Easy to merge between branches

---

## Setup

### Initial Repository Structure

```
peptalk/                 # Main working directory (main branch)
├── .git/                # Shared Git database
├── worktree/            # Worktree directory (gitignored)
│   ├── research-pipeline/   # Agent 1's workspace
│   ├── frontend/            # Agent 2's workspace
│   ├── api-workers/         # Agent 3's workspace
│   └── auth-payments/       # Agent 4's workspace
├── apps/
├── packages/
└── docs/
```

---

## Creating Worktrees

### Step 1: Create Branches and Worktrees

From the main repository directory:

```bash
# Agent 1: Research Pipeline
git worktree add worktree/research-pipeline -b research-pipeline

# Agent 2: Frontend
git worktree add worktree/frontend -b frontend

# Agent 3: API Workers
git worktree add worktree/api-workers -b api-workers

# Agent 4: Auth & Payments
git worktree add worktree/auth-payments -b auth-payments
```

**What this does:**
- Creates a new branch (e.g., `research-pipeline`)
- Creates a new directory (`worktree/research-pipeline/`)
- Checks out the branch in that directory

### Step 2: Verify Worktrees

```bash
git worktree list
```

**Output:**
```
/Users/admin/cursor/peptalk                      abc1234 [main]
/Users/admin/cursor/peptalk/worktree/research-pipeline  def5678 [research-pipeline]
/Users/admin/cursor/peptalk/worktree/frontend           ghi9012 [frontend]
/Users/admin/cursor/peptalk/worktree/api-workers        jkl3456 [api-workers]
/Users/admin/cursor/peptalk/worktree/auth-payments      mno7890 [auth-payments]
```

---

## Working in Worktrees

### Agent 1: Research Pipeline

```bash
cd worktree/research-pipeline

# Make changes
mkdir -p packages/research/ingest/pubmed
touch packages/research/ingest/pubmed/client.ts

# Commit
git add .
git commit -m "Add PubMed client stub"

# Push to remote
git push origin research-pipeline
```

### Agent 2: Frontend

```bash
cd worktree/frontend

# Make changes
mkdir -p apps/web/app/peptides
touch apps/web/app/peptides/page.tsx

# Commit
git add .
git commit -m "Add peptides list page"

# Push to remote
git push origin frontend
```

**All agents work simultaneously without conflicts.**

---

## Merging to Main

### Daily Merge Strategy

Each agent should merge to main at least once per day to avoid large conflicts.

#### Option 1: Merge from Main Directory

```bash
# In main repository
cd /Users/admin/cursor/peptalk

# Fetch latest from all branches
git fetch origin

# Merge research-pipeline into main
git checkout main
git pull origin main
git merge research-pipeline
git push origin main
```

#### Option 2: Merge from Worktree

```bash
# In Agent 1's worktree
cd worktree/research-pipeline

# Pull latest main
git fetch origin main
git merge origin/main

# Push merged branch
git push origin research-pipeline

# Switch to main and merge
git checkout main  # This will fail in worktree!
# Use main directory instead (see Option 1)
```

**Note:** You cannot checkout a branch that's already checked out in another worktree. Always merge from the main directory.

---

## Resolving Conflicts

### When Conflicts Occur

If two agents modify the same file:

```bash
# Agent 2 pulls latest main into frontend branch
cd worktree/frontend
git fetch origin main
git merge origin/main

# Conflict!
# Auto-merging apps/web/app/layout.tsx
# CONFLICT (content): Merge conflict in apps/web/app/layout.tsx
```

### Resolve Manually

```bash
# Open conflicted file
code apps/web/app/layout.tsx

# Look for conflict markers:
<<<<<<< HEAD
// Agent 2's changes
=======
// Agent 1's changes (from main)
>>>>>>> origin/main

# Resolve, then:
git add apps/web/app/layout.tsx
git commit -m "Merge main into frontend, resolve layout conflicts"
git push origin frontend
```

---

## Keeping Worktrees in Sync

### Pull Latest Main Regularly

Each agent should pull main into their branch frequently:

```bash
cd worktree/<your-branch>
git fetch origin main
git merge origin/main
```

**Recommended schedule:**
- Morning: Pull main before starting work
- Midday: Pull main again
- Evening: Merge your work to main

---

## Cleaning Up Worktrees

### Remove a Worktree

When a branch is complete and merged:

```bash
# Remove worktree
git worktree remove worktree/research-pipeline

# Delete branch (if no longer needed)
git branch -d research-pipeline
git push origin --delete research-pipeline
```

### Prune Stale Worktrees

If a worktree directory is deleted manually:

```bash
git worktree prune
```

---

## Best Practices

### 1. Commit Often, Merge Daily

**Do:**
- Commit every logical change (even WIP)
- Merge to main at least once per day
- Pull main before starting work

**Don't:**
- Work for days without merging
- Modify the same files as another agent (coordinate!)

### 2. Clear Communication

Before modifying shared files (e.g., `package.json`, `tsconfig.json`), coordinate with other agents:

```bash
# Agent 1 in Slack/Discord:
"I'm adding Zod to packages/schemas/package.json.
Will merge to main in 30 min."
```

### 3. File Ownership

Each agent "owns" specific directories (see [project-structure.md](./project-structure.md)):

- **Agent 1:** `packages/research/`
- **Agent 2:** `apps/web/`, `packages/ui/`
- **Agent 3:** `apps/workers/`
- **Agent 4:** `packages/payments/`

**Shared:** `packages/database/`, `packages/schemas/`, `docs/`

For shared directories, coordinate before editing.

### 4. Small, Focused PRs

When merging to main, keep changes focused:

**Good PR:**
- Title: "Add PubMed client and parser"
- Files: `packages/research/ingest/pubmed/*.ts`
- Lines: 250 changed

**Bad PR:**
- Title: "Implement research pipeline"
- Files: 30+ files across multiple packages
- Lines: 2000+ changed

### 5. Test Before Merging

Always run tests in your worktree before merging:

```bash
cd worktree/research-pipeline
pnpm test
pnpm typecheck
pnpm lint
```

---

## Troubleshooting

### Error: "Cannot checkout branch, already checked out in worktree"

**Problem:**
```bash
git checkout frontend
# fatal: 'frontend' is already checked out at '.../worktree/frontend'
```

**Solution:**
Use the main directory to switch branches, or use `git worktree list` to see where each branch is checked out.

### Error: "Worktree directory not empty"

**Problem:**
```bash
git worktree add worktree/frontend -b frontend
# fatal: '.../worktree/frontend' already exists
```

**Solution:**
Remove the directory first:
```bash
rm -rf worktree/frontend
git worktree add worktree/frontend -b frontend
```

### Worktree is Locked

**Problem:**
```bash
git worktree remove worktree/frontend
# fatal: 'remove' cannot be used with a locked working tree
```

**Solution:**
Unlock it:
```bash
git worktree unlock worktree/frontend
git worktree remove worktree/frontend
```

---

## Advanced: Sharing Work Between Agents

### Agent 2 needs Agent 1's code (before main merge)

If Agent 2 (frontend) needs types from Agent 1 (research pipeline) before they're merged to main:

```bash
# Agent 2's worktree
cd worktree/frontend

# Fetch Agent 1's branch
git fetch origin research-pipeline

# Cherry-pick specific commits (not entire branch)
git cherry-pick <commit-hash>

# Or merge Agent 1's branch temporarily
git merge origin/research-pipeline

# Coordinate with Agent 1 to merge to main ASAP
```

**Better approach:** Agent 1 merges to main first, then Agent 2 pulls.

---

## Workflow Diagram

```
┌─────────────┐
│    main     │  ← Production branch
└──────┬──────┘
       │
       ├──► research-pipeline  (Agent 1)
       │    └──► Merge daily
       │
       ├──► frontend            (Agent 2)
       │    └──► Merge daily
       │
       ├──► api-workers         (Agent 3)
       │    └──► Merge daily
       │
       └──► auth-payments       (Agent 4)
            └──► Merge daily
```

**Daily cycle:**
1. Morning: Pull main into your branch
2. Work: Commit changes to your branch
3. Evening: Merge your branch to main
4. Night: CI/CD runs tests, deploys to staging

---

## Summary Commands

```bash
# Create worktree
git worktree add worktree/<branch-name> -b <branch-name>

# List worktrees
git worktree list

# Work in worktree
cd worktree/<branch-name>
# ... make changes ...
git add .
git commit -m "message"
git push origin <branch-name>

# Merge to main (from main directory)
cd /path/to/main/repo
git checkout main
git merge <branch-name>
git push origin main

# Pull main into your branch
cd worktree/<branch-name>
git fetch origin main
git merge origin/main

# Remove worktree
git worktree remove worktree/<branch-name>

# Prune stale worktrees
git worktree prune
```

---

## References

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [claude.md](./claude.md) - Master build plan
- [project-structure.md](./project-structure.md) - Directory ownership
- [contributing.md](./contributing.md) - PR guidelines

---

**Document Owner:** Engineering Team
**Lines:** 369 (within 400-line limit ✓)
