# AGENTS.md

Follow these instructions when working in this repository.

## 1) Operating Protocol

1. Use `gh` CLI for GitHub context (issues/PRs). Fall back to web browsing only when `gh` is insufficient.
2. Prefer small, incremental changes. After each feature implementation, report back with what changed and how to verify.
3. Do **not** push to `main` or release a new extension version without explicit approval. Open pull requests ready for review by default; use draft only when there is a stated blocker. CI runs for both states.
4. The Neva compiler lives in `/Users/emil/projects/neva` (read-only). Neva tools live in `nevalang/neva-tools`; `neva-lsp` is a separately installed system tool started through `neva tool lsp`, while `.github/neva-visual-editor.lock` pins the packaged WebView bundle. `neva-view` is not a VS Code dependency.
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
- Extension Host integration contract: `npm run test:extension-integration`. It covers
  diagnostics, language providers, semantic tokens, Run, Visual Mode opening
  and the packaged WebView boundary; use the manual smoke checklist for visual
  rendering and save-to-refresh on a real workspace.

## 4) LSP System Tool

- LSP release source is `https://github.com/nevalang/neva-tools`, tagged `lsp/vX.Y.Z`.
- Do not package `neva-lsp` binaries in the VSIX. The extension starts the selected system tool with `neva tool lsp`; `neva.lsp.path` is the manual/offline override.

## 5) Release/Publishing Notes

- No publishing or version bumps without explicit approval.
- Open VSX packaging (if needed) should be done explicitly and reviewed.

## 6) Reference Links

- Issues: https://github.com/nevalang/vscode-neva/issues
- Neva compiler repo (main): `/Users/emil/projects/neva`
- Neva Tools repo: https://github.com/nevalang/neva-tools
