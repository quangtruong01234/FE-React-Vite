# TryBuy Frontend — Codex Guidance

Shared agent guidance lives in `.ai/`, the canonical source for both Codex and Claude Code.

## Mandatory bootstrap

Before repository work, read these files completely:

1. `.ai/project.md`
2. `.ai/context/core.md`
3. `.ai/context/codex-safety.md`

Treat every rule in those files as active Codex project guidance.

## Context routing

Load the matching source before acting:

- Structure, naming, routes: `.ai/context/structure.md`
- Hooks, queries, mutations, query keys: `.ai/context/data-fetching.md`
- UI or Tailwind: `.ai/context/styling.md` and `.ai/tokens.md`
- Authentication: `.ai/context/auth.md`
- Forms, components, TypeScript conventions: `.ai/context/conventions.md`
- API client contract: `.ai/api-reference.md`
- Raw backend endpoints and fields: `.ai/context/backend-api.md`
- WebSocket, chat, notifications: `.ai/context/realtime.md`
- Tests: `.ai/testing.md`
- Rendering and performance: `.ai/context/performance.md`
- Runtime UI verification: `.ai-local/test-accounts.md`
- Codex filesystem, command, approval, and MCP safety: `.ai/context/codex-safety.md`

## Codex workflows

Shared workflow definitions live in `.ai/workflows/` and shared role definitions in `.ai/roles/`. Codex adapters remain under `.agents/skills/` and `.codex/agents/`.

Project-specific subagents are defined in `.codex/agents/`. Spawn them only when the user explicitly asks for subagents or parallel agent work.

## Maintenance

Update shared guidance only in `.ai/`; do not duplicate it into adapters, skills, or agent TOML files. Keep tool-specific configuration in `.codex/` or `.claude/`.
