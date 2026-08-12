# Codex Project Safety

These rules translate this repository's Claude Code permissions into durable Codex guidance. They supplement the OS-enforced project sandbox.

## Allowed work

- Read project files.
- Edit `src/**`, except `src/components/ui/**` requires explicit user approval.
- Edit Tailwind, Vite, and TypeScript config files when needed.
- Edit shared guidance in `.ai/**` and thin tool adapters when the user requests guidance maintenance.
- Edit `.env.example`; do not edit real environment or secret files.
- Run safe project checks such as `npm run *`, `npx tsc *`, `npx eslint *`, `npx prettier *`, `git status`, `git diff`, and `git log`.
- Run `git add` or `git commit` only when the user explicitly asks for a commit.

## Approval and deny rules

- Ask before any command that downloads, installs, accesses the network, changes package-manager state, or changes Git history.
- Do not edit `.env`, `.env.local`, `.env.production`, or any real secret file.
- Do not edit `src/components/ui/**` without explicit user approval.
- Do not run `npm install`, `npm uninstall`, `yarn`, `pnpm`, `bun`, or other package-manager changes without explicit user approval.
- Do not run `git push`, `git reset --hard`, `rm -rf`, or destructive delete commands. Before telling the user a change is ready to push, run the release gate — see `.ai/context/core.md` §Before pushing.
- Do not edit any file outside this repo (`api/`, `web-flow-GHN/`) — record the finding in the matching `../.agent-local/` inbox instead. See `.ai/context/core.md` §Cross-repo boundary.
- Do not modify `.claude/settings.json` or `.claude/settings.local.json`.
- Do not remove or overwrite Claude settings, local account data, or other tool-specific configuration.
- Never use `danger-full-access`, `--yolo`, or approval-bypass modes for this repository.

## Verification

After meaningful code changes, run `npx tsc --noEmit` or the project's existing typecheck command and report the last relevant errors.

Do not add or run desktop notification scripts unless the user explicitly asks.

## Chrome DevTools MCP usage

- Do not invoke Chrome DevTools MCP for API implementation, type changes, static code inspection, builds, linting, or unit tests.
- Use it only when the user explicitly requests runtime UI verification, or when browser reproduction is necessary to diagnose a UI or runtime issue.
- Prefer repository API documentation and local source files for API contract work.
- Before using Chrome DevTools MCP outside the `verify-ui` workflow, state why browser execution is necessary.
- Before navigating with Chrome, verify that the local dev server is reachable. If it is not running, start Vite yourself outside the filesystem sandbox with user approval; native `esbuild.exe` cannot resolve workspace entry files inside the managed sandbox on this Windows environment.
- Start Vite directly with `node .\node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173 --strictPort` using escalated sandbox permissions. Keep that command alive while Chrome verification runs, then terminate only the process started for the verification.
- Do not use PowerShell `Start-Process` for this server. The managed process environment contains both `PATH` and `Path`, which makes `Start-Process` fail with a duplicate-key error.
- Do not ask the user to run the dev server manually when Codex can start it with the approved command above. Do not kill or replace an existing process on port 5173; inspect and report the conflict instead.
