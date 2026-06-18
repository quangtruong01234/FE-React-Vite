# Shared AI context

This directory is the canonical, tool-neutral source for repository guidance used by Codex and Claude Code.

- `project.md`: project overview and context routing
- `context/`: engineering rules loaded by task area
- `workflows/`: reusable workflow protocols
- `roles/`: shared specialist-agent instructions
- `api-reference.md`, `testing.md`, `tokens.md`: focused reference documents

Tool entry points and adapters remain separate:

- `AGENTS.md`, `.agents/`, `.codex/`: Codex
- `.claude/CLAUDE.md`, `.claude/settings*.json`: Claude Code
- `.ai-local/`: ignored machine-local AI data such as test accounts

Update a shared rule here only. Do not maintain a second copy in a tool adapter.
