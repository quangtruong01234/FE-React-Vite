# Shared AI context

This directory is the canonical, tool-neutral source for repository guidance used by Codex and Claude Code.

- `project.md`: project overview and context routing
- `context/`: engineering rules loaded by task area
- `workflows/`: reusable workflow protocols
- `roles/`: shared specialist-agent instructions
- `agent-handoff/`: live readiness handoff — lean `snapshot.md` (current state, open/blocked work) + `CHANGELOG.md` (completed work, not auto-loaded)
- `api-reference.md`, `testing.md`, `tokens.md`: focused reference documents

Tool entry points and adapters remain separate:

- `AGENTS.md`, `.agents/`, `.codex/`: Codex
- `.claude/CLAUDE.md`, `.claude/settings*.json`: Claude Code
- `../.agent-local/`: machine-local AI data shared at the `MCR/` workspace root, outside this repo — test accounts, plus the cross-agent handoff inboxes: `frontend-handoff.md` (BE→FE) and `backend-handoff.md` (FE→BE, write here when you hit a backend gap)

Update a shared rule here only. Do not maintain a second copy in a tool adapter.
