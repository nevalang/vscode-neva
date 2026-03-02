---
name: release-rollout
description: Use this skill when you need to roll out a new AgentOps version via GitHub Release and verify Fly deployment with minimal risk.
---

# Release Rollout Skill

Use this flow for `nevalang/agentops`.

## Goals

1. Create a release tag and publish release in GitHub.
2. Ensure `.github/workflows/fly-release.yml` completes successfully.
3. Verify Fly service health and logs.

## Steps

1. Verify repo state:
- `git status --short`
- ensure changes are committed and pushed

2. Create release:
- `gh release create <tag> --repo nevalang/agentops --target master --title "..." --notes "..."`

3. Watch release deploy workflow:
- `gh run list --repo nevalang/agentops --workflow fly-release.yml --limit 5`
- `gh run watch <run-id> --repo nevalang/agentops --exit-status`

4. Verify runtime:
- `flyctl status --app agentops`
- `curl -sS https://agentops.fly.dev/healthz`
- `flyctl logs --app agentops --no-tail`

## Safety checks

- Never deploy from dirty working tree unless explicitly requested.
- Never rotate secrets during rollout unless explicitly requested.
- If workflow fails, inspect logs before retrying deploy.
