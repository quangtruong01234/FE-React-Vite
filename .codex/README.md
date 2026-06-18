# Codex setup

This directory contains Codex-specific project configuration and custom subagents.

- `../AGENTS.md`: durable project instructions loaded automatically by Codex.
- `config.toml`: trusted-project Codex settings.
- `agents/`: project-scoped custom subagents.
- `../.agents/skills/`: Codex adapters for shared workflows in `../.ai/workflows/`.

Shared rules are canonical in `../.ai/`. Codex and Claude Code adapters reference them instead of copying them, so the tools cannot silently drift apart.

The Claude `Stop` hooks are intentionally not mirrored. The TypeScript check is already required by `../.ai/context/core.md`, and the notification hook is Claude-specific and shell-dependent.
