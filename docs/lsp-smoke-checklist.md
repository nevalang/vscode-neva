# Neva LSP Smoke Checklist

Use this checklist before publishing a new extension version. The automated Extension Host integration contract is the release gate; this document covers the remaining visual/manual checks.

## 1. Tool resolution check

1. Install Neva and Neva LSP using their official installers.
2. Confirm `neva tool lsp` starts the installed system LSP.
3. Confirm a manual `neva.lsp.path` override starts the intended binary.
4. Run:

```bash
npm run test:extension-integration
```

## 2. Feature smoke test in VS Code

Open a Neva workspace and verify each feature works end-to-end:

- completion (entities/nodes/ports/import aliases)
- hover
- go to definition
- find references
- rename + prepare rename
- document symbols / outline
- code lens + resolve
- semantic tokens (declarations/references/ports)
- `Neva: Open Visual Mode` renders the saved workspace and refreshes after save

The automated harness already verifies command registration, diagnostics,
completion, hover, definition, references, rename, outline, semantic tokens,
Run CodeLens and opening the packaged Visual Mode. For a release candidate,
perform this manual pass on a real workspace to validate visual rendering and
the save-to-refresh experience.

## 3. Issue triage after verification

If smoke checks pass, close or update feature issues as shipped in that release:

- https://github.com/nevalang/vscode-neva/issues/8
- https://github.com/nevalang/vscode-neva/issues/9
- https://github.com/nevalang/vscode-neva/issues/10
- https://github.com/nevalang/vscode-neva/issues/11
- https://github.com/nevalang/vscode-neva/issues/12
- https://github.com/nevalang/vscode-neva/issues/13
- https://github.com/nevalang/vscode-neva/issues/14
- https://github.com/nevalang/vscode-neva/issues/15
- https://github.com/nevalang/vscode-neva/issues/16

## 4. Release note requirement

Document the required system-tool installation and any compatibility changes.
