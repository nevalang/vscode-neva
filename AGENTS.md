# AGENTS.md

Follow these instructions when working in this repository.

## 1) Operating Protocol

1. Use `gh` CLI for GitHub context (issues/PRs). Fall back to web browsing only when `gh` is insufficient.
2. Prefer small, incremental changes. After each feature implementation, report back with what changed and how to verify.
3. Do **not** push to `main` or release a new extension version without explicit approval.
4. The Neva compiler lives in `/Users/emil/projects/neva` (read-only). Neva tools live in `nevalang/neva-tools`; source the LSP from its remote `main` when updating binaries.
5. Assume the current Neva language is `main` (ahead of v0.34); deferred connections are **not** supported and should not be encoded in the extension (syntax highlighting, docs, etc.).
6. Keep the extension compatible with VS Code stable.

## 2) Repo Map

- `src/extension.ts`: Extension activation & wiring.
- `src/lsp.ts`: LSP client setup and binary selection.
- `syntaxes/neva.tmLanguage.yml`: TextMate grammar source.
- `syntaxes/neva.tmLanguage.json`: Generated grammar (via `npm run build:syntax`).
- `assets/`: Icons and images.

## 3) Build & Test

- Typecheck + bundle: `npm run build`
- Regenerate TextMate grammar: `npm run build:syntax`

## 4) LSP Binaries

- LSP server source is in `https://github.com/nevalang/neva-tools` (`main` branch), at `cmd/neva-lsp`.
- If updating LSP binaries, build for all supported OS/arch and place them under `bin/`.
- The extension selects a binary by platform/arch in `src/lsp.ts`.

## 5) Release/Publishing Notes

- No publishing or version bumps without explicit approval.
- Open VSX packaging (if needed) should be done explicitly and reviewed.

## 6) Reference Links

- Issues: https://github.com/nevalang/vscode-neva/issues
- Neva compiler repo (main): `/Users/emil/projects/neva`
- Neva Tools repo: https://github.com/nevalang/neva-tools
