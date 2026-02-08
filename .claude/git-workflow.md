# Git Workflow

## Repository
https://github.com/afajardodelgado/scotus-oyez-3x.git

## Workflow Policy

**No Pull Requests Required** - This is a solo developer project.

### Standard Flow

1. **Create a branch** for the feature/fix
   ```bash
   git checkout -b feature-name
   ```

2. **Work on the branch** - Make changes and commits as needed
   ```bash
   git add .
   git commit -m "Descriptive message"
   ```

3. **Merge back to main**
   ```bash
   git checkout main
   git merge feature-name
   ```

4. **Push to origin**
   ```bash
   git push origin main
   ```

5. **Clean up branch** (optional)
   ```bash
   git branch -d feature-name
   ```

## Key Points
- Solo developer workflow - no PR review process needed
- Branch for features, merge directly to main when ready
- Always push to origin main after merging
