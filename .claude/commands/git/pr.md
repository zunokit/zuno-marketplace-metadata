---
description: Create a pull request with new branch, issue, and auto-merge
argument-hint: [base-branch]
---

## Variables

BASE_BRANCH: $1 (optional - defaults to current branch, or `main` if current branch is main)
NEW_BRANCH: Auto-generated based on changes (format: `type/slug-from-changes`)

## Workflow

### Step 1: Get current branch and validate

```bash
CURRENT_BRANCH=$(git branch --show-current)
BASE_BRANCH=${BASE_BRANCH:-$CURRENT_BRANCH}

# If current branch is main/master, use main as base
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
  BASE_BRANCH="main"
fi
```

### Step 2: Analyze changes to auto-generate branch name

**IMPORTANT:** Analyze current changes (staged and unstaged) to determine branch type and generate name.

```bash
# Check for changes
git status --short

# Get diff stats to understand change type
git diff --stat
git diff --cached --stat
```

**Branch name generation rules:**

1. **Analyze changes** to determine type:

   - `feature/` - New features, enhancements, additions
   - `fix/` or `bugfix/` - Bug fixes, error corrections
   - `refactor/` - Code refactoring without functionality change
   - `docs/` - Documentation changes
   - `chore/` - Config, dependencies, build changes
   - `test/` - Test additions/modifications
   - `perf/` - Performance improvements

2. **Generate slug** from changes:

   - Extract key words from changed files/paths
   - Use main feature/component name
   - Convert to kebab-case (lowercase, hyphens)
   - Limit to 3-4 words max
   - Remove common words (the, a, an, and, or, etc.)

3. **Format:** `{type}/{slug}`
   - Examples: `feature/user-authentication`, `fix/login-error`, `refactor/api-service`

**If unable to determine from changes:**

- Use pattern: `feature/auto-$(date +%y%m%d-%H%M%S)` as fallback

### Step 3: Create new branch with auto-generated name

```bash
# Ensure we're on base branch and up to date
git checkout $BASE_BRANCH
git fetch origin
git pull origin $BASE_BRANCH

# Create and checkout new branch with auto-generated name
git checkout -b $NEW_BRANCH
git push -u origin $NEW_BRANCH
```

**IMPORTANT:** Branch name will be auto-generated with slash separator (e.g., `feature/`, `fix/`, `refactor/`).

### Step 4: Stage, commit and push using git-manager

Use `git-manager` agent to:

- Stage all files
- Create a meaningful commit based on the changes
- Push to remote repository

This follows the workflow from `.claude/commands/git/cp.md`.

### Step 5: Analyze changes for issue and PR content

```bash
# Get commits and diff for PR content
git log origin/$BASE_BRANCH...origin/$NEW_BRANCH --oneline
git diff origin/$BASE_BRANCH...origin/$NEW_BRANCH --stat
git diff origin/$BASE_BRANCH...origin/$NEW_BRANCH
```

### Step 6: Create GitHub issue

Based on the changes analysis:

- **Title:** Conventional commit format from the primary change (max 50 chars, no version/release numbers)
- **Body:** Summary of changes, implementation details, and any considerations

```bash
ISSUE_NUMBER=$(gh issue create --title "..." --body "..." --output json | jq -r '.number')
```

Capture the issue number for PR reference.

### Step 7: Create PR linked to issue and merge

```bash
# Generate PR title and body from remote diff
PR_TITLE="..."  # Conventional commit format
PR_BODY="Summary of changes...

- Change 1
- Change 2
- Change 3

Closes #$ISSUE_NUMBER"

# Create PR and capture PR number
PR_NUMBER=$(gh pr create --base $BASE_BRANCH --head $NEW_BRANCH --title "$PR_TITLE" --body "$PR_BODY" --output json | jq -r '.number')

# Merge the PR (squash and merge by default)
gh pr merge $PR_NUMBER --squash --delete-branch
```

### Step 8: Switch back to base branch and update

```bash
git checkout $BASE_BRANCH
git pull origin $BASE_BRANCH
```

## Notes

- If `gh` command is not available, instruct the user to install and authorize GitHub CLI first.
- If `jq` is not available, parse issue/PR numbers manually from output.
- Branch name is **auto-generated** based on changes analysis (format: `type/slug`).
- Branch name will always include a slash separator (e.g., `feature/`, `fix/`, `refactor/`).
- PR content must reflect REMOTE state since PRs are based on remote branches.
- The workflow automatically merges the PR after creation.
- If no changes are detected, prompt user before proceeding.
